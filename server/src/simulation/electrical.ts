import type { ElectricalComponentType } from '../types';

// ----- Request / response types -----

type SimNode = {
    id: string;
    type: ElectricalComponentType;
    voltage?: number;
    resistance?: number;
    threshold?: number;
    closed?: boolean;
};

type SimEdge = {
    source: string;
    sourceHandle: string | null;
    target: string;
    targetHandle: string | null;
};

export type ElectricalSimRequest = {
    nodes: SimNode[];
    edges: SimEdge[];
};

type ComponentResult = {
    voltage: number;
    current: number;
    lit?: boolean;
};

export type ElectricalSimResponse =
    | { ok: true; values: Record<string, ComponentResult> }
    | { ok: false; error: string };

// Internal representation of a component as an element between two junctions
type CircuitElement = {
    id: string;
    type: ElectricalComponentType;
    resistance: number;
    voltage: number;
    threshold: number;
    isSource: boolean;
    junctionA: string;
    junctionB: string;
};

// ----- Union-Find (for merging wire-connected handle endpoints into junctions) -----

function makeUnionFind() {
    const parent: Record<string, string> = {};

    function find(x: string): string {
        if (parent[x] === undefined) {
            parent[x] = x;
        }
        if (parent[x] !== x) {
            parent[x] = find(parent[x]);
        }
        return parent[x];
    }

    function union(a: string, b: string): void {
        const ra = find(a);
        const rb = find(b);
        if (ra !== rb) {
            parent[ra] = rb;
        }
    }

    return { find, union };
}

// Converts the React Flow nodes/edges into a junction graph.
// Each node contributes two handle endpoints: nodeId:terminal_a and nodeId:terminal_b.
// Edges connect endpoints; Union-Find merges connected endpoints into a single junction ID.
function buildJunctionGraph(nodes: SimNode[], edges: SimEdge[]): CircuitElement[] {
    const uf = makeUnionFind();

    // Register all terminals
    for (const node of nodes) {
        uf.find(`${node.id}:terminal_a`);
        uf.find(`${node.id}:terminal_b`);
    }

    // Merge terminals connected by wires
    for (const edge of edges) {
        const srcHandle = edge.sourceHandle || 'terminal_b';
        const tgtHandle = edge.targetHandle || 'terminal_a';
        uf.union(`${edge.source}:${srcHandle}`, `${edge.target}:${tgtHandle}`);
    }

    const elements: CircuitElement[] = [];

    for (const node of nodes) {
        const jA = uf.find(`${node.id}:terminal_a`);
        const jB = uf.find(`${node.id}:terminal_b`);

        let resistance = 0;
        let voltage = 0;
        let threshold = 0;
        let isSource = false;

        if (node.type === 'VOLTAGE_SOURCE') {
            voltage = node.voltage ?? 5;
            isSource = true;
        } else if (node.type === 'RESISTOR') {
            resistance = node.resistance ?? 100;
        } else if (node.type === 'LED') {
            resistance = 20;
            threshold = node.threshold ?? 0.01;
        } else if (node.type === 'SWITCH') {
            if (node.closed === true) {
                resistance = 0;
            } else {
                resistance = Infinity;
            }
        }

        elements.push({
            id: node.id,
            type: node.type,
            resistance,
            voltage,
            threshold,
            isSource,
            junctionA: jA,
            junctionB: jB,
        });
    }

    return elements;
}

// ----- Series-parallel resistance reducer -----
// Iteratively simplifies the circuit by merging:
//   - Series: two components sharing an internal junction (not a source terminal)
//   - Parallel: multiple components sharing the same pair of junctions
// Returns the equivalent resistance between the two source terminals, or null
// if the circuit cannot be fully reduced (unsupported topology).

type MutableElement = {
    ids: string[];
    resistance: number;
    jA: string;
    jB: string;
    removed: boolean;
};

