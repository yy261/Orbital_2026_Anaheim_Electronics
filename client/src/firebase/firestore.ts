import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Edge, Node } from 'reactflow';

// A saved circuit can belong to either the logic canvas or the electrical
// canvas. The `type` field records which, so it is loaded back onto the
// correct canvas (see MyCircuits.handleLoad).
export type CircuitType = 'logic' | 'electrical';

export type SavedCircuit = {
    id: string;
    name: string;
    type: CircuitType;
    createdAt: string;
    updatedAt: string;
    data: {
        nodes: Node[];
        edges: Edge[];
    };
};

// Saves the current canvas state to Firestore under the user's account.
// `type` distinguishes a logic build from an electrical one.
export async function saveCircuit(
    userId: string,
    name: string,
    type: CircuitType,
    nodes: Node[],
    edges: Edge[]
): Promise<string> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    const docRef = await addDoc(collection(db, 'circuits'), {
        ownerId: userId,
        name: name,
        type: type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        data: {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
        },
    });

    return docRef.id;
}

// Fetches all circuits belonging to a specific user, sorted newest first.
//
// The query filters on ownerId only. Sorting is done in memory rather than
// with orderBy('createdAt') because combining a where() on one field with an
// orderBy() on another requires a Firestore composite index — without that
// index the query throws FAILED_PRECONDITION and the whole page appears
// broken. Sorting client-side removes that external dependency entirely.
export async function getUserCircuits(userId: string): Promise<SavedCircuit[]> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    const q = query(collection(db, 'circuits'), where('ownerId', '==', userId));

    const snapshot = await getDocs(q);
    const circuits: SavedCircuit[] = [];

    for (const docSnap of snapshot.docs) {
        const d = docSnap.data();
        let savedType: CircuitType;
        if (d.type === 'electrical') {
            savedType = 'electrical';
        } else {
            savedType = 'logic';
        }
        circuits.push({
            id: docSnap.id,
            name: d.name ?? 'Untitled',
            type: savedType,
            createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? '',
            updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() ?? '',
            data: d.data ?? { nodes: [], edges: [] },
        });
    }

    // Newest first. Empty createdAt (a write whose serverTimestamp has not yet
    // resolved) sorts last.
    circuits.sort((a, b) => {
        if (a.createdAt === b.createdAt) {
            return 0;
        }
        if (a.createdAt === '') {
            return 1;
        }
        if (b.createdAt === '') {
            return -1;
        }
        if (a.createdAt > b.createdAt) {
            return -1;
        }
        return 1;
    });

    return circuits;
}

// Deletes a circuit document by its Firestore ID
export async function deleteCircuit(circuitId: string): Promise<void> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    await deleteDoc(doc(db, 'circuits', circuitId));
}

// Fetches the list of completed level IDs for a user
export async function getUserProgress(userId: string): Promise<string[]> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    const docRef = doc(db, 'progress', userId);
    const { getDoc } = await import('firebase/firestore');
    const snapshot = await getDoc(docRef);

    if (snapshot.exists() === false) {
        return [];
    }

    const data = snapshot.data();
    if (Array.isArray(data.completedLevels)) {
        return data.completedLevels as string[];
    }
    return [];
}

// Marks a level as complete for a user
export async function markLevelComplete(userId: string, levelId: string): Promise<void> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    const { getDoc, setDoc, arrayUnion } = await import('firebase/firestore');
    const docRef = doc(db, 'progress', userId);
    const snapshot = await getDoc(docRef);

    if (snapshot.exists() === false) {
        await setDoc(docRef, {
            completedLevels: [levelId],
            lastUpdated: serverTimestamp(),
        });
    } else {
        await setDoc(
            docRef,
            {
                completedLevels: arrayUnion(levelId),
                lastUpdated: serverTimestamp(),
            },
            { merge: true }
        );
    }
}
