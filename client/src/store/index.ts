// Zustand store for the logic-circuit canvas.
//
// Holds the React Flow nodes/edges array plus a couple of slices for the
// simulate flow:
//   - simulating: in-flight flag for the Simulate button
//   - simulateError: string|null, populated when the backend returns ok:false
//   - truthTable: TruthTable|null, populated on success
//   - clipboard: serialised selection from the last Ctrl+C
//
// Actions:
//   - onNodesChange / onEdgesChange / onConnect: standard React Flow plumbing
//   - addInput / addGate / addOutput: called by GatePalette drag-drop
//   - toggleInput: flips an INPUT node's value (HIGH/LOW)
//   - copySelection / paste: clipboard, called by the keyboard handler in Build.tsx
//   - clear: wipes the canvas
//   - simulate: POSTs to /api/simulate and merges the values back onto nodes,
//               then resolves OUTPUT node values and styles HIGH edges amber.

import { create } from 'zustand';
import {
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    type Connection,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
} from 'reactflow';
import type {
    AnyNodeData,
    CustomComponentDef,
    CustomNodeData,
    ElectricalComponentType,
    GateNodeData,
    GateType,
    InputNodeData,
    LEDNodeData,
    OutputNodeData,
    ResistorNodeData,
    SimulatePayloadEdge,
    SimulatePayloadNode,
    SimulateResponse,
    SwitchNodeData,
    TruthTable,
    VoltageSourceNodeData,
} from '../types/circuit';

type Clipboard = {
    nodes: Node<AnyNodeData>[];
    edges: Edge[];
};

type AppState = {
    // ----- Logic canvas (existing) -----
    nodes: Node<AnyNodeData>[];
    edges: Edge[];
    nextId: number;

    simulating: boolean;
    simulateError: string | null;
    truthTable: TruthTable | null;

    clipboard: Clipboard | null;

    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;

    addGate: (gateType: GateType, position: { x: number; y: number }) => void;
    addInput: (position: { x: number; y: number }) => void;
    addOutput: (position: { x: number; y: number }) => void;
    toggleInput: (id: string) => void;

    copySelection: () => void;
    paste: () => void;

    clear: () => void;
    simulate: () => Promise<void>;
    loadCircuit: (nodes: Node<AnyNodeData>[], edges: Edge[]) => void;
    loadElecCircuit: (nodes: Node<AnyNodeData>[], edges: Edge[]) => void;

    // When a saved circuit is loaded from another page (e.g. My Circuits),
    // this records which canvas it belongs to so the Build page can switch to
    // the matching mode on arrival. null means "no pending switch".
    pendingBuildMode: 'logic' | 'electrical' | null;
    setPendingBuildMode: (mode: 'logic' | 'electrical' | null) => void;

    // ----- Custom components (Phase 7) -----
    customComponents: CustomComponentDef[];
    setCustomComponents: (defs: CustomComponentDef[]) => void;
    addCustomToCanvas: (def: CustomComponentDef, position: { x: number; y: number }) => void;

    // ----- Electrical canvas (Phase 8) -----
    elecNodes: Node<AnyNodeData>[];
    elecEdges: Edge[];
    elecNextId: number;

    onElecNodesChange: (changes: NodeChange[]) => void;
    onElecEdgesChange: (changes: EdgeChange[]) => void;
    onElecConnect: (connection: Connection) => void;

    addElecComponent: (type: ElectricalComponentType, position: { x: number; y: number }) => void;
    toggleSwitch: (id: string) => void;
    updateElecNodeData: (id: string, patch: Record<string, unknown>) => void;
    clearElec: () => void;
    applyElecResults: (values: Record<string, { voltage: number; current: number; lit?: boolean }>) => void;
};