function reduceToEquivalent(
    nonSourceElements: CircuitElement[],
    sourceJA: string,
    sourceJB: string
): number | null {
    if (nonSourceElements.length === 0) {
        return 0;
    }

    const elems: MutableElement[] = nonSourceElements.map((e) => ({
        ids: [e.id],
        resistance: e.resistance,
        jA: e.junctionA,
        jB: e.junctionB,
        removed: false,
    }));

    let changed = true;
    let iterations = 0;

    while (changed && iterations < 200) {
        changed = false;
        iterations++;

        // Build adjacency: junction -> list of active element indices
        const adj = new Map<string, number[]>();
        for (let i = 0; i < elems.length; i++) {
            if (elems[i].removed) {
                continue;
            }
            const e = elems[i];
            if (!adj.has(e.jA)) {
                adj.set(e.jA, []);
            }
            adj.get(e.jA)!.push(i);
            if (!adj.has(e.jB)) {
                adj.set(e.jB, []);
            }
            adj.get(e.jB)!.push(i);
        }

        // Series: junction with exactly 2 components, not a source terminal
        for (const [junction, indices] of adj) {
            if (indices.length !== 2) {
                continue;
            }
            if (junction === sourceJA || junction === sourceJB) {
                continue;
            }

            const e0 = elems[indices[0]];
            const e1 = elems[indices[1]];

            let otherA: string;
            if (e0.jA === junction) {
                otherA = e0.jB;
            } else {
                otherA = e0.jA;
            }

            let otherB: string;
            if (e1.jA === junction) {
                otherB = e1.jB;
            } else {
                otherB = e1.jA;
            }

            let newR: number;
            if (e0.resistance === Infinity || e1.resistance === Infinity) {
                newR = Infinity;
            } else {
                newR = e0.resistance + e1.resistance;
            }

            elems.push({ ids: [...e0.ids, ...e1.ids], resistance: newR, jA: otherA, jB: otherB, removed: false });
            e0.removed = true;
            e1.removed = true;
            changed = true;
            break;
        }

        if (changed) {
            continue;
        }

        // Parallel: multiple elements sharing the same junction pair
        const pairMap = new Map<string, number[]>();
        for (let i = 0; i < elems.length; i++) {
            if (elems[i].removed) {
                continue;
            }
            const key =
                elems[i].jA < elems[i].jB
                    ? `${elems[i].jA}||${elems[i].jB}`
                    : `${elems[i].jB}||${elems[i].jA}`;
            if (!pairMap.has(key)) {
                pairMap.set(key, []);
            }
            pairMap.get(key)!.push(i);
        }

        for (const [, indices] of pairMap) {
            if (indices.length < 2) {
                continue;
            }

            let reciprocalSum = 0;
            let hasInfinite = false;
            let hasZero = false;
            const allIds: string[] = [];

            for (const idx of indices) {
                allIds.push(...elems[idx].ids);
                if (elems[idx].resistance === Infinity) {
                    hasInfinite = true;
                } else if (elems[idx].resistance === 0) {
                    hasZero = true;
                } else {
                    reciprocalSum += 1 / elems[idx].resistance;
                }
            }

            let eqR: number;
            if (hasZero) {
                eqR = 0;
            } else if (reciprocalSum === 0 && hasInfinite) {
                eqR = Infinity;
            } else if (reciprocalSum === 0) {
                eqR = 0;
            } else {
                eqR = 1 / reciprocalSum;
            }

            const jA = elems[indices[0]].jA;
            const jB = elems[indices[0]].jB;
            for (const idx of indices) {
                elems[idx].removed = true;
            }
            elems.push({ ids: allIds, resistance: eqR, jA, jB, removed: false });
            changed = true;
            break;
        }
    }

    const active = elems.filter((e) => !e.removed);
    if (active.length !== 1) {
        return null;
    }
    return active[0].resistance;
}

// ----- Main simulation entry point -----

