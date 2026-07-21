// Derives a logic-gate circuit from an electrical switch network.
//
// This implements the classic switching-algebra correspondence:
//   switches in SERIES   → AND   (both must be closed to conduct)
//   switches in PARALLEL → OR    (either one conducts)
// A single switch driving the load is a buffer (INPUT → OUTPUT).
//
// The electrical circuit is analysed exactly the way the simulation engine
// builds junctions (Union-Find over `${nodeId}:terminal_a|b` endpoints). LEDs
// and resistors are treated as plain wires (they do not gate conduction — the
// LED is the load / output), so the boolean function of "does current flow
// from source+ to source-" depends only on the switches. The switch multigraph
// between the two source terminals is then reduced by series/parallel steps
// into a boolean expression, which is turned into INPUT/GATE/OUTPUT nodes.
//
// Only series-parallel switch networks have a direct AND/OR equivalent; for
// anything else (or a circuit with no switches) the function returns a reason
// the UI can show. Pure function — no DOM, no network — so it is unit-tested.

import type { Edge, Node } from 'reactflow';
import type { AnyNodeData } from '../types/circuit';

type Expr =
    | { kind: 'var'; label: string; closed: boolean }
    | { kind: 'and'; left: Expr; right: Expr }
    | { kind: 'or'; left: Expr; right: Expr };

type SwitchEdge = { u: string; v: string; expr: Expr };

export type DeriveResult =
    | { ok: true; nodes: Node<AnyNodeData>[]; edges: Edge[]; expression: string }
    | { ok: false; reason: string };

type ElecNode = Node<AnyNodeData>;

// ----- Union-Find over terminal endpoints -----
function makeUF() {
    const parent = new Map<string, string>();
    function find(x: string): string {
        if (parent.has(x) === false) {
            parent.set(x, x);
            return x;
        }
        let root = x;
        while (parent.get(root) !== root) {
            root = parent.get(root) as string;
        }
        // Path compression.
        let cur = x;
        while (parent.get(cur) !== root) {
            const next = parent.get(cur) as string;
            parent.set(cur, root);
            cur = next;
        }
        return root;
    }
    function union(a: string, b: string) {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) {
            parent.set(ra, rb);
        }
    }
    return { find, union };
}

function pairKey(a: string, b: string): string {
    if (a < b) {
        return a + '##' + b;
    }
    return b + '##' + a;
}

function exprToString(e: Expr): string {
    if (e.kind === 'var') {
        return e.label;
    }
    if (e.kind === 'and') {
        return exprToString(e.left) + ' · ' + exprToString(e.right);
    }
    return '(' + exprToString(e.left) + ' + ' + exprToString(e.right) + ')';
}

