import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store';
import ElectricalPalette from '../components/canvas/ElectricalPalette';
import ElectricalCanvas from '../components/canvas/ElectricalCanvas';
import GatePalette from '../components/canvas/GatePalette';
import LogicCanvas from '../components/canvas/LogicCanvas';
import { SCENARIOS } from '../data/compareScenarios';
import { deriveLogicFromElectrical } from '../lib/deriveLogic';

export default function Compare() {
    const [activeScenario, setActiveScenario] = useState('free');

    const simulate = useAppStore((s) => s.simulate);
    const simulating = useAppStore((s) => s.simulating);
    const simulateError = useAppStore((s) => s.simulateError);
    const loadCircuit = useAppStore((s) => s.loadCircuit);
    const loadElecCircuit = useAppStore((s) => s.loadElecCircuit);

    const elecNodes = useAppStore((s) => s.elecNodes);
    const elecEdges = useAppStore((s) => s.elecEdges);
    const applyElecResults = useAppStore((s) => s.applyElecResults);

    const [elecSimulating, setElecSimulating] = useState(false);
    const [elecError, setElecError] = useState<string | null>(null);

    // Live electrical → logic derivation. Whenever the switch network on the
    // electrical canvas changes (topology or switch states), regenerate the
    // equivalent logic-gate circuit on the other canvas. A structure key avoids
    // re-deriving on pure position drags.
    const [expression, setExpression] = useState<string | null>(null);
    const [deriveReason, setDeriveReason] = useState<string | null>(null);

    const structureKey = useMemo(() => {
        const types = elecNodes.map((n) => `${n.id}:${n.type}`).join(',');
        const swstate = elecNodes
            .filter((n) => n.type === 'SWITCH')
            .map((n) => `${n.id}:${(n.data as { closed?: boolean }).closed === true}`)
            .join(',');
        const wires = elecEdges
            .map((e) => `${e.source}.${e.sourceHandle ?? ''}->${e.target}.${e.targetHandle ?? ''}`)
            .join(',');
        return `${types}|${swstate}|${wires}`;
    }, [elecNodes, elecEdges]);

    useEffect(() => {
        let result: ReturnType<typeof deriveLogicFromElectrical>;
        try {
            result = deriveLogicFromElectrical(elecNodes, elecEdges);
        } catch (err) {
            // Defensive: a derivation bug must never blank the whole page.
            console.error('Logic derivation failed:', err);
            result = { ok: false, reason: 'Could not derive a logic equivalent for this circuit.' };
        }
        if (result.ok === true) {
            loadCircuit(result.nodes, result.edges);
        } else {
            loadCircuit([], []);
        }
        // Defer the React state updates to avoid the "setState synchronously
        // within an effect" warning (the project's established pattern).
        const timer = setTimeout(() => {
            if (result.ok === true) {
                setExpression(result.expression);
                setDeriveReason(null);
            } else {
                setExpression(null);
                setDeriveReason(result.reason);
            }
        }, 0);
        return () => clearTimeout(timer);
        // Re-run only when the electrical structure changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [structureKey]);

    // Selecting a preset loads the matching electrical circuit. The logic-gate
    // equivalent on the other canvas is then derived automatically by the effect
    // above. 'free' leaves the electrical canvas as-is so the user can build.
    function handleScenarioChange(scenarioId: string) {
        setActiveScenario(scenarioId);
        setElecError(null);

        const scenario = SCENARIOS.find((s) => s.id === scenarioId);
        if (scenario === undefined) {
            return;
        }
        if (scenario.build === null) {
            return;
        }

        const built = scenario.build();
        loadElecCircuit(built.elecNodes, built.elecEdges);
    }

    async function handleSimulateBoth() {
        // Kick off the logic simulation (existing store action)
        simulate();

        // Run the electrical simulation if there is anything on that canvas
        if (elecNodes.length === 0) {
            return;
        }

        setElecSimulating(true);
        setElecError(null);

        const payload = {
            nodes: elecNodes.map((n) => {
                const result: Record<string, unknown> = { id: n.id, type: n.type };
                const d = n.data as Record<string, unknown>;
                if (d.voltage !== undefined) {
                    result.voltage = d.voltage;
                }
                if (d.resistance !== undefined) {
                    result.resistance = d.resistance;
                }
                if (d.threshold !== undefined) {
                    result.threshold = d.threshold;
                }
                if (d.closed !== undefined) {
                    result.closed = d.closed;
                }
                return result;
            }),
            edges: elecEdges.map((e) => ({
                source: e.source,
                sourceHandle: e.sourceHandle ?? null,
                target: e.target,
                targetHandle: e.targetHandle ?? null,
            })),
        };

        const base = import.meta.env.VITE_API_BASE_URL || '';

        try {
            const response = await fetch(`${base}/api/simulate/electrical`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (result.ok === false) {
                setElecSimulating(false);
                setElecError(result.error);
                return;
            }

            applyElecResults(result.values);
            setElecSimulating(false);
        } catch (err) {
            let message: string;
            if (err instanceof Error) {
                message = err.message;
            } else {
                message = 'Unknown error while contacting the simulator.';
            }
            setElecSimulating(false);
            setElecError(`Could not reach the backend (${message}).`);
        }
    }

    const isBusy = simulating || elecSimulating;
    const currentScenario = SCENARIOS.find((s) => s.id === activeScenario);

    return (
        <div className="flex h-full flex-col">
            {/* Scenario selector bar */}
            <div className="flex items-center gap-4 border-b border-line bg-surface px-4 py-2.5">
                <div className="mr-2 leading-tight">
                    <div className="gf-label">GF-04 // Compare</div>
                    <div className="font-display text-sm font-bold tracking-tight">
                        Circuit ↔ Logic
                    </div>
                </div>

                <select
                    value={activeScenario}
                    onChange={(e) => handleScenarioChange(e.target.value)}
                    className="rounded-md border border-line bg-paper px-2 py-1 font-mono text-xs text-ink outline-none focus:border-accent"
                >
                    {SCENARIOS.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>

                {currentScenario && (
                    <span className="font-mono text-xs text-muted">
                        {currentScenario.description}
                    </span>
                )}

                <button
                    type="button"
                    onClick={handleSimulateBoth}
                    disabled={isBusy}
                    className="btn-solid ml-auto"
                >
                    {isBusy ? 'Simulating…' : 'Simulate Both'}
                </button>
            </div>

            {/* Error banners */}
            {simulateError !== null && (
                <div className="border-b border-danger bg-sunken px-4 py-2 text-sm text-danger">
                    Logic: {simulateError}
                </div>
            )}
            {elecError !== null && (
                <div className="border-b border-danger bg-sunken px-4 py-2 text-sm text-danger">
                    Electrical: {elecError}
                </div>
            )}

            {/* Side-by-side canvases */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left: electrical circuit */}
                <div className="flex flex-1 border-r border-line">
                    <ElectricalPalette />
                    <div className="relative flex-1">
                        <div className="absolute left-2 top-2 z-10">
                            <span className="rounded bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted ring-1 ring-line">
                                Electrical Circuit
                            </span>
                        </div>
                        <ElectricalCanvas />
                    </div>
                </div>

                {/* Right: logic gate equivalent (auto-derived from the switches) */}
                <div className="flex flex-1">
                    <GatePalette />
                    <div className="relative flex-1">
                        <div className="absolute left-2 top-2 z-10 flex items-center gap-2">
                            <span className="rounded bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted ring-1 ring-line">
                                Logic Gate Equivalent · auto-derived
                            </span>
                            {expression !== null && (
                                <span className="rounded bg-paper px-2 py-1 font-mono text-[11px] text-accent ring-1 ring-line">
                                    Y = {expression}
                                </span>
                            )}
                        </div>
                        {deriveReason !== null && (
                            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6">
                                <div className="max-w-xs rounded-md bg-paper/95 p-4 text-center text-xs text-muted ring-1 ring-line">
                                    {deriveReason}
                                </div>
                            </div>
                        )}
                        <LogicCanvas />
                    </div>
                </div>
            </div>
        </div>
    );
}