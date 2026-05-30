import type { GateType } from '../types';

type SimNode = {
  id: string;
  type: 'gate' | 'input';
  data: {
    gateType?: GateType;
    value?: boolean;
  };
};

type SimEdge = {
  source: string;        // id of the node the wire comes from
  target: string;        // id of the node the wire goes to
  targetHandle?: string | null;  // which input pin of target
};

export type LogicSimRequest = {
  nodes: SimNode[];
  edges: SimEdge[];
};

// ok: true = success with values;
// ok: false = failure with an error message.
export type LogicSimResponse =
  | { ok: true; values: Record<string, boolean> }
  | { ok: false; error: string };

// How many input pins each gate has.
const PIN_COUNT: Record<GateType, number> = {
  AND: 2, OR: 2, NAND: 2, NOR: 2, XOR: 2,
  NOT: 1,
};

// Pure given a gate type and its input values, return the output.
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

// Algorithm:
//   1. Build adjacency maps (incoming edges per node, outgoing edges per node).
//   2. Topological sort using Kahn's algorithm, repeatedly pull nodes with
//      no remaining incoming edges into the sorted list, decrementing the
//      in-degree of their successors.
//   3. If we can't sort all nodes, the graph has a cycle, bail with an error.
//   4. Walk the sorted list. For each input node, copy its user-set value
//      into the values map. For each gate node, look up its inputs from
//      the values map (using the targetHandle to know which pin), default
//      missing inputs to LOW, then compute the output.
export function simulateLogic(req: LogicSimRequest): LogicSimResponse {
  const { nodes, edges } = req;

  // Index: node id -> the node itself
  const nodeById = new Map<string, SimNode>();
  for (const node of nodes) nodeById.set(node.id, node);

  // Build incoming and outgoing edge lists per node
  const incoming = new Map<string, SimEdge[]>();
  const outgoing = new Map<string, SimEdge[]>();
  for (const edge of edges) {
    if (!incoming.has(edge.target)) incoming.set(edge.target, []);
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
    incoming.get(edge.target)!.push(edge);
    outgoing.get(edge.source)!.push(edge);
  }

  // Kahn's algorithm
  const inDegree = new Map<string, number>();
  for (const node of nodes) {
    inDegree.set(node.id, incoming.get(node.id)?.length ?? 0);
  }

  // Seed the queue with all nodes that have no incoming edges
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  // Pull from queue, append to sorted, decrement successors' in-degrees
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

  // If we didn't visit every node, at least one is stuck in a cycle
  if (sorted.length < nodes.length) {
    return { ok: false, error: 'Circuit contains a cycle — feedback loops are not supported.' };
  }

  // Evaluate in topological order. By the time we get to any gate, all of
  // its inputs have already been computed and stored in `values`.
  const values: Record<string, boolean> = {};

  for (const id of sorted) {
    const node = nodeById.get(id)!;

    if (node.type === 'input') {
      values[id] = node.data.value ?? false;
      continue;
    }

    if (node.type === 'gate') {
      const gateType = node.data.gateType;
      if (!gateType) {
        return { ok: false, error: `Gate node ${id} is missing its gateType.` };
      }

      const pinCount = PIN_COUNT[gateType];
      // Floating (unconnected) inputs default to LOW
      const inputs: boolean[] = new Array(pinCount).fill(false);

      for (const edge of incoming.get(id) ?? []) {
        const match = edge.targetHandle?.match(/^in-(\d+)$/);
        if (!match) continue;
        const idx = parseInt(match[1], 10);
        if (idx >= 0 && idx < pinCount) {
          inputs[idx] = values[edge.source] ?? false;
        }
      }

      values[id] = evaluateGate(gateType, inputs);
      continue;
    }
  }

  return { ok: true, values };
}