export function simulateElectrical(req: ElectricalSimRequest): ElectricalSimResponse {
    const { nodes, edges } = req;

    if (nodes.length === 0) {
        return { ok: false, error: 'Circuit is empty.' };
    }

    const elements = buildJunctionGraph(nodes, edges);

    // Find voltage source
    const sources = elements.filter((e) => e.isSource);
    if (sources.length === 0) {
        return { ok: false, error: 'No voltage source found. Add a V SRC component.' };
    }
    if (sources.length > 1) {
        return { ok: false, error: 'Multiple voltage sources are not supported. Use exactly one.' };
    }

    const source = sources[0];
    const totalVoltage = source.voltage;
    const nonSource = elements.filter((e) => !e.isSource);

    const values: Record<string, ComponentResult> = {};

    if (nonSource.length === 0) {
        values[source.id] = { voltage: totalVoltage, current: 0 };
        return { ok: true, values };
    }

    // An open switch is modelled as infinite resistance and handled by the
    // reducer below, NOT by a global "any switch open → no current" shortcut.
    // That shortcut was incorrect for parallel circuits: an open switch in one
    // branch must not stop current through a closed branch beside it (this is
    // the OR case). In a pure series path an open switch makes the equivalent
    // resistance infinite, which is caught by the eqR === Infinity check.

    // Reduce to equivalent resistance
    const eqR = reduceToEquivalent(nonSource, source.junctionA, source.junctionB);

    if (eqR === null) {
        return {
            ok: false,
            error:
                'Circuit does not form a complete loop, or uses a topology beyond series-parallel. ' +
                'Make sure all components are wired in a closed chain back to the voltage source.',
        };
    }

    if (eqR === 0) {
        return { ok: false, error: 'Short circuit detected — total resistance is zero.' };
    }

    if (eqR === Infinity) {
        // Shouldn't reach here (caught by open switch check), but handle it
        values[source.id] = { voltage: totalVoltage, current: 0 };
        for (const elem of nonSource) {
            if (elem.type === 'LED') {
                values[elem.id] = { voltage: 0, current: 0, lit: false };
            } else {
                values[elem.id] = { voltage: 0, current: 0 };
            }
        }
        return { ok: true, values };
    }

    const totalCurrent = totalVoltage / eqR;
    values[source.id] = { voltage: totalVoltage, current: totalCurrent };

    // Distribute current and voltage to each component.
    // Group elements by junction pair to identify parallel branches.
    const junctionPairs = new Map<string, CircuitElement[]>();
    for (const elem of nonSource) {
        const key =
            elem.junctionA < elem.junctionB
                ? `${elem.junctionA}||${elem.junctionB}`
                : `${elem.junctionB}||${elem.junctionA}`;
        if (!junctionPairs.has(key)) {
            junctionPairs.set(key, []);
        }
        junctionPairs.get(key)!.push(elem);
    }

    if (junctionPairs.size === 1) {
        // Pure parallel — all elements share the full source voltage
        for (const elem of nonSource) {
            let current: number;
            if (elem.resistance === 0) {
                current = totalCurrent;
            } else {
                current = totalVoltage / elem.resistance;
            }
            const result: ComponentResult = { voltage: totalVoltage, current };
            if (elem.type === 'LED') {
                result.lit = current >= elem.threshold;
            }
            values[elem.id] = result;
        }
    } else {
        // Series (or series with parallel subgroups)
        for (const [, group] of junctionPairs) {
            if (group.length === 1) {
                // Series element — carries total current
                const elem = group[0];
                const vDrop = totalCurrent * elem.resistance;
                const result: ComponentResult = { voltage: vDrop, current: totalCurrent };
                if (elem.type === 'LED') {
                    result.lit = totalCurrent >= elem.threshold;
                }
                values[elem.id] = result;
            } else {
                // Parallel subgroup within a series circuit
                let recipSum = 0;
                for (const elem of group) {
                    if (elem.resistance > 0 && elem.resistance < Infinity) {
                        recipSum += 1 / elem.resistance;
                    }
                }
                const groupR = recipSum > 0 ? 1 / recipSum : 0;
                const groupVoltage = totalCurrent * groupR;

                for (const elem of group) {
                    let branchCurrent: number;
                    if (elem.resistance === 0) {
                        branchCurrent = totalCurrent;
                    } else if (elem.resistance === Infinity) {
                        branchCurrent = 0;
                    } else {
                        branchCurrent = groupVoltage / elem.resistance;
                    }
                    const result: ComponentResult = { voltage: groupVoltage, current: branchCurrent };
                    if (elem.type === 'LED') {
                        result.lit = branchCurrent >= elem.threshold;
                    }
                    values[elem.id] = result;
                }
            }
        }
    }

    return { ok: true, values };
}