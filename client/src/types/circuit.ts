// Shared TypeScript types for the logic-circuit domain.
// Keep these in sync with the server's /server/src/types/circuit.ts file —
// the API contract depends on both sides agreeing on field names.

export type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';

// Electrical component types (Phase 8)
export type ElectricalComponentType = 'VOLTAGE_SOURCE' | 'RESISTOR' | 'LED' | 'SWITCH';

// What we attach to React Flow nodes via the `data` field.
// - InputNodeData lives on the INPUT-type nodes (the toggle-able sources).
// - GateNodeData lives on the gate-type nodes (AND, OR, etc.).
// `output` is null until the simulator runs, then true (HIGH) or false (LOW).

export type InputNodeData = {
    label: string;
    value: boolean;
    output: boolean | null;
};

export type GateNodeData = {
    gateType: GateType;
    output: boolean | null;
};

// OUTPUT nodes are frontend-only — the backend doesn't need to know about
// them. After simulate, we resolve each OUTPUT's value by looking up the
// source node of its incoming edge in the response's `values` map.
export type OutputNodeData = {
    label: string;
    output: boolean | null;
};

// Custom component node — wraps an internal graph behind labelled pins (Phase 7)
export type CustomNodeData = {
    componentId: string;
    name: string;
    inputLabels: string[];
    outputLabels: string[];
    outputs: Record<string, boolean | null>;
};

// Electrical node data shapes (Phase 8)
export type VoltageSourceNodeData = {
    label: string;
    voltage: number;
    computedCurrent: number | null;
};

export type ResistorNodeData = {
    label: string;
    resistance: number;
    computedVoltage: number | null;
    computedCurrent: number | null;
};

export type LEDNodeData = {
    label: string;
    threshold: number;
    lit: boolean | null;
    computedVoltage: number | null;
    computedCurrent: number | null;
};

export type SwitchNodeData = {
    label: string;
    closed: boolean;
};

// Union of all possible node data types
export type AnyNodeData =
    | GateNodeData
    | InputNodeData
    | OutputNodeData
    | CustomNodeData
    | VoltageSourceNodeData
    | ResistorNodeData
    | LEDNodeData
    | SwitchNodeData;

// Custom component definition — stored in Firestore (Phase 7)
export type CustomComponentDef = {
    id: string;
    ownerId: string;
    name: string;
    inputLabels: string[];
    outputLabels: string[];
    internalNodes: SimulatePayloadNode[];
    internalEdges: SimulatePayloadEdge[];
    inputNodeIds: string[];
    outputNodeIds: string[];
};

// The shape we send to /api/simulate. We only serialise the fields the
// backend actually needs; positions etc. stay client-side.
export type SimulatePayloadNode =
    | { id: string; type: 'INPUT'; value: boolean }
    | { id: string; type: 'GATE'; gateType: GateType };

export type SimulatePayloadEdge = {
    source: string;
    target: string;
    targetHandle: string | null;
};

export type SimulateRequest = {
    nodes: SimulatePayloadNode[];
    edges: SimulatePayloadEdge[];
};

// The shape the backend returns.
// `values` maps every node id (INPUT and GATE) to its boolean output.
// `truthTable` is built by enumerating every INPUT combination.

export type TruthTable = {
    inputIds: string[];
    inputLabels: string[];
    outputIds: string[];
    outputLabels: string[];
    rows: Array<{
        inputs: boolean[];
        outputs: boolean[];
    }>;
};

export type SimulateResponse =
    | {
          ok: true;
          values: Record<string, boolean>;
          truthTable: TruthTable;
      }
    | {
          ok: false;
          error: string;
      };

// Electrical simulation payload (Phase 8)
export type ElectricalSimNode = {
    id: string;
    type: ElectricalComponentType;
    voltage?: number;
    resistance?: number;
    threshold?: number;
    closed?: boolean;
};

export type ElectricalSimEdge = {
    source: string;
    sourceHandle: string | null;
    target: string;
    targetHandle: string | null;
};

export type ElectricalComponentResult = {
    voltage: number;
    current: number;
    lit?: boolean;
};

export type ElectricalSimResponse =
    | {
          ok: true;
          values: Record<string, ElectricalComponentResult>;
      }
    | {
          ok: false;
          error: string;
      };