export function deriveLogicFromElectrical(
    elecNodes: ElecNode[],
    elecEdges: Edge[]
): DeriveResult {
    const source = elecNodes.find((n) => n.type === 'VOLTAGE_SOURCE');
    if (source === undefined) {
        return { ok: false, reason: 'Add a voltage source to derive the logic equivalent.' };
    }
    const switches = elecNodes.filter((n) => n.type === 'SWITCH');
    if (switches.length === 0) {
        return {
            ok: false,
            reason: 'Add switches to see the logic equivalent — switches in series map to AND, in parallel to OR.',
        };
    }

    const uf = makeUF();
    for (const n of elecNodes) {
        uf.find(`${n.id}:terminal_a`);
        uf.find(`${n.id}:terminal_b`);
    }
    for (const e of elecEdges) {
        let srcHandle = 'terminal_b';
        if (e.sourceHandle !== null && e.sourceHandle !== undefined) {
            srcHandle = e.sourceHandle;
        }
        let tgtHandle = 'terminal_a';
        if (e.targetHandle !== null && e.targetHandle !== undefined) {
            tgtHandle = e.targetHandle;
        }
        uf.union(`${e.source}:${srcHandle}`, `${e.target}:${tgtHandle}`);
    }
    // Treat LEDs and resistors as plain wires.
    for (const n of elecNodes) {
        if (n.type === 'LED' || n.type === 'RESISTOR') {
            uf.union(`${n.id}:terminal_a`, `${n.id}:terminal_b`);
        }
    }

    const T1 = uf.find(`${source.id}:terminal_a`);
    const T2 = uf.find(`${source.id}:terminal_b`);
    if (T1 === T2) {
        return { ok: false, reason: 'The source terminals are connected together — check your wiring.' };
    }

    let edges: SwitchEdge[] = [];
    for (const sw of switches) {
        const u = uf.find(`${sw.id}:terminal_a`);
        const v = uf.find(`${sw.id}:terminal_b`);
        if (u === v) {
            continue;
        }
        const data = sw.data as { label?: string; closed?: boolean };
        let label = sw.id;
        if (data.label !== undefined) {
            label = data.label;
        }
        edges.push({ u, v, expr: { kind: 'var', label, closed: data.closed === true } });
    }
    if (edges.length === 0) {
        return { ok: false, reason: 'The switches are not wired into the circuit between the source terminals.' };
    }

    // Series/parallel reduction to a single edge between T1 and T2.
    function isBetweenTerminals(e: SwitchEdge): boolean {
        return (e.u === T1 && e.v === T2) || (e.u === T2 && e.v === T1);
    }

    let guard = 0;
    while (edges.length > 1 || (edges.length === 1 && isBetweenTerminals(edges[0]) === false)) {
        guard = guard + 1;
        if (guard > 500) {
            return { ok: false, reason: 'Could not reduce this switch network.' };
        }

        // 1. Drop self-loops.
        const beforeSelf = edges.length;
        edges = edges.filter((e) => e.u !== e.v);
        if (edges.length !== beforeSelf) {
            continue;
        }

        // 2. Prune dead-end switches (a non-terminal junction touched by one edge).
        const degree = new Map<string, number>();
        for (const e of edges) {
            degree.set(e.u, (degree.get(e.u) ?? 0) + 1);
            degree.set(e.v, (degree.get(e.v) ?? 0) + 1);
        }
        let prunedDeadEnd = false;
        for (const e of edges) {
            const uDead = e.u !== T1 && e.u !== T2 && degree.get(e.u) === 1;
            const vDead = e.v !== T1 && e.v !== T2 && degree.get(e.v) === 1;
            if (uDead || vDead) {
                edges = edges.filter((x) => x !== e);
                prunedDeadEnd = true;
                break;
            }
        }
        if (prunedDeadEnd) {
            continue;
        }

        // 3. Parallel merge (two edges between the same pair of junctions).
        let merged = false;
        for (let i = 0; i < edges.length && merged === false; i++) {
            for (let j = i + 1; j < edges.length; j++) {
                if (pairKey(edges[i].u, edges[i].v) === pairKey(edges[j].u, edges[j].v)) {
                    const combined: SwitchEdge = {
                        u: edges[i].u,
                        v: edges[i].v,
                        expr: { kind: 'or', left: edges[i].expr, right: edges[j].expr },
                    };
                    const ei = edges[i];
                    const ej = edges[j];
                    edges = edges.filter((x) => x !== ei && x !== ej);
                    edges.push(combined);
                    merged = true;
                    break;
                }
            }
        }
        if (merged) {
            continue;
        }

        // 4. Series merge (a non-terminal junction of degree exactly 2).
        const deg2 = new Map<string, number>();
        for (const e of edges) {
            deg2.set(e.u, (deg2.get(e.u) ?? 0) + 1);
            deg2.set(e.v, (deg2.get(e.v) ?? 0) + 1);
        }
        let didSeries = false;
        for (const [w, d] of deg2) {
            if (w === T1 || w === T2 || d !== 2) {
                continue;
            }
            const incident = edges.filter((e) => e.u === w || e.v === w);
            if (incident.length !== 2) {
                continue;
            }
            const e1 = incident[0];
            const e2 = incident[1];
            let a = e1.u;
            if (e1.u === w) {
                a = e1.v;
            }
            let b = e2.u;
            if (e2.u === w) {
                b = e2.v;
            }
            if (a === b) {
                // Forms a parallel pair between a and w — let the parallel step handle it.
                continue;
            }
            const combined: SwitchEdge = {
                u: a,
                v: b,
                expr: { kind: 'and', left: e1.expr, right: e2.expr },
            };
            edges = edges.filter((x) => x !== e1 && x !== e2);
            edges.push(combined);
            didSeries = true;
            break;
        }
        if (didSeries) {
            continue;
        }

        return {
            ok: false,
            reason: 'This switch network is not a simple series/parallel arrangement, so it has no direct AND/OR equivalent.',
        };
    }

    const rootExpr = edges[0].expr;
    return buildCircuit(rootExpr);
}

