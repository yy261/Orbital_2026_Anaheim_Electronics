// Shared TypeScript types for the logic-circuit domain.
// Keep these in sync with the server's /server/src/types/circuit.ts file —
// the API contract depends on both sides agreeing on field names.

export type GateType = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';

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
// source node of its incoming edge in the response's `values` map. This
// keeps the API contract simple and means adding OUTPUT didn't require
// any server changes.
export type OutputNodeData = {
    label: string;
    output: boolean | null;
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
