import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store';
import { markLevelComplete } from '../firebase/firestore';
import { LEVELS, type ExpectedRow } from '../data/levels';
import GatePalette from '../components/canvas/GatePalette';
import LogicCanvas from '../components/canvas/LogicCanvas';
import type { TruthTable } from '../types/circuit';

type ValidationResult =
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'pass' }
    | { status: 'fail'; message: string };

export default function LevelPlay() {
    const { levelId } = useParams<{ levelId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const simulate = useAppStore((s) => s.simulate);
    const clear = useAppStore((s) => s.clear);
    const truthTable = useAppStore((s) => s.truthTable);
    const simulating = useAppStore((s) => s.simulating);
    const simulateError = useAppStore((s) => s.simulateError);
    const nodes = useAppStore((s) => s.nodes);

    const [validation, setValidation] = useState<ValidationResult>({ status: 'idle' });
    const [hasChecked, setHasChecked] = useState<boolean>(false);

    const level = LEVELS.find((l) => l.id === levelId);
    const levelIndex = LEVELS.findIndex((l) => l.id === levelId);

    // Clear the canvas when entering a new level
    useEffect(() => {
        clear();
        const timer = setTimeout(() => {
            setValidation({ status: 'idle' });
            setHasChecked(false);
        }, 0);
        return () => clearTimeout(timer);
    }, [levelId, clear]);

    // Validate the truth table after simulation completes
    useEffect(() => {
        if (hasChecked === false) {
            return;
        }
        if (simulating === true) {
            return;
        }
        if (truthTable === null) {
            if (simulateError !== null) {
                const timer = setTimeout(() => {
                    setValidation({ status: 'fail', message: simulateError });
                }, 0);
                return () => clearTimeout(timer);
            }
            return;
        }
        if (level === undefined) {
            return;
        }

        const result = compareTruthTable(truthTable, level.expectedRows, level.outputCount);

        const timer = setTimeout(() => {
            setValidation(result);
        }, 0);

        if (result.status === 'pass' && user !== null) {
            markLevelComplete(user.uid, level.id).catch((err) => {
                console.error('Failed to save progress:', err);
            });
        }

        return () => clearTimeout(timer);
    }, [truthTable, simulating, simulateError, hasChecked, level, user]);
    
    if (level === undefined) {
        return (
            <div className="mx-auto max-w-3xl p-8">
                <p className="text-sm text-danger">Level not found.</p>
                <button
                    type="button"
                    onClick={() => navigate('/learn')}
                    className="btn-line mt-4"
                >
                    Back to levels
                </button>
            </div>
        );
    }

    async function handleCheck() {
        if (nodes.length === 0) {
            setValidation({ status: 'fail', message: 'Canvas is empty — build your circuit first.' });
            return;
        }
        setValidation({ status: 'checking' });
        setHasChecked(true);
        await simulate();
    }

    function handleNextLevel() {
        if (levelIndex < LEVELS.length - 1) {
            const nextId = LEVELS[levelIndex + 1].id;
            navigate(`/learn/${nextId}`);
        } else {
            navigate('/learn');
        }
    }

    let checkLabel: string;
    if (simulating === true) {
        checkLabel = 'Checking…';
    } else {
        checkLabel = 'Check';
    }

    let feedbackArea: React.ReactNode;
    if (validation.status === 'pass') {
        feedbackArea = (
            <div className="rounded-md border border-scope bg-surface p-4">
                <div className="font-display text-sm font-bold text-scope">Correct!</div>
                <p className="mt-1 text-xs text-muted">
                    Your circuit matches the expected truth table.
                </p>
                <button type="button" onClick={handleNextLevel} className="btn-solid mt-3">
                    {levelIndex < LEVELS.length - 1 ? 'Next Level' : 'Back to Levels'}
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
    } else {
        feedbackArea = null;
    }

    return (
        <div className="flex h-full flex-col">
            {/* Level header */}
            <div className="flex items-center gap-4 border-b border-line bg-surface px-4 py-2.5">
                <button
                    type="button"
                    onClick={() => navigate('/learn')}
                    className="btn-line"
                >
                    ← Levels
                </button>
                <div className="leading-tight">
                    <div className="gf-label">
                        Level {String(levelIndex + 1).padStart(2, '0')}
                    </div>
                    <div className="font-display text-sm font-bold tracking-tight">
                        {level.title}
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <button
                        type="button"
                        onClick={handleCheck}
                        disabled={simulating}
                        className="btn-solid"
                    >
                        {checkLabel}
                    </button>
                    <button type="button" onClick={() => clear()} className="btn-line">
                        Clear
                    </button>
                </div>
            </div>

            {/* Main area */}
            <div className="flex flex-1 overflow-hidden">
                <GatePalette />
                <div className="relative flex-1">
                    <LogicCanvas />
                </div>

                {/* Objective + feedback panel */}
                <div className="flex w-80 flex-col border-l border-line bg-paper">
                    <div className="space-y-4 overflow-auto p-4">
                        {/* Objective */}
                        <section>
                            <div className="gf-label mb-2">Objective</div>
                            <p className="text-sm text-ink">{level.objective}</p>
                        </section>

                        {/* Expected truth table */}
                        <section>
                            <div className="gf-label mb-2">Expected Output</div>
                            <table className="min-w-full border-collapse text-center font-mono text-xs">
                                <thead>
                                    <tr className="border-b border-line">
                                        {Array.from({ length: level.inputCount }).map((_, i) => {
                                            return (
                                                <th key={`in-${i}`} className="px-2 py-1.5 font-semibold text-ink">
                                                    {String.fromCharCode(65 + i)}
                                                </th>
                                            );
                                        })}
                                        <th className="px-2 py-1.5 text-line">│</th>
                                        {Array.from({ length: level.outputCount }).map((_, i) => {
                                            return (
                                                <th key={`out-${i}`} className="px-2 py-1.5 font-semibold text-accent">
                                                    Y{i + 1}
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {level.expectedRows.map((row, rIdx) => {
                                        return (
                                            <tr key={rIdx} className="border-b border-line/50">
                                                {row.inputs.map((val, i) => {
                                                    return (
                                                        <td key={`in-${i}`} className={`px-2 py-1.5 ${val === true ? 'text-accent font-semibold' : 'text-muted'}`}>
                                                            {val === true ? '1' : '0'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-2 py-1.5 text-line">│</td>
                                                {row.outputs.map((val, i) => {
                                                    return (
                                                        <td key={`out-${i}`} className={`px-2 py-1.5 ${val === true ? 'text-accent font-semibold' : 'text-muted'}`}>
                                                            {val === true ? '1' : '0'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </section>

                        {/* Feedback */}
                        {feedbackArea}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Compares the simulated truth table against the expected rows.
// Returns pass or fail with a message explaining the mismatch.
function compareTruthTable(
    actual: TruthTable,
    expectedRows: ExpectedRow[],
    expectedOutputCount: number
): ValidationResult {
    if (actual.inputIds.length === 0) {
        return { status: 'fail', message: 'No INPUT nodes found. Add inputs to your circuit.' };
    }

    if (actual.outputIds.length === 0) {
        return { status: 'fail', message: 'No output gates found. Connect your gates so the circuit produces an output.' };
    }

    if (actual.outputIds.length !== expectedOutputCount) {
        return {
            status: 'fail',
            message: `Expected ${expectedOutputCount} output(s) but your circuit has ${actual.outputIds.length}. Check your wiring.`,
        };
    }

    if (actual.rows.length !== expectedRows.length) {
        return {
            status: 'fail',
            message: `Expected ${expectedRows.length} rows in the truth table but got ${actual.rows.length}. Make sure you have the right number of inputs.`,
        };
    }

    for (let i = 0; i < expectedRows.length; i++) {
        const expected = expectedRows[i];
        const got = actual.rows[i];

        let outputsMatch = true;
        for (let j = 0; j < expected.outputs.length; j++) {
            if (got.outputs[j] !== expected.outputs[j]) {
                outputsMatch = false;
                break;
            }
        }

        if (outputsMatch === false) {
            const inputStr = expected.inputs.map((v) => {
                if (v === true) {
                    return '1';
                }
                return '0';
            }).join(', ');
            const expectedStr = expected.outputs.map((v) => {
                if (v === true) {
                    return '1';
                }
                return '0';
            }).join(', ');
            const gotStr = got.outputs.map((v) => {
                if (v === true) {
                    return '1';
                }
                return '0';
            }).join(', ');

            return {
                status: 'fail',
                message: `Row with inputs [${inputStr}]: expected output [${expectedStr}] but got [${gotStr}].`,
            };
        }
    }

    return { status: 'pass' };
}