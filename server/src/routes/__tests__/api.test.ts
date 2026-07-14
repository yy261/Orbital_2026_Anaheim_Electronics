// API / integration tests for the Express simulation routes.
//
// These drive the REAL Express app (app.ts) through HTTP using supertest, so
// they exercise the full request path: routing, JSON body parsing, the
// route-level validation, and the simulation engines behind each endpoint.
//
// They touch NO Firebase and NO network — the server has no database code, so
// these tests pass regardless of Firestore rules or configuration.

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app';

describe('GET /api/health', () => {
    it('reports the service is up', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});

describe('POST /api/simulate (logic)', () => {
    it('simulates a valid AND circuit end to end', async () => {
        const res = await request(app)
            .post('/api/simulate')
            .send({
                nodes: [
                    { id: 'a', type: 'INPUT', value: true },
                    { id: 'b', type: 'INPUT', value: true },
                    { id: 'g', type: 'GATE', gateType: 'AND' },
                ],
                edges: [
                    { source: 'a', target: 'g', targetHandle: 'in-0' },
                    { source: 'b', target: 'g', targetHandle: 'in-1' },
                ],
            });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.values.g).toBe(true);
        expect(res.body.truthTable.rows).toHaveLength(4);
    });

    it('rejects a body missing the nodes/edges arrays with 400', async () => {
        const res = await request(app).post('/api/simulate').send({ foo: 'bar' });
        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
    });

    it('returns ok:false for a circuit containing a cycle', async () => {
        const res = await request(app)
            .post('/api/simulate')
            .send({
                nodes: [
                    { id: 'g1', type: 'GATE', gateType: 'NOT' },
                    { id: 'g2', type: 'GATE', gateType: 'NOT' },
                ],
                edges: [
                    { source: 'g1', target: 'g2', targetHandle: 'in-0' },
                    { source: 'g2', target: 'g1', targetHandle: 'in-0' },
                ],
            });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(false);
    });
});

describe('POST /api/simulate/electrical', () => {
    it('simulates a series source + resistor + LED end to end', async () => {
        const res = await request(app)
            .post('/api/simulate/electrical')
            .send({
                nodes: [
                    { id: 'V', type: 'VOLTAGE_SOURCE', voltage: 5 },
                    { id: 'R', type: 'RESISTOR', resistance: 100 },
                    { id: 'D', type: 'LED', threshold: 0.01 },
                ],
                edges: [
                    { source: 'V', sourceHandle: 'terminal_b', target: 'R', targetHandle: 'terminal_a' },
                    { source: 'R', sourceHandle: 'terminal_b', target: 'D', targetHandle: 'terminal_a' },
                    { source: 'D', sourceHandle: 'terminal_b', target: 'V', targetHandle: 'terminal_a' },
                ],
            });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.values.D.lit).toBe(true);
    });

    it('rejects a body missing the nodes/edges arrays with 400', async () => {
        const res = await request(app).post('/api/simulate/electrical').send({});
        expect(res.status).toBe(400);
        expect(res.body.ok).toBe(false);
    });

    it('returns ok:false when there is no voltage source', async () => {
        const res = await request(app)
            .post('/api/simulate/electrical')
            .send({
                nodes: [{ id: 'R', type: 'RESISTOR', resistance: 100 }],
                edges: [],
            });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(false);
    });
});
