// Unit tests for the electrical-level validator.
// Pure function — no DOM, no Firebase, no network.

import { describe, it, expect } from 'vitest';
import { validateElectrical, ELECTRICAL_LEVELS } from '../electricalLevels';

const nodes = [
    { id: 'V', type: 'VOLTAGE_SOURCE' },
    { id: 'R', type: 'RESISTOR' },
    { id: 'D1', type: 'LED' },
    { id: 'D2', type: 'LED' },
];

describe('validateElectrical', () => {
    it('passes when the single required LED is lit', () => {
        const values = { D1: { voltage: 5, current: 0.05, lit: true } };
        const r = validateElectrical(values, [{ id: 'V', type: 'VOLTAGE_SOURCE' }, { id: 'D1', type: 'LED' }], {
            minLitLeds: 1,
        });
        expect(r.status).toBe('pass');
    });

    it('fails when the LED is not lit', () => {
        const values = { D1: { voltage: 0, current: 0, lit: false } };
        const r = validateElectrical(values, [{ id: 'D1', type: 'LED' }], { minLitLeds: 1 });
        expect(r.status).toBe('fail');
    });

    it('fails when a required component is missing', () => {
        const values = { D1: { voltage: 5, current: 0.05, lit: true } };
        // No resistor present.
        const r = validateElectrical(values, [{ id: 'D1', type: 'LED' }], {
            minLitLeds: 1,
            requireComponents: { RESISTOR: 1 },
        });
        expect(r.status).toBe('fail');
        if (r.status === 'fail') {
            expect(r.message).toMatch(/resistor/i);
        }
    });

    it('allLedsLit fails when only one of two LEDs is lit', () => {
        const values = {
            D1: { voltage: 5, current: 0.05, lit: true },
            D2: { voltage: 0, current: 0, lit: false },
        };
        const r = validateElectrical(values, nodes, { allLedsLit: true, requireComponents: { LED: 2 } });
        expect(r.status).toBe('fail');
    });

    it('allLedsLit passes when both LEDs are lit', () => {
        const values = {
            D1: { voltage: 5, current: 0.05, lit: true },
            D2: { voltage: 5, current: 0.05, lit: true },
        };
        const r = validateElectrical(values, nodes, { allLedsLit: true, requireComponents: { LED: 2 } });
        expect(r.status).toBe('pass');
    });

    it('fails when there is no LED at all', () => {
        const r = validateElectrical({}, [{ id: 'V', type: 'VOLTAGE_SOURCE' }], { minLitLeds: 1 });
        expect(r.status).toBe('fail');
    });

    it('ships six electrical levels with unique ids', () => {
        expect(ELECTRICAL_LEVELS).toHaveLength(6);
        const ids = new Set(ELECTRICAL_LEVELS.map((l) => l.id));
        expect(ids.size).toBe(6);
    });
});