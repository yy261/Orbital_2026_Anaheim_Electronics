import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import type { Edge, Node } from 'reactflow';

export type SavedCircuit = {
    id: string;
    name: string;
    type: 'logic';
    createdAt: string;
    updatedAt: string;
    data: {
        nodes: Node[];
        edges: Edge[];
    };
};

// Saves the current canvas state to Firestore under the user's account
export async function saveCircuit(
    userId: string,
    name: string,
    nodes: Node[],
    edges: Edge[]
): Promise<string> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    const docRef = await addDoc(collection(db, 'circuits'), {
        ownerId: userId,
        name: name,
        type: 'logic',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        data: {
            nodes: JSON.parse(JSON.stringify(nodes)),
            edges: JSON.parse(JSON.stringify(edges)),
        },
    });

    return docRef.id;
}

// Fetches all circuits belonging to a specific user, sorted newest first
export async function getUserCircuits(userId: string): Promise<SavedCircuit[]> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    const q = query(
        collection(db, 'circuits'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const circuits: SavedCircuit[] = [];

    for (const docSnap of snapshot.docs) {
        const d = docSnap.data();
        circuits.push({
            id: docSnap.id,
            name: d.name ?? 'Untitled',
            type: d.type ?? 'logic',
            createdAt: d.createdAt?.toDate?.()?.toISOString?.() ?? '',
            updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() ?? '',
            data: d.data ?? { nodes: [], edges: [] },
        });
    }

    return circuits;
}

// Deletes a circuit document by its Firestore ID
export async function deleteCircuit(circuitId: string): Promise<void> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    await deleteDoc(doc(db, 'circuits', circuitId));
}