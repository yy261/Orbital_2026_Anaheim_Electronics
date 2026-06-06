import type { GateType } from '../types';

type InputNode = {
  id: string;
  type: 'INPUT';
  value: boolean;
};

type GateNode = {
  id: string;    
  type: 'GATE';
  gateType: GateType;
};

type SimNode = InputNode | GateNode;

type SimEdge = {
  source: string;  //id of node the wire is from
  target: string;  //id of the node where wire goes
  targetHandle: string | null; //input pin of target
};

export type LogicSimRequest = {
  nodes: SimNode[];
  edges: SimEdge[];
};

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


// discriminated union for the response, ok: true = success with values
// ok: false = failure with an error message 
export type LogicSimResponse =
  | { ok: true; values: Record<string, boolean>; truthTable: TruthTable }
  | { ok: false; error: string };

const PIN_COUNT: Record<GateType, number> = {
  AND: 2, OR: 2, NAND: 2, NOR: 2, XOR: 2,
  NOT: 1,
};


//output of gates
function evaluateGate(type: GateType, inputs: boolean[]): boolean {
  switch (type) {
    case 'AND':  return inputs[0] && inputs[1];
    case 'OR':   return inputs[0] || inputs[1];
    case 'NOT':  return !inputs[0];
    case 'NAND': return !(inputs[0] && inputs[1]);
    case 'NOR':  return !(inputs[0] || inputs[1]);
    case 'XOR':  return inputs[0] !== inputs[1];
  }
}

//Simulation logic algorithm for canvas
function runOnce( nodes: SimNode[], edges: SimEdge[]): 
{ok: true; values: Record<string, boolean> } | { ok: false; error: string } {
  const nodeById = new Map<string, SimNode>();
  for (const node of nodes) nodeById.set(node.id, node);
  //building AL graph
  const incoming = new Map<string, SimEdge[]>();
  const outgoing = new Map<string, SimEdge[]>();
  for (const edge of edges) {
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    incoming.get(edge.target)!.push(edge);
    outgoing.get(edge.source)!.push(edge);
  }
  //Kahn's algo
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node.id, incoming.get(node.id)?.length ?? 0);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    sorted.push(id);
    for (const edge of outgoing.get(id) ?? []) {
      const newDeg = inDegree.get(edge.target)! - 1;
      inDegree.set(edge.target, newDeg);
      if (newDeg === 0) queue.push(edge.target);
    }
  }

  //clear nodes in topo order
  if (sorted.length < nodes.length) {
    return { ok: false, error: 'Circuit contains a cycle — feedback loops are not supported.' };
  }

  const values: Record<string, boolean> = {};

  for (const id of sorted) {
    const node = nodeById.get(id)!;

    if (node.type === 'INPUT') {
      values[id] = node.value;
      continue;
    }

    if (node.type === 'GATE') {
      if (!node.gateType) {
        return { ok: false, error: `Gate node ${id} is missing its gateType.` };
      }

      const pinCount = PIN_COUNT[node.gateType];
      const inputs: boolean[] = new Array(pinCount).fill(false);

      for (const edge of incoming.get(id) ?? []) {
        const match = edge.targetHandle?.match(/^in-(\d+)$/);
        if (!match) continue;
        const idx = parseInt(match[1], 10);
        if (idx >= 0 && idx < pinCount) {
          inputs[idx] = values[edge.source] ?? false;
        }
      }

      values[id] = evaluateGate(node.gateType, inputs);
      continue;
    }
  }

  return { ok: true, values };
}

function buildTruthTable(nodes: SimNode[], edges: SimEdge[]): TruthTable {
  // separate nodes into inputs and gates for processing
  const inputNodes = nodes.filter((n): n is InputNode => n.type === 'INPUT');
  const gateNodes = nodes.filter((n): n is GateNode => n.type === 'GATE');

  const nodesWithOutgoing = new Set(edges.map(e => e.source));
  let outputNodes = gateNodes.filter(n => !nodesWithOutgoing.has(n.id));
  if (outputNodes.length === 0) {
    outputNodes = gateNodes;
  }

  const inputLabels = inputNodes.map((_, i) =>
    i < 26 ? String.fromCharCode(65 + i) : `IN${i + 1}`
  );
  const outputLabels = outputNodes.map((_, i) => `Y${i + 1}`);

  const n = inputNodes.length;
  const rows: TruthTable['rows'] = [];

  //enumerate all 2^n input combinations using a bitmask
  for (let mask = 0; mask < Math.pow(2, n); mask++) {
    const inputCombo: boolean[] = [];
    for (let i = 0; i < n; i++) {
      inputCombo.push(Boolean((mask >> (n - 1 - i)) & 1));
    }

    const modifiedNodes: SimNode[] = nodes.map(node => {
      if (node.type === 'INPUT') {
        const idx = inputNodes.findIndex(inp => inp.id === node.id);
        return { ...node, value: inputCombo[idx] };
      }
      return node;
    });

    const result = runOnce(modifiedNodes, edges);
    if (result.ok === false) continue;

    const outputs = outputNodes.map(n => result.values[n.id] ?? false);
    rows.push({ inputs: inputCombo, outputs });
  }

  return {
    inputIds: inputNodes.map(n => n.id),
    inputLabels,
    outputIds: outputNodes.map(n => n.id),
    outputLabels,
    rows,
  };
}


//full simulation + truth table
export function simulateLogic(req: LogicSimRequest): LogicSimResponse {
  const { nodes, edges } = req;

  const result = runOnce(nodes, edges);
  if (result.ok === false) {
    return result;
  }

  const truthTable = buildTruthTable(nodes, edges);

  return {
    ok: true,
    values: result.values,
    truthTable,
  };
}