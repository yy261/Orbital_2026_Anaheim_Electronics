import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getUserProgress } from '../firebase/firestore';
import { LEVELS } from '../data/levels';
import { ELECTRICAL_LEVELS } from '../data/electricalLevels';

export default function Learn() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [completedLevels, setCompletedLevels] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [backendStatus, setBackendStatus] = useState<'pending' | 'ok' | 'down'>('pending');

    // Check backend health
    useEffect(() => {
        const base = import.meta.env.VITE_API_BASE_URL || '';
        fetch(`${base}/api/health`)
            .then((r) => {
                if (r.ok === true) {
                    return r.json();
                }
                return Promise.reject(r);
            })
            .then(() => setBackendStatus('ok'))
            .catch(() => setBackendStatus('down'));
    }, []);

    // Fetch user progress
    useEffect(() => {
        if (authLoading === true) {
            return;
        }
        if (user === null) {
            const timer = setTimeout(() => setLoading(false), 0);
            return () => clearTimeout(timer);
        }

        async function fetchProgress() {
            try {
                const progress = await getUserProgress(user!.uid);
                setCompletedLevels(progress);
            } catch (err) {
                console.error('Failed to fetch progress:', err);
            }
            setLoading(false);
        }

        fetchProgress();
    }, [user, authLoading]);

    // A level is unlocked if it's the first level, or the previous level is completed
    function isUnlocked(index: number): boolean {
        if (index === 0) {
            return true;
        }
        const previousId = LEVELS[index - 1].id;
        return completedLevels.includes(previousId);
    }

    function isCompleted(levelId: string): boolean {
        return completedLevels.includes(levelId);
    }

    // Electrical levels have their own independent unlock chain.
    function isElecUnlocked(index: number): boolean {
        if (index === 0) {
            return true;
        }
        const previousId = ELECTRICAL_LEVELS[index - 1].id;
        return completedLevels.includes(previousId);
    }

    let statusDotClass = 'bg-muted';
    let statusText = 'checking…';
    let statusTextClass = 'text-muted';
    if (backendStatus === 'ok') {
        statusDotClass = 'bg-scope';
        statusText = 'online';
        statusTextClass = 'text-scope';
    }
    if (backendStatus === 'down') {
        statusDotClass = 'bg-danger';
        statusText = 'unreachable';
        statusTextClass = 'text-danger';
    }

    if (authLoading === true || loading === true) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted">
                Loading…
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto max-w-3xl space-y-6 p-8">
            <header>
                <div className="gf-label mb-2">GF-01 // Module Index</div>
                <h1 className="font-display text-3xl font-bold tracking-tight">Learn</h1>
                <p className="mt-2 max-w-prose text-sm text-muted">
                    Work through each level in order. Build the circuit that matches the
                    objective, then click Check to validate. Complete a level to unlock the next.
                </p>
            </header>

            {/* Backend status */}
            <section className="gf-panel hud p-5">
                <div className="gf-label mb-3">Simulation Backend</div>
                <div className="flex items-center gap-2 font-mono text-sm">
                    <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
                    <span className={statusTextClass}>{statusText}</span>
                </div>
                {backendStatus === 'down' && (
                    <p className="mt-3 text-xs text-muted">
                        The backend is needed for level validation. If running locally, start the
                        server with{' '}
                        <code className="rounded bg-sunken px-1 font-mono">npm run dev</code>{' '}
                        in the{' '}
                        <code className="rounded bg-sunken px-1 font-mono">/server</code>{' '}
                        folder.
                    </p>
                )}
            </section>

            {/* Guest prompt */}
            {user === null && (
                <div className="gf-panel p-4 text-sm text-muted">
                    You can try any unlocked level as a guest, but{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="font-medium text-accent hover:underline"
                    >
                        log in
                    </button>{' '}
                    to save your progress.
                </div>
            )}

            {/* Logic level list */}
            <section className="space-y-3">
                <div className="gf-label">Logic Levels</div>
                {LEVELS.map((level, index) => {
                    const unlocked = isUnlocked(index);
                    const completed = isCompleted(level.id);

                    let statusLabel: string;
                    let statusClass: string;
                    if (completed === true) {
                        statusLabel = '✓ Complete';
                        statusClass = 'text-scope';
                    } else if (unlocked === true) {
                        statusLabel = 'Unlocked';
                        statusClass = 'text-accent';
                    } else {
                        statusLabel = 'Locked';
                        statusClass = 'text-muted';
                    }

                    let cardClass: string;
                    if (unlocked === true) {
                        cardClass = 'gf-panel cursor-pointer hover:border-accent transition-colors';
                    } else {
                        cardClass = 'gf-panel opacity-50';
                    }

                    function handleClick() {
                        if (unlocked === true) {
                            navigate(`/learn/${level.id}`);
                        }
                    }

                    return (
                        <div
                            key={level.id}
                            onClick={handleClick}
                            className={`flex items-center justify-between p-4 ${cardClass}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-muted">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="font-display text-sm font-bold text-ink">
                                        {level.title}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-muted">{level.description}</p>
                            </div>
                            <span className={`font-mono text-xs ${statusClass}`}>
                                {statusLabel}
                            </span>
                        </div>
                    );
                })}
            </section>

            {/* Electrical level list */}
            <section className="space-y-3">
                <div className="gf-label">Electrical Levels</div>
                {ELECTRICAL_LEVELS.map((level, index) => {
                    const unlocked = isElecUnlocked(index);
                    const completed = isCompleted(level.id);

                    let statusLabel: string;
                    let statusClass: string;
                    if (completed === true) {
                        statusLabel = '✓ Complete';
                        statusClass = 'text-scope';
                    } else if (unlocked === true) {
                        statusLabel = 'Unlocked';
                        statusClass = 'text-accent';
                    } else {
                        statusLabel = 'Locked';
                        statusClass = 'text-muted';
                    }

                    let cardClass: string;
                    if (unlocked === true) {
                        cardClass = 'gf-panel cursor-pointer hover:border-accent transition-colors';
                    } else {
                        cardClass = 'gf-panel opacity-50';
                    }

                    function handleClick() {
                        if (unlocked === true) {
                            navigate(`/learn/electrical/${level.id}`);
                        }
                    }

                    return (
                        <div
                            key={level.id}
                            onClick={handleClick}
                            className={`flex items-center justify-between p-4 ${cardClass}`}
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-muted">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <span className="font-display text-sm font-bold text-ink">
                                        {level.title}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-muted">{level.description}</p>
                            </div>
                            <span className={`font-mono text-xs ${statusClass}`}>
                                {statusLabel}
                            </span>
                        </div>
                    );
                })}
            </section>
            </div>
        </div>
    );
}