// Helper: serialises the canvas into the API payload. OUTPUT nodes are
// frontend-only so they're skipped here — the backend never sees them.
// CUSTOM nodes are expanded into their internal graphs inline.
function buildPayload(
    nodes: Node<AnyNodeData>[],
    edges: Edge[],
    customComponents: CustomComponentDef[]
): {
    nodes: SimulatePayloadNode[];
    edges: SimulatePayloadEdge[];
} {
    const payloadNodes: SimulatePayloadNode[] = [];
    const payloadEdges: SimulatePayloadEdge[] = [];

    const customNodeMap = new Map<string, CustomComponentDef>();

    for (const node of nodes) {
        if (node.type === 'INPUT') {
            const data = node.data as InputNodeData;
            payloadNodes.push({
                id: node.id,
                type: 'INPUT',
                value: data.value,
            });
        } else if (node.type === 'GATE') {
            const data = node.data as GateNodeData;
            payloadNodes.push({
                id: node.id,
                type: 'GATE',
                gateType: data.gateType,
            });
        } else if (node.type === 'CUSTOM') {
            const data = node.data as CustomNodeData;
            const def = customComponents.find((c) => c.id === data.componentId);
            if (def) {
                customNodeMap.set(node.id, def);
                const prefix = `${node.id}__`;
                for (const intNode of def.internalNodes) {
                    if (intNode.type === 'INPUT') {
                        payloadNodes.push({
                            id: `${prefix}${intNode.id}`,
                            type: 'INPUT',
                            value: intNode.value,
                        });
                    } else if (intNode.type === 'GATE') {
                        payloadNodes.push({
                            id: `${prefix}${intNode.id}`,
                            type: 'GATE',
                            gateType: intNode.gateType,
                        });
                    }
                }
                for (const intEdge of def.internalEdges) {
                    payloadEdges.push({
                        source: `${prefix}${intEdge.source}`,
                        target: `${prefix}${intEdge.target}`,
                        targetHandle: intEdge.targetHandle,
                    });
                }
            }
        }
        // OUTPUT nodes are intentionally skipped — see types/circuit.ts.
    }

    // Process canvas edges, remapping endpoints that touch CUSTOM nodes
    // to the corresponding internal input/output nodes.
    for (const edge of edges) {
        const targetCustomDef = customNodeMap.get(edge.target);
        const sourceCustomDef = customNodeMap.get(edge.source);

        let resolvedSource = edge.source;
        let resolvedTarget = edge.target;
        let resolvedTargetHandle = edge.targetHandle ?? null;

        if (sourceCustomDef) {
            const prefix = `${edge.source}__`;
            const outIndex = parseInt((edge.sourceHandle ?? 'out-0').replace('out-', ''), 10);
            const outNodeId = sourceCustomDef.outputNodeIds[outIndex];
            if (outNodeId) {
                resolvedSource = `${prefix}${outNodeId}`;
            }
        }

        if (targetCustomDef) {
            const prefix = `${edge.target}__`;
            const inIndex = parseInt((edge.targetHandle ?? 'in-0').replace('in-', ''), 10);
            const inNodeId = targetCustomDef.inputNodeIds[inIndex];
            if (inNodeId) {
                resolvedTarget = `${prefix}${inNodeId}`;
                resolvedTargetHandle = null;
            }
        }

        // Skip edges from OUTPUT nodes (they have no output handle)
        const sourceNode = nodes.find((n) => n.id === edge.source);
        if (sourceNode && sourceNode.type === 'OUTPUT') {
            continue;
        }

        payloadEdges.push({
            source: resolvedSource,
            target: resolvedTarget,
            targetHandle: resolvedTargetHandle,
        });
    }

    return { nodes: payloadNodes, edges: payloadEdges };
}

// Styling for edges that the simulator marks as carrying HIGH. We apply
// these inline on each edge so React Flow renders them with a thicker amber
// stroke without us needing a custom edge component.
const HIGH_EDGE_STYLE = { stroke: '#f09a3e', strokeWidth: 2.5 };

