// Regression tests for the Firestore persistence fixes, using mocks.
//
// IMPORTANT: these mock the Firebase SDK entirely, so they touch NO live
// Firestore and are completely independent of Firestore security rules. They
// lock in two fixes:
//   1. saveCircuit stores the real circuit type ('logic' | 'electrical'),
//      instead of the old hardcoded 'logic'.
//   2. getUserCircuits sorts newest-first in memory and does NOT use
//      orderBy() — the old where()+orderBy() combination required a Firestore
//      composite index and silently failed without it.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks are hoisted above the imports by Vitest.
vi.mock('../config', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(() => 'COLLECTION'),
    addDoc: vi.fn(async () => ({ id: 'new-id' })),
    getDocs: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(() => 'DOC'),
    query: vi.fn((...args: unknown[]) => ({ args })),
    where: vi.fn(() => 'WHERE'),
    orderBy: vi.fn(() => 'ORDERBY'),
    serverTimestamp: vi.fn(() => 'TS'),
}));

import * as firestore from 'firebase/firestore';
import { saveCircuit, getUserCircuits } from '../firestore';

// Helper: a fake Firestore Timestamp with a toDate() method.
function ts(iso: string) {
    return { toDate: () => new Date(iso) };
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('saveCircuit — type-aware persistence', () => {
    it('stores type "electrical" when saving an electrical circuit', async () => {
        await saveCircuit('user1', 'My Circuit', 'electrical', [], []);
        const written = vi.mocked(firestore.addDoc).mock.calls[0][1] as {
            type: string;
            ownerId: string;
        };
        expect(written.type).toBe('electrical');
        expect(written.ownerId).toBe('user1');
    });

    it('stores type "logic" when saving a logic circuit', async () => {
        await saveCircuit('user1', 'Logic Circuit', 'logic', [], []);
        const written = vi.mocked(firestore.addDoc).mock.calls[0][1] as { type: string };
        expect(written.type).toBe('logic');
    });
});

describe('getUserCircuits — client-side sort, no composite index', () => {
    it('returns circuits newest-first and never calls orderBy()', async () => {
        vi.mocked(firestore.getDocs).mockResolvedValue({
            docs: [
                {
                    id: 'old',
                    data: () => ({
                        ownerId: 'u',
                        name: 'Older',
                        type: 'logic',
                        createdAt: ts('2024-01-01T00:00:00Z'),
                        data: { nodes: [], edges: [] },
                    }),
                },
                {
                    id: 'new',
                    data: () => ({
                        ownerId: 'u',
                        name: 'Newer',
                        type: 'electrical',
                        createdAt: ts('2024-06-01T00:00:00Z'),
                        data: { nodes: [], edges: [] },
                    }),
                },
            ],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);

        const result = await getUserCircuits('u');

        // Sorted newest-first in memory.
        expect(result[0].name).toBe('Newer');
        expect(result[0].type).toBe('electrical');
        expect(result[1].name).toBe('Older');

        // Filters by ownerId, but must NOT use orderBy (that needed an index).
        expect(vi.mocked(firestore.where)).toHaveBeenCalledWith('ownerId', '==', 'u');
        expect(vi.mocked(firestore.orderBy)).not.toHaveBeenCalled();
    });
});