// Converts a boolean expression into INPUT/GATE/OUTPUT nodes with a tidy layout.
function buildCircuit(rootExpr: Expr): DeriveResult {
    const nodes: Node<AnyNodeData>[] = [];
    const edges: Edge[] = [];
    const inputIdByLabel = new Map<string, string>();
    const column = new Map<string, number>();
    let inputCount = 0;
    let gateCount = 0;
    let edgeCount = 0;

    function build(expr: Expr): string {
        if (expr.kind === 'var') {
            const existing = inputIdByLabel.get(expr.label);
            if (existing !== undefined) {
                return existing;
            }
            const id = `d_in_${inputCount}`;
            inputCount = inputCount + 1;
            inputIdByLabel.set(expr.label, id);
            nodes.push({
                id,
                type: 'INPUT',
                position: { x: 0, y: 0 },
                data: { label: expr.label, value: expr.closed, output: null } as unknown as AnyNodeData,
            });
            column.set(id, 0);
            return id;
        }
        const leftId = build(expr.left);
        const rightId = build(expr.right);
        const id = `d_gate_${gateCount}`;
        gateCount = gateCount + 1;
        let gateType = 'OR';
        if (expr.kind === 'and') {
            gateType = 'AND';
        }
        nodes.push({
            id,
            type: 'GATE',
            position: { x: 0, y: 0 },
            data: { gateType, output: null } as unknown as AnyNodeData,
        });
        const col = 1 + Math.max(column.get(leftId) ?? 0, column.get(rightId) ?? 0);
        column.set(id, col);
        edges.push({ id: `de_${edgeCount}`, source: leftId, target: id, targetHandle: 'in-0' });
        edgeCount = edgeCount + 1;
        edges.push({ id: `de_${edgeCount}`, source: rightId, target: id, targetHandle: 'in-1' });
        edgeCount = edgeCount + 1;
        return id;
    }

    const rootId = build(rootExpr);
    const outId = 'd_out';
    const outCol = 1 + (column.get(rootId) ?? 0);
    column.set(outId, outCol);
    nodes.push({
        id: outId,
        type: 'OUTPUT',
        position: { x: 0, y: 0 },
        data: { label: 'Y', output: null } as unknown as AnyNodeData,
    });
    edges.push({ id: `de_${edgeCount}`, source: rootId, target: outId });

    // ----- Layout: inputs stacked on the left, columns flow right -----
    const inputNodes = nodes.filter((n) => n.type === 'INPUT');
    inputNodes.forEach((n, i) => {
        n.position = { x: 40, y: 40 + i * 90 };
    });
    // Non-input nodes: y = average of their sources' y, processed left to right.
    const nonInput = nodes.filter((n) => n.type !== 'INPUT');
    nonInput.sort((a, b) => (column.get(a.id) ?? 0) - (column.get(b.id) ?? 0));
    for (const n of nonInput) {
        const sources = edges.filter((e) => e.target === n.id).map((e) => e.source);
        let sumY = 0;
        let count = 0;
        for (const s of sources) {
            const sn = nodes.find((x) => x.id === s);
            if (sn !== undefined) {
                sumY = sumY + sn.position.y;
                count = count + 1;
            }
        }
        let y = 40;
        if (count > 0) {
            y = sumY / count;
        }
        n.position = { x: 40 + (column.get(n.id) ?? 1) * 170, y };
    }

    return { ok: true, nodes, edges, expression: exprToString(rootExpr) };
}
