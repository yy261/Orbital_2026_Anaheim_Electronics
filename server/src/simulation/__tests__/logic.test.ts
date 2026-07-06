// Unit tests for the Milestone 1 logic-simulation engine.
//
// The engine (src/simulation/logic.ts) is a pure function: given a graph of
// INPUT and GATE nodes plus edges, it returns each node's boolean value and a
// full truth table, or an error for invalid graphs. Pure input/output makes it
// an ideal unit to test in isolation — no server, network, or UI involved.
//
// Coverage:
//   - every gate type's boolean behaviour (AND, OR, NOT, NAND, NOR, XOR)
//   - topological evaluation across chained gates (Kahn's algorithm)
//   - cycle detection (feedback loops are rejected)
//   - truth-table generation (row count, labels, correctness)
//   - a half-adder, a canonical Milestone 1 circuit

import { describe, it, expect } from 'vitest';
import { simulateLogic, type LogicSimRequest } from '../logic';
import type { GateType } from '../../types';

type Node = LogicSimRequest['nodes'][number];
type Edge = LogicSimRequest['edges'][number];

// ----- Builders keep each test readable -----
function input(id: string, value: boolean): Node {
    return { id, type: 'INPUT', value };
}
function gate(id: string, gateType: GateType): Node {
    return { id, type: 'GATE', gateType };
}
function edge(source: string, target: string, targetHandle: string | null): Edge {
    return { source, target, targetHandle };
}

// Builds a single two-input gate fed by inputs a and b, and returns the gate's
// computed value for the given a/b combination.
function evalTwoInput(gateType: GateType, a: boolean, b: boolean): boolean {
    const req: LogicSimRequest = {
        nodes: [input('a', a), input('b', b), gate('g', gateType)],
        edges: [edge('a', 'g', 'in-0'), edge('b', 'g', 'in-1')],
    };
    const result = simulateLogic(req);
    if (result.ok === false) {
        throw new Error(result.error);
    }
    return result.values['g'];
}

describe('logic engine — individual gate behaviour', () => {
    it('AND is true only when both inputs are true', () => {
        expect(evalTwoInput('AND', false, false)).toBe(false);
        expect(evalTwoInput('AND', true, false)).toBe(false);
        expect(evalTwoInput('AND', false, true)).toBe(false);
        expect(evalTwoInput('AND', true, true)).toBe(true);
    });

    it('OR is true when at least one input is true', () => {
        expect(evalTwoInput('OR', false, false)).toBe(false);
        expect(evalTwoInput('OR', true, false)).toBe(true);
        expect(evalTwoInput('OR', false, true)).toBe(true);
        expect(evalTwoInput('OR', true, true)).toBe(true);
    });

    it('NAND is the negation of AND', () => {
        expect(evalTwoInput('NAND', false, false)).toBe(true);
        expect(evalTwoInput('NAND', true, false)).toBe(true);
        expect(evalTwoInput('NAND', true, true)).toBe(false);
    });

    it('NOR is the negation of OR', () => {
        expect(evalTwoInput('NOR', false, false)).toBe(true);
        expect(evalTwoInput('NOR', true, false)).toBe(false);
        expect(evalTwoInput('NOR', true, true)).toBe(false);
    });

    it('XOR is true when the inputs differ', () => {
        expect(evalTwoInput('XOR', false, false)).toBe(false);
        expect(evalTwoInput('XOR', true, false)).toBe(true);
        expect(evalTwoInput('XOR', false, true)).toBe(true);
        expect(evalTwoInput('XOR', true, true)).toBe(false);
    });

    it('NOT inverts its single input', () => {
        const high: LogicSimRequest = {
            nodes: [input('a', true), gate('g', 'NOT')],
            edges: [edge('a', 'g', 'in-0')],
        };
        const low: LogicSimRequest = {
            nodes: [input('a', false), gate('g', 'NOT')],
            edges: [edge('a', 'g', 'in-0')],
        };
        const r1 = simulateLogic(high);
        const r2 = simulateLogic(low);
        expect(r1.ok && r1.values['g']).toBe(false);
        expect(r2.ok && r2.values['g']).toBe(true);
    });
});

describe('logic engine — topological evaluation', () => {
    it('evaluates chained gates in dependency order', () => {
        // (A AND B) then NOT  ==  NAND
        const req: LogicSimRequest = {
            nodes: [input('a', true), input('b', true), gate('and', 'AND'), gate('not', 'NOT')],
            edges: [
                edge('a', 'and', 'in-0'),
                edge('b', 'and', 'in-1'),
                edge('and', 'not', 'in-0'),
            ],
        };
        const result = simulateLogic(req);
        expect(result.ok).toBe(true);
        if (result.ok === true) {
            expect(result.values['and']).toBe(true);
            expect(result.values['not']).toBe(false);
        }
    });

    it('rejects a circuit containing a feedback loop', () => {
        // g1 -> g2 -> g1 forms a cycle; Kahn's algorithm cannot fully sort it.
        const req: LogicSimRequest = {
            nodes: [gate('g1', 'NOT'), gate('g2', 'NOT')],
            edges: [edge('g1', 'g2', 'in-0'), edge('g2', 'g1', 'in-0')],
        };
        const result = simulateLogic(req);
        expect(result.ok).toBe(false);
        if (result.ok === false) {
            expect(result.error).toMatch(/cycle/i);
        }
    });
});

describe('logic engine — truth-table generation', () => {
    it('produces 2^n rows for n inputs', () => {
        const req: LogicSimRequest = {
            nodes: [input('a', false), input('b', false), gate('g', 'AND')],
            edges: [edge('a', 'g', 'in-0'), edge('b', 'g', 'in-1')],
        };
        const result = simulateLogic(req);
        expect(result.ok).toBe(true);
        if (result.ok === true) {
            expect(result.truthTable.rows).toHaveLength(4);
            expect(result.truthTable.inputLabels).toEqual(['A', 'B']);
            // AND: output HIGH only on the final row (A=1, B=1).
            const highRows = result.truthTable.rows.filter((r) => r.outputs[0] === true);
            expect(highRows).toHaveLength(1);
            expect(highRows[0].inputs).toEqual([true, true]);
        }
    });

    it('computes a correct half-adder truth table (SUM = XOR, CARRY = AND)', () => {
        const req: LogicSimRequest = {
            nodes: [
                input('a', false),
                input('b', false),
                gate('sum', 'XOR'),
                gate('carry', 'AND'),
            ],
            edges: [
                edge('a', 'sum', 'in-0'),
                edge('b', 'sum', 'in-1'),
                edge('a', 'carry', 'in-0'),
                edge('b', 'carry', 'in-1'),
            ],
        };
        const result = simulateLogic(req);
        expect(result.ok).toBe(true);
        if (result.ok === true) {
            const rows = result.truthTable.rows;
            // Rows are ordered 00, 01, 10, 11. outputs = [SUM, CARRY].
            expect(rows[0].outputs).toEqual([false, false]); // 0 + 0 = 0, carry 0
            expect(rows[1].outputs).toEqual([true, false]); // 0 + 1 = 1, carry 0
            expect(rows[2].outputs).toEqual([true, false]); // 1 + 0 = 1, carry 0
            expect(rows[3].outputs).toEqual([false, true]); // 1 + 1 = 0, carry 1
        }
    });
});
