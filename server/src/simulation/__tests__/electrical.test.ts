// Unit tests for the Milestone 2 electrical-simulation engine.
//
// The engine (src/simulation/electrical.ts) is a pure function: it builds a
// junction graph with Union-Find, reduces the network by series/parallel
// simplification, and distributes voltage and current with Ohm's law. Like the
// logic engine, it is pure input/output and tested in isolation.
//
// Coverage:
//   - series resistance and Ohm's law (I = V / R)
//   - parallel resistance (equivalent R halves for two equal resistors)
//   - LED lights only when current meets its threshold
//   - open switch in series stops all current
//   - REGRESSION: open switch in a PARALLEL branch must NOT stop the closed
//     branch (this was a real bug — a global "any switch open" shortcut broke
//     the OR scenario; see FIXES.md)
//   - invalid circuits are rejected (empty, no source, multiple sources)

import { describe, it, expect } from 'vitest';
import { simulateElectrical, type ElectricalSimRequest } from '../electrical';

type Node = ElectricalSimRequest['nodes'][number];
type Edge = ElectricalSimRequest['edges'][number];

// ----- Builders (defaults mirror the client store) -----
function vsrc(id: string, voltage: number): Node {
    return { id, type: 'VOLTAGE_SOURCE', voltage };
}
function res(id: string, resistance: number): Node {
    return { id, type: 'RESISTOR', resistance };
}
function led(id: string, threshold = 0.01): Node {
    return { id, type: 'LED', threshold };
}
function sw(id: string, closed: boolean): Node {
    return { id, type: 'SWITCH', closed };
}
// Wire one component's terminal_b to the next component's terminal_a.
function wire(source: string, target: string): Edge {
    return { source, sourceHandle: 'terminal_b', target, targetHandle: 'terminal_a' };
}

describe('electrical engine — series circuits and Ohm\'s law', () => {
    it('computes I = V / R for a single series resistor', () => {
        const req: ElectricalSimRequest = {
            nodes: [vsrc('V', 5), res('R', 100)],
            edges: [wire('V', 'R'), wire('R', 'V')],
        };
        const result = simulateElectrical(req);
        expect(result.ok).toBe(true);
        if (result.ok === true) {
            // 5 V / 100 Ω = 0.05 A
            expect(result.values['R'].current).toBeCloseTo(0.05, 6);
            expect(result.values['R'].voltage).toBeCloseTo(5, 6);
            expect(result.values['V'].current).toBeCloseTo(0.05, 6);
        }
    });

    it('lights an LED when the series current meets its threshold', () => {
        const req: ElectricalSimRequest = {
            nodes: [vsrc('V', 5), res('R', 100), led('D', 0.01)],
            edges: [wire('V', 'R'), wire('R', 'D'), wire('D', 'V')],
        };
        const result = simulateElectrical(req);
        expect(result.ok).toBe(true);
        if (result.ok === true) {
            expect(result.values['D'].lit).toBe(true);
        }
    });
});

describe('electrical engine — parallel circuits', () => {
    it('halves the equivalent resistance for two equal parallel resistors', () => {
        // Two 100 Ω resistors in parallel = 50 Ω → total current 5/50 = 0.1 A,
        // split evenly as 0.05 A per branch.
        const req: ElectricalSimRequest = {
            nodes: [vsrc('V', 5), res('R1', 100), res('R2', 100)],
            edges: [wire('V', 'R1'), wire('V', 'R2'), wire('R1', 'V'), wire('R2', 'V')],
        };
        const result = simulateElectrical(req);
        expect(result.ok).toBe(true);
        if (result.ok === true) {
            expect(result.values['V'].current).toBeCloseTo(0.1, 6);
            expect(result.values['R1'].current).toBeCloseTo(0.05, 6);
            expect(result.values['R2'].current).toBeCloseTo(0.05, 6);
        }
    });
});

describe('electrical engine — switches', () => {
    it('stops all current when a series switch is open', () => {
        const req: ElectricalSimRequest = {
            nodes: [vsrc('V', 5), sw('SW', false), led('D', 0.01)],
            edges: [wire('V', 'SW'), wire('SW', 'D'), wire('D', 'V')],
        };
        const result = simulateElectrical(req);
        expect(result.ok).toBe(true);
        if (result.ok === true) {
            expect(result.values['D'].lit).toBe(false);
            expect(result.values['V'].current).toBeCloseTo(0, 6);
        }
    });

    // REGRESSION TEST — protects the fix for the parallel open-switch bug.
    it('still conducts through a closed branch when a parallel branch is open (OR)', () => {
        // SW1 closed, SW2 open, both feeding a shared LED. The OR case: the LED
        // must light because SW1 conducts, even though SW2 is open.
        const req: ElectricalSimRequest = {
            nodes: [vsrc('V', 5), sw('SW1', true), sw('SW2', false), led('D', 0.01)],
            edges: [
                wire('V', 'SW1'),
                wire('V', 'SW2'),
                wire('SW1', 'D'),
                wire('SW2', 'D'),
                wire('D', 'V'),
            ],
        };
        const result = simulateElectrical(req);
        expect(result.ok).toBe(true);
        if (result.ok === true) {
            expect(result.values['D'].lit).toBe(true);
        }
    });
});

describe('electrical engine — invalid circuits are rejected', () => {
    it('rejects an empty circuit', () => {
        const result = simulateElectrical({ nodes: [], edges: [] });
        expect(result.ok).toBe(false);
    });

    it('rejects a circuit with no voltage source', () => {
        const req: ElectricalSimRequest = {
            nodes: [res('R', 100), led('D')],
            edges: [wire('R', 'D')],
        };
        const result = simulateElectrical(req);
        expect(result.ok).toBe(false);
        if (result.ok === false) {
            expect(result.error).toMatch(/source/i);
        }
    });

    it('rejects a circuit with more than one voltage source', () => {
        const req: ElectricalSimRequest = {
            nodes: [vsrc('V1', 5), vsrc('V2', 5), res('R', 100)],
            edges: [wire('V1', 'R'), wire('R', 'V1')],
        };
        const result = simulateElectrical(req);
        expect(result.ok).toBe(false);
        if (result.ok === false) {
            expect(result.error).toMatch(/source/i);
        }
    });
});
