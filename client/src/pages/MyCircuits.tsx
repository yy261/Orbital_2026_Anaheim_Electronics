import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store';
import { getUserCircuits, deleteCircuit, type SavedCircuit } from '../firebase/firestore';

export default function MyCircuits() {
    const { user, loading: authLoading } = useAuth();
    const loadCircuit = useAppStore((s) => s.loadCircuit);
    const loadElecCircuit = useAppStore((s) => s.loadElecCircuit);
    const setPendingBuildMode = useAppStore((s) => s.setPendingBuildMode);
    const navigate = useNavigate();

    const [circuits, setCircuits] = useState<SavedCircuit[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch saved circuits when the page loads
    useEffect(() => {
        if (authLoading === true) {
            return;
        }
        if (user === null) {
            setLoading(false);
            return;
        }

        async function fetchCircuits() {
            try {
                const result = await getUserCircuits(user!.uid);
                setCircuits(result);
            } catch (err) {
                console.error('Failed to fetch circuits:', err);
                setError('Could not load saved circuits.');
            }
            setLoading(false);
        }

        fetchCircuits();
    }, [user, authLoading]);

    // Loads a saved circuit onto the correct Build canvas and navigates there.
    // Electrical circuits go to the electrical canvas; the pending-mode flag
    // tells the Build page to open in the matching mode.
    function handleLoad(circuit: SavedCircuit) {
        if (circuit.type === 'electrical') {
            loadElecCircuit(circuit.data.nodes, circuit.data.edges);
            setPendingBuildMode('electrical');
        } else {
            loadCircuit(circuit.data.nodes, circuit.data.edges);
            setPendingBuildMode('logic');
        }
        navigate('/build');
    }

    // Deletes a circuit and removes it from the local list
    async function handleDelete(circuitId: string) {
        try {
            await deleteCircuit(circuitId);
            setCircuits((prev) => prev.filter((c) => c.id !== circuitId));
        } catch (err) {
            console.error('Delete failed:', err);
        }
    }

    // Formats a Firestore timestamp string for display
    function formatDate(isoString: string): string {
        if (isoString === '') {
            return 'Unknown date';
        }
        const date = new Date(isoString);
        return date.toLocaleDateString('en-SG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    if (authLoading === true || loading === true) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted">
                Loading…
            </div>
        );
    }

    if (user === null) {
        return (
            <div className="mx-auto max-w-3xl space-y-4 p-8">
                <div className="gf-label mb-2">GF-03 // Circuit Archive</div>
                <h1 className="font-display text-2xl font-bold tracking-tight">My Circuits</h1>
                <p className="text-sm text-muted">
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="font-medium text-accent hover:underline"
                    >
                        Log in
                    </button>{' '}
                    to save and manage your circuit designs.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-8">
            <header>
                <div className="gf-label mb-2">GF-03 // Circuit Archive</div>
                <h1 className="font-display text-2xl font-bold tracking-tight">My Circuits</h1>
                <p className="mt-1 text-sm text-muted">
                    {circuits.length} saved design{circuits.length !== 1 ? 's' : ''}
                </p>
            </header>

            {error !== null && (
                <div className="rounded-md border border-danger px-3 py-2 text-sm text-danger">
                    {error}
                </div>
            )}

            {circuits.length === 0 && error === null && (
                <div className="gf-panel hud p-6 text-center">
                    <p className="text-sm text-muted">
                        No saved circuits yet. Head to the{' '}
                        <button
                            type="button"
                            onClick={() => navigate('/build')}
                            className="font-medium text-accent hover:underline"
                        >
                            Build page
                        </button>{' '}
                        and create one.
                    </p>
                </div>
            )}

            <div className="space-y-3">
                {circuits.map((circuit) => {
                    return (
                        <div
                            key={circuit.id}
                            className="gf-panel flex items-center justify-between p-4"
                        >
                            <div>
                                <div className="font-display text-sm font-bold text-ink">
                                    {circuit.name}
                                </div>
                                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                                    {circuit.type} · {formatDate(circuit.createdAt)} · {circuit.data.nodes.length} nodes
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleLoad(circuit)}
                                    className="btn-solid"
                                >
                                    Load
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(circuit.id)}
                                    className="btn-line text-danger hover:border-danger"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}