export const useAppStore = create<AppState>((set, get) => ({
    // ----- Logic canvas -----
    nodes: [],
    edges: [],
    nextId: 1,

    simulating: false,
    simulateError: null,
    truthTable: null,
    clipboard: null,
    pendingBuildMode: null,

    // ----- Custom components -----
    customComponents: [],

    // ----- Electrical canvas -----
    elecNodes: [],
    elecEdges: [],
    elecNextId: 1,

    // ----- Logic canvas actions (unchanged from Phase 6) -----

    onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) });
    },

    onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) });
    },

    onConnect: (connection) => {
        set({ edges: addEdge(connection, get().edges) });
    },

    addGate: (gateType, position) => {
        const id = `gate_${get().nextId}`;
        const newNode: Node<GateNodeData> = {
            id,
            type: 'GATE',
            position,
            data: {
                gateType,
                output: null,
            },
        };
        set({
            nodes: [...get().nodes, newNode],
            nextId: get().nextId + 1,
        });
    },

    addInput: (position) => {
        const id = `in_${get().nextId}`;
        // Auto-label inputs A, B, C... up to Z, then fall back to the id.
        let label: string;
        const inputCount = get().nodes.filter((n) => n.type === 'INPUT').length;
        if (inputCount < 26) {
            label = String.fromCharCode(65 + inputCount);
        } else {
            label = id;
        }
        const newNode: Node<InputNodeData> = {
            id,
            type: 'INPUT',
            position,
            data: {
                label,
                value: false,
                output: null,
            },
        };
        set({
            nodes: [...get().nodes, newNode],
            nextId: get().nextId + 1,
        });
    },

    addOutput: (position) => {
        const id = `out_${get().nextId}`;
        // Auto-label outputs Y1, Y2, ... — easy to read at a glance and
        // doesn't clash with the A/B/C input labels.
        const outputCount = get().nodes.filter((n) => n.type === 'OUTPUT').length;
        const label = `Y${outputCount + 1}`;
        const newNode: Node<OutputNodeData> = {
            id,
            type: 'OUTPUT',
            position,
            data: {
                label,
                output: null,
            },
        };
        set({
            nodes: [...get().nodes, newNode],
            nextId: get().nextId + 1,
        });
    },

    toggleInput: (id) => {
        const updated = get().nodes.map((node) => {
            if (node.id !== id) {
                return node;
            }
            if (node.type !== 'INPUT') {
                return node;
            }
            const data = node.data as InputNodeData;
            return {
                ...node,
                data: {
                    ...data,
                    value: !data.value,
                },
            };
        });
        set({ nodes: updated });
    },

    copySelection: () => {
        const selectedNodes = get().nodes.filter((n) => n.selected === true);
        if (selectedNodes.length === 0) {
            return;
        }
        const selectedIds = new Set(selectedNodes.map((n) => n.id));
        // Keep an edge in the clipboard only if BOTH endpoints are also
        // selected — pasting half a wire would leave dangling references.
        const selectedEdges = get().edges.filter((e) => {
            if (selectedIds.has(e.source) !== true) {
                return false;
            }
            if (selectedIds.has(e.target) !== true) {
                return false;
            }
            return true;
        });
        // Deep clone so subsequent edits to the canvas don't mutate the
        // clipboard contents.
        const cloned: Clipboard = {
            nodes: selectedNodes.map((n) => JSON.parse(JSON.stringify(n)) as Node<AnyNodeData>),
            edges: selectedEdges.map((e) => JSON.parse(JSON.stringify(e)) as Edge),
        };
        set({ clipboard: cloned });
    },

    paste: () => {
        const clip = get().clipboard;
        if (clip === null) {
            return;
        }
        if (clip.nodes.length === 0) {
            return;
        }

        // Assign each pasted node a fresh id and remember the mapping so
        // we can rewrite the edges to point at the new ids. Also offset
        // positions by 40px so the pasted copies don't sit exactly on top
        // of the originals.
        let counter = get().nextId;
        const idMap = new Map<string, string>();
        const newNodes: Node<AnyNodeData>[] = clip.nodes.map((node) => {
            let prefix: string;
            if (node.type === 'GATE') {
                prefix = 'gate';
            } else if (node.type === 'INPUT') {
                prefix = 'in';
            } else if (node.type === 'OUTPUT') {
                prefix = 'out';
            } else {
                prefix = 'node';
            }
            const newId = `${prefix}_${counter}`;
            counter = counter + 1;
            idMap.set(node.id, newId);
            return {
                ...node,
                id: newId,
                position: {
                    x: node.position.x + 40,
                    y: node.position.y + 40,
                },
                // Drop selection state on the originals; mark pastes as selected
                // so the user can immediately drag them as a group.
                selected: true,
            };
        });

        // Deselect existing nodes so only the pasted ones are highlighted.
        const deselectedExisting = get().nodes.map((n) => ({ ...n, selected: false }));

        const newEdges: Edge[] = clip.edges.map((edge) => {
            const newSource = idMap.get(edge.source);
            const newTarget = idMap.get(edge.target);
            // copySelection already filtered for both-endpoints-selected, so
            // these lookups should always succeed. The non-null assertion is
            // safe here.
            return {
                ...edge,
                id: `e_${counter++}`,
                source: newSource as string,
                target: newTarget as string,
                selected: false,
            };
        });

        set({
            nodes: [...deselectedExisting, ...newNodes],
            edges: [...get().edges, ...newEdges],
            nextId: counter,
        });
    },

    clear: () => {
        set({
            nodes: [],
            edges: [],
            nextId: 1,
            simulateError: null,
            truthTable: null,
        });
    },

    simulate: async () => {
        const { nodes, edges, customComponents } = get();
        if (nodes.length === 0) {
            set({
                simulateError: 'Canvas is empty — drop some gates and inputs first.',
                truthTable: null,
            });
            return;
        }

        set({ simulating: true, simulateError: null });

        const payload = buildPayload(nodes, edges, customComponents);
        const base = import.meta.env.VITE_API_BASE_URL || '';
        const url = `${base}/api/simulate`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = (await response.json()) as SimulateResponse;

            if (result.ok === false) {
                set({
                    simulating: false,
                    simulateError: result.error,
                    truthTable: null,
                });
                return;
            }

            // 1) Merge backend-computed values onto INPUT/GATE/CUSTOM nodes.
            // 2) Resolve OUTPUT nodes by tracing their incoming edge to its
            //    source node and looking up that node's value. OUTPUT lives
            //    on the frontend only, so we do this resolution here.
            const incomingByTarget = new Map<string, string>();
            for (const edge of get().edges) {
                // If a target has multiple incoming edges (the known bug),
                // last write wins. Acceptable for now since the OUTPUT use
                // case is a single fan-in.
                incomingByTarget.set(edge.target, edge.source);
            }

            const updatedNodes = get().nodes.map((node) => {
                if (node.type === 'OUTPUT') {
                    const sourceId = incomingByTarget.get(node.id);
                    let resolved: boolean | null;
                    if (sourceId === undefined) {
                        resolved = null;
                    } else {
                        // If the source is a CUSTOM node, resolve via its internal output node
                        const sourceNode = nodes.find((n) => n.id === sourceId);
                        if (sourceNode && sourceNode.type === 'CUSTOM') {
                            const customData = sourceNode.data as CustomNodeData;
                            const def = customComponents.find((c) => c.id === customData.componentId);
                            if (def) {
                                const incomingEdge = get().edges.find((e) => e.target === node.id);
                                const prefix = `${sourceId}__`;
                                const outIndex = parseInt(
                                    (incomingEdge?.sourceHandle ?? 'out-0').replace('out-', ''),
                                    10
                                );
                                const outNodeId = def.outputNodeIds[outIndex];
                                const internalId = outNodeId ? `${prefix}${outNodeId}` : undefined;
                                const sourceValue = internalId ? result.values[internalId] : undefined;
                                resolved = sourceValue !== undefined ? sourceValue : null;
                            } else {
                                resolved = null;
                            }
                        } else {
                            const sourceValue = result.values[sourceId];
                            if (sourceValue === undefined) {
                                resolved = null;
                            } else {
                                resolved = sourceValue;
                            }
                        }
                    }
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            output: resolved,
                        },
                    };
                }

                if (node.type === 'CUSTOM') {
                    const data = node.data as CustomNodeData;
                    const def = customComponents.find((c) => c.id === data.componentId);
                    if (def) {
                        const prefix = `${node.id}__`;
                        const outputs: Record<string, boolean | null> = {};
                        for (let i = 0; i < def.outputNodeIds.length; i++) {
                            const internalId = `${prefix}${def.outputNodeIds[i]}`;
                            const val = result.values[internalId];
                            outputs[`out-${i}`] = val !== undefined ? val : null;
                        }
                        return {
                            ...node,
                            data: { ...data, outputs },
                        };
                    }
                    return node;
                }

                const value = result.values[node.id];
                if (value === undefined) {
                    return node;
                }
                return {
                    ...node,
                    data: {
                        ...node.data,
                        output: value,
                    },
                };
            });

            // 3) Re-style edges. An edge carries HIGH if its source node's
            //    value is true. Apply amber + thicker stroke; otherwise clear
            //    any previous style so LOW edges revert to default.
            const updatedEdges = get().edges.map((edge) => {
                let sourceId = edge.source;
                // If source is CUSTOM, resolve to the actual internal output node
                const sourceNode = nodes.find((n) => n.id === edge.source);
                if (sourceNode && sourceNode.type === 'CUSTOM') {
                    const customData = sourceNode.data as CustomNodeData;
                    const def = customComponents.find((c) => c.id === customData.componentId);
                    if (def) {
                        const prefix = `${edge.source}__`;
                        const outIndex = parseInt(
                            (edge.sourceHandle ?? 'out-0').replace('out-', ''),
                            10
                        );
                        const outNodeId = def.outputNodeIds[outIndex];
                        if (outNodeId) {
                            sourceId = `${prefix}${outNodeId}`;
                        }
                    }
                }

                const sourceValue = result.values[sourceId];
                let isHigh: boolean;
                if (sourceValue === true) {
                    isHigh = true;
                } else {
                    isHigh = false;
                }

                if (isHigh === true) {
                    return {
                        ...edge,
                        style: HIGH_EDGE_STYLE,
                    };
                }
                return {
                    ...edge,
                    style: undefined,
                };
            });

            set({
                nodes: updatedNodes,
                edges: updatedEdges,
                simulating: false,
                simulateError: null,
                truthTable: result.truthTable,
            });
        } catch (err) {
            let message: string;
            if (err instanceof Error) {
                message = err.message;
            } else {
                message = 'Unknown error while contacting the simulator.';
            }
            set({
                simulating: false,
                simulateError: `Could not reach the backend (${message}). Is the server running on port 4000?`,
                truthTable: null,
            });
        }
    },

    // Replaces the canvas with a previously saved circuit
    loadCircuit: (savedNodes, savedEdges) => {
        let maxId = 0;
        for (const node of savedNodes) {
            const match = node.id.match(/_(\d+)$/);
            if (match !== null) {
                const num = parseInt(match[1], 10);
                if (num > maxId) {
                    maxId = num;
                }
            }
        }
        set({
            nodes: savedNodes,
            edges: savedEdges,
            nextId: maxId + 1,
            simulateError: null,
            truthTable: null,
        });
    },

    // Replaces the electrical canvas with a previously saved / preset circuit
    loadElecCircuit: (savedNodes, savedEdges) => {
        let maxId = 0;
        for (const node of savedNodes) {
            const match = node.id.match(/_(\d+)$/);
            if (match !== null) {
                const num = parseInt(match[1], 10);
                if (num > maxId) {
                    maxId = num;
                }
            }
        }
        set({
            elecNodes: savedNodes,
            elecEdges: savedEdges,
            elecNextId: maxId + 1,
        });
    },

    setPendingBuildMode: (mode) => {
        set({ pendingBuildMode: mode });
    },

    // ----- Custom component actions (Phase 7) -----

    setCustomComponents: (defs) => {
        set({ customComponents: defs });
    },

    addCustomToCanvas: (def, position) => {
        const id = `custom_${get().nextId}`;
        const newNode: Node<CustomNodeData> = {
            id,
            type: 'CUSTOM',
            position,
            data: {
                componentId: def.id,
                name: def.name,
                inputLabels: def.inputLabels,
                outputLabels: def.outputLabels,
                outputs: {},
            },
        };
        set({
            nodes: [...get().nodes, newNode],
            nextId: get().nextId + 1,
        });
    },

    // ----- Electrical canvas actions (Phase 8) -----

    onElecNodesChange: (changes) => {
        set({ elecNodes: applyNodeChanges(changes, get().elecNodes) });
    },

    onElecEdgesChange: (changes) => {
        set({ elecEdges: applyEdgeChanges(changes, get().elecEdges) });
    },

    onElecConnect: (connection) => {
        set({ elecEdges: addEdge(connection, get().elecEdges) });
    },

    addElecComponent: (compType, position) => {
        const id = `elec_${get().elecNextId}`;
        let nodeData: AnyNodeData;

        if (compType === 'VOLTAGE_SOURCE') {
            const count = get().elecNodes.filter((n) => n.type === 'VOLTAGE_SOURCE').length;
            nodeData = {
                label: `V${count + 1}`,
                voltage: 5,
                computedCurrent: null,
            } as VoltageSourceNodeData;
        } else if (compType === 'RESISTOR') {
            const count = get().elecNodes.filter((n) => n.type === 'RESISTOR').length;
            nodeData = {
                label: `R${count + 1}`,
                resistance: 100,
                computedVoltage: null,
                computedCurrent: null,
            } as ResistorNodeData;
        } else if (compType === 'LED') {
            const count = get().elecNodes.filter((n) => n.type === 'LED').length;
            nodeData = {
                label: `LED${count + 1}`,
                threshold: 0.01,
                lit: null,
                computedVoltage: null,
                computedCurrent: null,
            } as LEDNodeData;
        } else {
            // SWITCH
            const count = get().elecNodes.filter((n) => n.type === 'SWITCH').length;
            nodeData = {
                label: `SW${count + 1}`,
                closed: false,
            } as SwitchNodeData;
        }

        const newNode: Node<AnyNodeData> = {
            id,
            type: compType,
            position,
            data: nodeData,
        };

        set({
            elecNodes: [...get().elecNodes, newNode],
            elecNextId: get().elecNextId + 1,
        });
    },

    toggleSwitch: (id) => {
        const updated = get().elecNodes.map((node) => {
            if (node.id !== id) {
                return node;
            }
            const data = node.data as SwitchNodeData;
            return {
                ...node,
                data: { ...data, closed: !data.closed },
            };
        });
        set({ elecNodes: updated });
    },

    // Merges a partial patch into an electrical node's data. Used by the
    // properties panel to edit voltage / resistance / threshold so component
    // values are no longer fixed at their defaults.
    updateElecNodeData: (id, patch) => {
        const updated = get().elecNodes.map((node) => {
            if (node.id !== id) {
                return node;
            }
            return {
                ...node,
                data: { ...node.data, ...patch },
            };
        });
        set({ elecNodes: updated });
    },

    clearElec: () => {
        set({
            elecNodes: [],
            elecEdges: [],
            elecNextId: 1,
        });
    },

    applyElecResults: (values) => {
        const updatedNodes = get().elecNodes.map((node) => {
            const result = values[node.id];
            if (!result) {
                return node;
            }
            if (node.type === 'VOLTAGE_SOURCE') {
                const data = node.data as VoltageSourceNodeData;
                return {
                    ...node,
                    data: { ...data, computedCurrent: result.current },
                };
            }
            if (node.type === 'RESISTOR') {
                const data = node.data as ResistorNodeData;
                return {
                    ...node,
                    data: {
                        ...data,
                        computedVoltage: result.voltage,
                        computedCurrent: result.current,
                    },
                };
            }
            if (node.type === 'LED') {
                const data = node.data as LEDNodeData;
                return {
                    ...node,
                    data: {
                        ...data,
                        lit: result.lit ?? false,
                        computedVoltage: result.voltage,
                        computedCurrent: result.current,
                    },
                };
            }
            return node;
        });
        set({ elecNodes: updatedNodes });
    },
}));