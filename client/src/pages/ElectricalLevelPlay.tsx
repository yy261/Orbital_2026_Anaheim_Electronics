import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store';
import { markLevelComplete } from '../firebase/firestore';
import {
    ELECTRICAL_LEVELS,
    validateElectrical,
    type ElecValue,
} from '../data/electricalLevels';
import ElectricalPalette from '../components/canvas/ElectricalPalette';
import ElectricalCanvas from '../components/canvas/ElectricalCanvas';
import ElectricalProperties from '../components/canvas/ElectricalProperties';

type ValidationResult =
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'pass' }
    | { status: 'fail'; message: string };

export default function ElectricalLevelPlay() {
    const { levelId } = useParams<{ levelId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const elecNodes = useAppStore((s) => s.elecNodes);
    const elecEdges = useAppStore((s) => s.elecEdges);
    const clearElec = useAppStore((s) => s.clearElec);
    const applyElecResults = useAppStore((s) => s.applyElecResults);

    const [validation, setValidation] = useState<ValidationResult>({ status: 'idle' });

    const level = ELECTRICAL_LEVELS.find((l) => l.id === levelId);
    const levelIndex = ELECTRICAL_LEVELS.findIndex((l) => l.id === levelId);

    // Clear the electrical canvas when entering a new level.
    useEffect(() => {
        clearElec();
        const timer = setTimeout(() => {
            setValidation({ status: 'idle' });
        }, 0);
        return () => clearTimeout(timer);
    }, [levelId, clearElec]);

    if (level === undefined) {
        return (
            <div className="mx-auto max-w-3xl p-8">
                <p className="text-sm text-danger">Level not found.</p>
                <button type="button" onClick={() => navigate('/learn')} className="btn-line mt-4">
                    Back to levels
                </button>
            </div>
        );
    }

    async function handleCheck() {
        if (level === undefined) {
            return;
        }
        if (elecNodes.length === 0) {
            setValidation({ status: 'fail', message: 'Canvas is empty — drop some components first.' });
            return;
        }

        setValidation({ status: 'checking' });

        const payload = {
            nodes: elecNodes.map((n) => {
                const result: Record<string, unknown> = { id: n.id, type: n.type };
                const d = n.data as Record<string, unknown>;
                if (d.voltage !== undefined) {
                    result.voltage = d.voltage;
                }
                if (d.resistance !== undefined) {
                    result.resistance = d.resistance;
                }
                if (d.threshold !== undefined) {
                    result.threshold = d.threshold;
                }
                if (d.closed !== undefined) {
                    result.closed = d.closed;
                }
                return result;
            }),
            edges: elecEdges.map((e) => ({
                source: e.source,
                sourceHandle: e.sourceHandle ?? null,
                target: e.target,
                targetHandle: e.targetHandle ?? null,
            })),
        };

        const base = import.meta.env.VITE_API_BASE_URL || '';

        try {
            const response = await fetch(`${base}/api/simulate/electrical`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (result.ok === false) {
                setValidation({ status: 'fail', message: result.error });
                return;
            }

            const values = result.values as Record<string, ElecValue>;
            applyElecResults(values);

            const outcome = validateElectrical(values, elecNodes, level.goal);
            setValidation(outcome);

            if (outcome.status === 'pass' && user !== null) {
                markLevelComplete(user.uid, level.id).catch((err) => {
                    console.error('Failed to save progress:', err);
                });
            }
        } catch (err) {
            let message = 'Could not reach the simulation backend.';
            if (err instanceof Error) {
                message = err.message;
            }
            setValidation({ status: 'fail', message });
        }
    }

    function handleNextLevel() {
        if (levelIndex < ELECTRICAL_LEVELS.length - 1) {
            navigate(`/learn/electrical/${ELECTRICAL_LEVELS[levelIndex + 1].id}`);
        } else {
            navigate('/learn');
        }
    }

    let checkLabel = 'Check';
    if (validation.status === 'checking') {
        checkLabel = 'Checking…';
    }

    let feedbackArea: React.ReactNode = null;
    if (validation.status === 'pass') {
        let nextLabel = 'Back to Levels';
        if (levelIndex < ELECTRICAL_LEVELS.length - 1) {
            nextLabel = 'Next Level';
        }
        feedbackArea = (
            <div className="rounded-md border border-scope bg-surface p-4">
                <div className="font-display text-sm font-bold text-scope">Correct!</div>
                <p className="mt-1 text-xs text-muted">Your circuit meets the objective.</p>
                <button type="button" onClick={handleNextLevel} className="btn-solid mt-3">
                    {nextLabel}
                </button>
            </div>
        );
    } else if (validation.status === 'fail') {
        feedbackArea = (
            <div className="rounded-md border border-danger bg-surface p-4">
                <div className="font-display text-sm font-bold text-danger">Not quite</div>
                <p className="mt-1 text-xs text-muted">{validation.message}</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Level header */}
            <div className="flex items-center gap-4 border-b border-line bg-surface px-4 py-2.5">
                <button type="button" onClick={() => navigate('/learn')} className="btn-line">
                    ← Levels
                </button>
                <div className="leading-tight">
                    <div className="gf-label">
                        Electrical {String(levelIndex + 1).padStart(2, '0')}
                    </div>
                    <div className="font-display text-sm font-bold tracking-tight">{level.title}</div>
                </div>
                <div className="ml-auto flex gap-2">
                    <button
                        type="button"
                        onClick={handleCheck}
                        disabled={validation.status === 'checking'}
                        className="btn-solid"
                    >
                        {checkLabel}
                    </button>
                    <button type="button" onClick={() => clearElec()} className="btn-line">
                        Clear
                    </button>
                </div>
            </div>

            {/* Main area */}
            <div className="flex flex-1 overflow-hidden">
                <ElectricalPalette />
                <div className="relative flex-1">
                    <ElectricalCanvas />
                </div>

                {/* Objective + feedback panel */}
                <div className="flex w-80 flex-col border-l border-line bg-paper">
                    <div className="space-y-4 overflow-auto p-4">
                        <section>
                            <div className="gf-label mb-2">Objective</div>
                            <p className="text-sm text-ink">{level.objective}</p>
                        </section>

                        <section>
                            <div className="gf-label mb-2">How to check</div>
                            <p className="text-xs text-muted">
                                Build the circuit, then click Check. The circuit is simulated and
                                validated against the objective — click a switch on the canvas to
                                toggle it open or closed.
                            </p>
                        </section>

                        {feedbackArea}

                        <div className="border-t border-line pt-3">
                            <ElectricalProperties />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}