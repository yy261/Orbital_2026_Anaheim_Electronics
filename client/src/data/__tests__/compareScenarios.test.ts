// Unit tests for the Compare-page preset scenarios.
//
// These prove the fix for the "Compare does nothing" bug: each non-free
// scenario must build BOTH an electrical circuit and its logic-gate equivalent.
// Pure data/logic — no DOM, no Firebase, no network.

import { describe, it, expect } from 'vitest';
import { SCENARIOS } from '../compareScenarios';

function scenario(id: string) {
    const s = SCENARIOS.find((x) => x.id === id);
    if (s === undefined) {
        throw new Error(`scenario ${id} not found`);
    }
    return s;
}

describe('compare scenarios', () => {
    it('offers free build plus the three equivalence presets', () => {
        const ids = SCENARIOS.map((s) => s.id);
        expect(ids).toEqual(['free', 'switch_led', 'series', 'parallel']);
    });

    it('free build has no circuits to load', () => {
        expect(scenario('free').build).toBeNull();
    });

    it('switch → LED builds a source+switch+LED loop and a buffer (INPUT → OUTPUT)', () => {
        const c = scenario('switch_led').build!();
        const elecTypes = c.elecNodes.map((n) => n.type);
        expect(elecTypes).toContain('VOLTAGE_SOURCE');
        expect(elecTypes).toContain('SWITCH');
        expect(elecTypes).toContain('LED');
        // Logic equivalent: a single input driving an output, no gate.
        const logicTypes = c.logicNodes.map((n) => n.type);
        expect(logicTypes).toContain('INPUT');
        expect(logicTypes).toContain('OUTPUT');
        expect(logicTypes).not.toContain('GATE');
        expect(c.logicEdges.length).toBeGreaterThan(0);
    });

    it('two switches in series build an AND equivalent', () => {
        const c = scenario('series').build!();
        const switches = c.elecNodes.filter((n) => n.type === 'SWITCH');
        expect(switches).toHaveLength(2);
        const gate = c.logicNodes.find((n) => n.type === 'GATE');
        expect(gate).toBeDefined();
        expect((gate!.data as { gateType: string }).gateType).toBe('AND');
    });

    it('two switches in parallel build an OR equivalent', () => {
        const c = scenario('parallel').build!();
        const switches = c.elecNodes.filter((n) => n.type === 'SWITCH');
        expect(switches).toHaveLength(2);
        const gate = c.logicNodes.find((n) => n.type === 'GATE');
        expect(gate).toBeDefined();
        expect((gate!.data as { gateType: string }).gateType).toBe('OR');
    });

    it('every built electrical circuit contains exactly one voltage source', () => {
        for (const s of SCENARIOS) {
            if (s.build === null) {
                continue;
            }
            const sources = s.build().elecNodes.filter((n) => n.type === 'VOLTAGE_SOURCE');
            expect(sources).toHaveLength(1);
        }
    });
});
