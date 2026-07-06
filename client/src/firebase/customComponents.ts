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
import type { CustomComponentDef, SimulatePayloadNode, SimulatePayloadEdge } from '../types/circuit';

// Saves a new custom component definition to Firestore under the user's account
export async function saveCustomComponent(
    userId: string,
    name: string,
    inputLabels: string[],
    outputLabels: string[],
    internalNodes: SimulatePayloadNode[],
    internalEdges: SimulatePayloadEdge[],
    inputNodeIds: string[],
    outputNodeIds: string[]
): Promise<string> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    const docRef = await addDoc(collection(db, 'customComponents'), {
        ownerId: userId,
        name: name,
        inputLabels: inputLabels,
        outputLabels: outputLabels,
        internalNodes: JSON.parse(JSON.stringify(internalNodes)),
        internalEdges: JSON.parse(JSON.stringify(internalEdges)),
        inputNodeIds: inputNodeIds,
        outputNodeIds: outputNodeIds,
        createdAt: serverTimestamp(),
    });

    return docRef.id;
}

// Fetches all custom components belonging to a user, sorted newest first.
//
// As with getUserCircuits, the query filters on ownerId only and sorts in
// memory. Combining where('ownerId') with orderBy('createdAt') would demand a
// Firestore composite index; without it the fetch throws and (because the
// caller previously swallowed the error) the components silently never load.
export async function getUserCustomComponents(userId: string): Promise<CustomComponentDef[]> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    const q = query(collection(db, 'customComponents'), where('ownerId', '==', userId));

    const snapshot = await getDocs(q);

    type Entry = { def: CustomComponentDef; createdAtMillis: number };
    const entries: Entry[] = [];

    for (const docSnap of snapshot.docs) {
        const d = docSnap.data();
        let createdAtMillis: number;
        const asMillis = d.createdAt?.toMillis?.();
        if (typeof asMillis === 'number') {
            createdAtMillis = asMillis;
        } else {
            createdAtMillis = 0;
        }
        entries.push({
            createdAtMillis: createdAtMillis,
            def: {
                id: docSnap.id,
                ownerId: d.ownerId ?? '',
                name: d.name ?? 'Unnamed',
                inputLabels: d.inputLabels ?? [],
                outputLabels: d.outputLabels ?? [],
                internalNodes: d.internalNodes ?? [],
                internalEdges: d.internalEdges ?? [],
                inputNodeIds: d.inputNodeIds ?? [],
                outputNodeIds: d.outputNodeIds ?? [],
            },
        });
    }

    // Newest first.
    entries.sort((a, b) => b.createdAtMillis - a.createdAtMillis);

    return entries.map((e) => e.def);
}

// Removes a custom component from Firestore
export async function deleteCustomComponent(componentId: string): Promise<void> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }
    await deleteDoc(doc(db, 'customComponents', componentId));
}
