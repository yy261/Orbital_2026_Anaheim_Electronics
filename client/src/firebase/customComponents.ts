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

// Fetches all custom components belonging to a user, sorted newest first
export async function getUserCustomComponents(userId: string): Promise<CustomComponentDef[]> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }

    const q = query(
        collection(db, 'customComponents'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const components: CustomComponentDef[] = [];

    for (const docSnap of snapshot.docs) {
        const d = docSnap.data();
        components.push({
            id: docSnap.id,
            ownerId: d.ownerId ?? '',
            name: d.name ?? 'Unnamed',
            inputLabels: d.inputLabels ?? [],
            outputLabels: d.outputLabels ?? [],
            internalNodes: d.internalNodes ?? [],
            internalEdges: d.internalEdges ?? [],
            inputNodeIds: d.inputNodeIds ?? [],
            outputNodeIds: d.outputNodeIds ?? [],
        });
    }

    return components;
}

// Removes a custom component from Firestore
export async function deleteCustomComponent(componentId: string): Promise<void> {
    if (db === undefined) {
        throw new Error('Firestore is not initialised. Check your .env file.');
    }
    await deleteDoc(doc(db, 'customComponents', componentId));
}