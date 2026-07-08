// Unit tests for buildPayload — the client-side serializer that turns the
// React Flow canvas into the backend simulation payload.
//
// Two behaviours matter and are asserted here:
//   1. OUTPUT nodes are frontend-only and must be stripped (the backend only
//      ever sees INPUT and GATE nodes).
//   2. CUSTOM components are flattened into their internal INPUT/GATE sub-graph
//      on the client before the payload is built.
// Pure function — no DOM interaction, no Firebase, no network.

import { describe, it, expect } from 'vitest';
import type { Edge, Node } from 'reactflow';
import { buildPayload } from '../index';
import type { AnyNodeData, CustomComponentDef } from '../../types/circuit';

function node(id: string, type: string, data: object): Node<AnyNodeData> {
    return { id, type, position: { x: 0, y: 0 }, data: data as AnyNodeData };
}

describe('buildPayload — OUTPUT stripping', () => {
    it('keeps INPUT and GATE nodes but removes OUTPUT nodes', () => {
        const nodes = [
            node('a', 'INPUT', { label: 'A', value: true, output: null }),
            node('g', 'GATE', { gateType: 'AND', output: null }),
            node('o', 'OUTPUT', { label: 'Y', output: null }),
        ];
        const edges: Edge[] = [
            { id: 'e1', source: 'a', target: 'g', targetHandle: 'in-0' },
            { id: 'e2', source: 'g', target: 'o' },
        ];

        const payload = buildPayload(nodes, edges, []);

        const ids = payload.nodes.map((n) => n.id).sort();
        expect(ids).toEqual(['a', 'g']);
        for (const n of payload.nodes) {
            expect(['INPUT', 'GATE']).toContain(n.type);
        }
    });
});

describe('buildPayload — custom component expansion', () => {
    it('flattens a custom component into prefixed INPUT/GATE nodes', () => {
        const def: CustomComponentDef = {
            id: 'comp1',
            ownerId: 'u1',
            name: 'MyInverter',
            inputLabels: ['A'],
            outputLabels: ['Y'],
            internalNodes: [
                { id: 'i1', type: 'INPUT', value: false },
                { id: 'g1', type: 'GATE', gateType: 'NOT' },
            ],
            internalEdges: [{ source: 'i1', target: 'g1', targetHandle: 'in-0' }],
            inputNodeIds: ['i1'],
            outputNodeIds: ['g1'],
        };

        const nodes = [
            node('custom1', 'CUSTOM', {
                componentId: 'comp1',
                name: 'MyInverter',
                inputLabels: ['A'],
                outputLabels: ['Y'],
                outputs: {},
            }),
        ];

        const payload = buildPayload(nodes, [], [def]);

        // The custom node itself is gone; its internals appear, id-prefixed.
        const ids = payload.nodes.map((n) => n.id).sort();
        expect(ids).toEqual(['custom1__g1', 'custom1__i1']);
        // Backend only ever sees INPUT / GATE types.
        for (const n of payload.nodes) {
            expect(['INPUT', 'GATE']).toContain(n.type);
        }
        // The internal wiring is carried over, prefixed.
        expect(payload.edges).toContainEqual({
            source: 'custom1__i1',
            target: 'custom1__g1',
            targetHandle: 'in-0',
        });
    });
});