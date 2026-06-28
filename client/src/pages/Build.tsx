import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { saveCircuit } from '../firebase/firestore';
import { saveCustomComponent, getUserCustomComponents } from '../firebase/customComponents';
import GatePalette from '../components/canvas/GatePalette';
import LogicCanvas from '../components/canvas/LogicCanvas';
import ElectricalPalette from '../components/canvas/ElectricalPalette';
import ElectricalCanvas from '../components/canvas/ElectricalCanvas';
import TruthTableView from '../components/canvas/TruthTable';
import SaveModal from '../components/SaveModal';
import CustomComponentModal from '../components/CustomComponentModal';
import type { GateNodeData, InputNodeData, SimulatePayloadEdge, SimulatePayloadNode } from '../types/circuit';

type BuildMode = 'logic' | 'electrical';

export default function Build() {
    const simulate = useAppStore((s) => s.simulate);
    const clear = useAppStore((s) => s.clear);
    const copySelection = useAppStore((s) => s.copySelection);
    const paste = useAppStore((s) => s.paste);
    const simulating = useAppStore((s) => s.simulating);
    const simulateError = useAppStore((s) => s.simulateError);
    const truthTable = useAppStore((s) => s.truthTable);
    const nodes = useAppStore((s) => s.nodes);
    const edges = useAppStore((s) => s.edges);
    const setCustomComponents = useAppStore((s) => s.setCustomComponents);

    const elecNodes = useAppStore((s) => s.elecNodes);
    const elecEdges = useAppStore((s) => s.elecEdges);
    const clearElec = useAppStore((s) => s.clearElec);
    const applyElecResults = useAppStore((s) => s.applyElecResults);

    const { user } = useAuth();

    const [buildMode, setBuildMode] = useState<BuildMode>('logic');
    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
    const [elecSimulating, setElecSimulating] = useState<boolean>(false);
    const [elecError, setElecError] = useState<string | null>(null);

    // Load custom components on mount (requires login)
    useEffect(() => {
        if (user === null) {
            return;
        }
        getUserCustomComponents(user.uid)
            .then((defs) => {
                const timer = setTimeout(() => setCustomComponents(defs), 0);
                return () => clearTimeout(timer);
            })
            .catch(() => {
                // Custom components are optional — silently ignore load errors
            });
    }, [user, setCustomComponents]);

    // Keyboard shortcuts for copy/paste (logic mode only)
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement;
            const isTextInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable === true;
            if (isTextInput === true) {
                return;
            }

            const isCtrlOrCmd = event.ctrlKey === true || event.metaKey === true;
            if (isCtrlOrCmd === false) {
                return;
            }

            if (buildMode !== 'logic') {
                return;
            }

            const key = event.key.toLowerCase();
            if (key === 'c') {
                event.preventDefault();
                copySelection();
            } else if (key === 'v') {
                event.preventDefault();
                paste();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [copySelection, paste, buildMode]);

    // Clears the save confirmation message after 3 seconds
    useEffect(() => {
        if (saveMessage === null) {
            return;
        }
        const timer = setTimeout(() => setSaveMessage(null), 3000);
        return () => clearTimeout(timer);
    }, [saveMessage]);

    function handleSaveClick() {
        if (user === null) {
            setSaveMessage('Log in to save circuits.');
            return;
        }
        const activeNodes = buildMode === 'logic' ? nodes : elecNodes;
        if (activeNodes.length === 0) {
            setSaveMessage('Canvas is empty — nothing to save.');
            return;
        }
        setShowSaveModal(true);
    }

    async function handleSave(name: string) {
        if (user === null) {
            return;
        }
        setSaving(true);
        try {
            if (buildMode === 'logic') {
                await saveCircuit(user.uid, name, nodes, edges);
            } else {
                await saveCircuit(user.uid, name, elecNodes, elecEdges);
            }
            setSaveMessage(`"${name}" saved.`);
            setShowSaveModal(false);
        } catch (err) {
            console.error('Save failed:', err);
            setSaveMessage('Save failed — check the console.');
        }
        setSaving(false);
    }

    async function handleElecSimulate() {
        if (elecNodes.length === 0) {
            setElecError('Canvas is empty — drop some components first.');
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
        const url = `${base}/api/simulate/electrical`;

        try {
            const response = await fetch(url, {
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
            setElecError(`Could not reach the backend (${message}). Is the server running on port 4000?`);
        }
    }

    async function handleCreateComponent(
        name: string,
        inputLabels: string[],
        outputLabels: string[]
    ) {
        if (user === null) {
            return;
        }

        const selectedNodes = nodes.filter((n) => n.selected === true);
        const selectedIds = new Set(selectedNodes.map((n) => n.id));

        const internalNodes: SimulatePayloadNode[] = [];
        const inputNodeIds: string[] = [];
        const outputNodeIds: string[] = [];

        for (const node of selectedNodes) {
            if (node.type === 'INPUT') {
                const data = node.data as InputNodeData;
                internalNodes.push({ id: node.id, type: 'INPUT', value: data.value });
                inputNodeIds.push(node.id);
            } else if (node.type === 'GATE') {
                const data = node.data as GateNodeData;
                internalNodes.push({ id: node.id, type: 'GATE', gateType: data.gateType });
            } else if (node.type === 'OUTPUT') {
                // OUTPUT nodes pin the component's outputs — find what feeds into them
                const inEdge = edges.find((e) => e.target === node.id);
                if (inEdge && selectedIds.has(inEdge.source)) {
                    outputNodeIds.push(inEdge.source);
                }
            }
        }

        // Fallback: if no OUTPUT nodes were selected, use gates that drive
        // edges going outside the selection boundary
        if (outputNodeIds.length === 0) {
            for (const edge of edges) {
                if (selectedIds.has(edge.source) && !selectedIds.has(edge.target)) {
                    if (!outputNodeIds.includes(edge.source)) {
                        outputNodeIds.push(edge.source);
                    }
                }
            }
        }

        const internalEdges: SimulatePayloadEdge[] = edges
            .filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))
            .map((e) => ({
                source: e.source,
                target: e.target,
                targetHandle: e.targetHandle ?? null,
            }));

        try {
            await saveCustomComponent(
                user.uid,
                name,
                inputLabels,
                outputLabels,
                internalNodes,
                internalEdges,
                inputNodeIds,
                outputNodeIds
            );
            const updated = await getUserCustomComponents(user.uid);
            setCustomComponents(updated);
            setShowCustomModal(false);
        } catch (err) {
            console.error('Failed to save custom component:', err);
        }
    }

    const hasSelection = nodes.some((n) => n.selected === true);

    let simulateLabel: string;
    if (buildMode === 'logic') {
        if (simulating === true) {
            simulateLabel = 'Simulating…';
        } else {
            simulateLabel = 'Simulate';
        }
    } else {
        if (elecSimulating === true) {
            simulateLabel = 'Simulating…';
        } else {
            simulateLabel = 'Simulate';
        }
    }

    const activeError = buildMode === 'logic' ? simulateError : elecError;
    const isSimulating = buildMode === 'logic' ? simulating : elecSimulating;

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
                <div className="mr-2 leading-tight">
                    <div className="gf-label">GF-02 // Build Console</div>
                    <div className="font-display text-sm font-bold tracking-tight">
                        {buildMode === 'logic' ? 'Logic Workbench' : 'Electrical Workbench'}
                    </div>
                </div>

                {/* Mode toggle */}
                <div className="flex overflow-hidden rounded-md border border-line">
                    <button
                        type="button"
                        onClick={() => setBuildMode('logic')}
                        className={`px-3 py-1 font-mono text-xs transition-colors ${
                            buildMode === 'logic'
                                ? 'bg-accent text-accent-ink'
                                : 'bg-surface text-muted hover:text-ink'
                        }`}
                    >
                        Logic
                    </button>
                    <button
                        type="button"
                        onClick={() => setBuildMode('electrical')}
                        className={`px-3 py-1 font-mono text-xs transition-colors ${
                            buildMode === 'electrical'
                                ? 'bg-accent text-accent-ink'
                                : 'bg-surface text-muted hover:text-ink'
                        }`}
                    >
                        Electrical
                    </button>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        if (buildMode === 'logic') {
                            simulate();
                        } else {
                            handleElecSimulate();
                        }
                    }}
                    disabled={isSimulating}
                    className="btn-solid"
                >
                    {simulateLabel}
                </button>

                <button type="button" onClick={handleSaveClick} className="btn-line">
                    Save
                </button>

                <button
                    type="button"
                    onClick={() => {
                        if (buildMode === 'logic') {
                            clear();
                        } else {
                            clearElec();
                        }
                    }}
                    className="btn-line"
                >
                    Clear
                </button>

                {buildMode === 'logic' && hasSelection && user !== null && (
                    <button
                        type="button"
                        onClick={() => setShowCustomModal(true)}
                        className="btn-line"
                    >
                        Create Component
                    </button>
                )}

                {saveMessage !== null && (
                    <span className="ml-2 font-mono text-xs text-scope">{saveMessage}</span>
                )}

                <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {buildMode === 'logic'
                        ? 'Drag · click IN to toggle · Ctrl+C/V · Backspace'
                        : 'Drag · click SW to toggle · Backspace'}
                </div>
            </div>

            {/* Error banner */}
            {activeError !== null && (
                <div className="border-b border-danger bg-sunken px-4 py-2 text-sm text-danger">
                    {activeError}
                </div>
            )}

            {/* Main row */}
            <div className="flex flex-1 overflow-hidden">
                {buildMode === 'logic' && (
                    <>
                        <GatePalette />
                        <div className="relative flex-1">
                            <LogicCanvas />
                        </div>
                        <div className="flex w-72 flex-col border-l border-line bg-paper">
                            <div className="flex-1 overflow-auto">
                                <TruthTableView table={truthTable} />
                            </div>
                            <div className="border-t border-line px-4 py-2 text-[10px] text-muted">
                                Canvas powered by React Flow
                            </div>
                        </div>
                    </>
                )}

                {buildMode === 'electrical' && (
                    <>
                        <ElectricalPalette />
                        <div className="relative flex-1">
                            <ElectricalCanvas />
                        </div>
                        <div className="flex w-72 flex-col border-l border-line bg-paper">
                            <div className="flex-1 overflow-auto p-4">
                                <div className="gf-label mb-2">Electrical Mode</div>
                                <div className="font-mono text-xs text-muted leading-relaxed">
                                    Drop a voltage source, resistors, LEDs and switches.
                                    Wire them terminal_b → terminal_a to form a loop.
                                    Click SW nodes to open/close the switch.
                                    Press Simulate to compute current and voltage.
                                </div>
                            </div>
                            <div className="border-t border-line px-4 py-2 text-[10px] text-muted">
                                Canvas powered by React Flow
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Save modal */}
            {showSaveModal === true && (
                <SaveModal
                    onSave={handleSave}
                    onClose={() => setShowSaveModal(false)}
                    saving={saving}
                />
            )}

            {/* Create custom component modal */}
            {showCustomModal === true && (
                <CustomComponentModal
                    selectedNodes={nodes.filter((n) => n.selected === true)}
                    allEdges={edges}
                    onSave={handleCreateComponent}
                    onClose={() => setShowCustomModal(false)}
                />
            )}
        </div>
    );
}