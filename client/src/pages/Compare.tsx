import { useState } from 'react';
import { useAppStore } from '../store';
import ElectricalPalette from '../components/canvas/ElectricalPalette';
import ElectricalCanvas from '../components/canvas/ElectricalCanvas';
import GatePalette from '../components/canvas/GatePalette';
import LogicCanvas from '../components/canvas/LogicCanvas';
import { SCENARIOS } from '../data/compareScenarios';

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

    // Selecting a preset loads the matching electrical circuit on the left and
    // its logic-gate equivalent on the right. 'free' leaves both canvases as-is
    // so the user can build their own.
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
        loadCircuit(built.logicNodes, built.logicEdges);
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

                {/* Right: logic gate equivalent */}
                <div className="flex flex-1">
                    <GatePalette />
                    <div className="relative flex-1">
                        <div className="absolute left-2 top-2 z-10">
                            <span className="rounded bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted ring-1 ring-line">
                                Logic Gate Equivalent
                            </span>
                        </div>
                        <LogicCanvas />
                    </div>
                </div>
            </div>
        </div>
    );
}