// Unit tests for deriveLogicFromElectrical.
//
// The Compare presets are hand-authored electrical/logic pairs, so feeding each
// preset's electrical circuit into the derivation must reproduce its intended
// logic equivalent — a strong correctness check. Pure function; no DOM/network.

import { describe, it, expect } from 'vitest';
import { deriveLogicFromElectrical } from '../deriveLogic';
import { SCENARIOS } from '../../data/compareScenarios';

function elecOf(id: string) {
    const s = SCENARIOS.find((x) => x.id === id);
    if (s === undefined || s.build === null) {
        throw new Error(`scenario ${id} missing`);
    }
    const built = s.build();
    return { nodes: built.elecNodes, edges: built.elecEdges };
}

describe('deriveLogicFromElectrical', () => {
    it('switch → LED derives a buffer (one input, no gate)', () => {
        const { nodes, edges } = elecOf('switch_led');
        const r = deriveLogicFromElectrical(nodes, edges);
        expect(r.ok).toBe(true);
        if (r.ok === true) {
            expect(r.nodes.filter((n) => n.type === 'GATE')).toHaveLength(0);
            expect(r.nodes.filter((n) => n.type === 'INPUT')).toHaveLength(1);
            expect(r.nodes.filter((n) => n.type === 'OUTPUT')).toHaveLength(1);
        }
    });

    it('two switches in series derive an AND', () => {
        const { nodes, edges } = elecOf('series');
        const r = deriveLogicFromElectrical(nodes, edges);
        expect(r.ok).toBe(true);
        if (r.ok === true) {
            const gates = r.nodes.filter((n) => n.type === 'GATE');
            expect(gates).toHaveLength(1);
            expect((gates[0].data as { gateType: string }).gateType).toBe('AND');
            expect(r.expression).toContain('·');
        }
    });

    it('two switches in parallel derive an OR', () => {
        const { nodes, edges } = elecOf('parallel');
        const r = deriveLogicFromElectrical(nodes, edges);
        expect(r.ok).toBe(true);
        if (r.ok === true) {
            const gates = r.nodes.filter((n) => n.type === 'GATE');
            expect(gates).toHaveLength(1);
            expect((gates[0].data as { gateType: string }).gateType).toBe('OR');
            expect(r.expression).toContain('+');
        }
    });

    it('maps each switch input value to its closed state', () => {
        // In the parallel preset SW1 is closed, SW2 is open.
        const { nodes, edges } = elecOf('parallel');
        const r = deriveLogicFromElectrical(nodes, edges);
        expect(r.ok).toBe(true);
        if (r.ok === true) {
            const inputs = r.nodes.filter((n) => n.type === 'INPUT');
            const values = inputs.map((n) => (n.data as { value: boolean }).value).sort();
            expect(values).toEqual([false, true]);
        }
    });

    it('reports a reason when there is no voltage source', () => {
        const r = deriveLogicFromElectrical([{ id: 'SW1', type: 'SWITCH', position: { x: 0, y: 0 }, data: { label: 'SW1', closed: true } } as never], []);
        expect(r.ok).toBe(false);
        if (r.ok === false) {
            expect(r.reason).toMatch(/source/i);
        }
    });

    it('does not crash when a switch and source are placed but not connected (regression)', () => {
        const nodes = [
            { id: 'V', type: 'VOLTAGE_SOURCE', position: { x: 0, y: 0 }, data: { label: 'V1', voltage: 5 } },
            { id: 'SW', type: 'SWITCH', position: { x: 0, y: 0 }, data: { label: 'SW1', closed: false } },
        ] as never[];
        // No edges — nothing is wired together.
        const r = deriveLogicFromElectrical(nodes, [] as never[]);
        expect(r.ok).toBe(false);
        if (r.ok === false) {
            expect(r.reason.length).toBeGreaterThan(0);
        }
    });
});
