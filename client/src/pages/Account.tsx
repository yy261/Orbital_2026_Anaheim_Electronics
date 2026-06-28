import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signOutUser } from '../firebase/auth';
import { getUserProgress } from '../firebase/firestore';
import { LEVELS } from '../data/levels';

export default function Account() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [completedCount, setCompletedCount] = useState<number>(0);

    useEffect(() => {
        if (user === null) {
            return;
        }
        getUserProgress(user.uid)
            .then((levels) => setCompletedCount(levels.length))
            .catch(() => setCompletedCount(0));
    }, [user]);

    async function handleSignOut() {
        try {
            await signOutUser();
            navigate('/login');
        } catch (err) {
            console.error('Sign out failed:', err);
        }
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted">
                Loading…
            </div>
        );
    }

    if (user === null) {
        return (
            <div className="mx-auto max-w-3xl space-y-4 p-8">
                <div className="gf-label mb-2">GF-04 // Operator Profile</div>
                <h1 className="font-display text-2xl font-bold tracking-tight">Account</h1>
                <p className="text-sm text-muted">
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="font-medium text-accent hover:underline"
                    >
                        Log in
                    </button>{' '}
                    or{' '}
                    <button
                        type="button"
                        onClick={() => navigate('/signup')}
                        className="font-medium text-accent hover:underline"
                    >
                        create an account
                    </button>{' '}
                    to save circuits and track progress.
                </p>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-8">
            <header>
                <div className="gf-label mb-2">GF-04 // Operator Profile</div>
                <h1 className="font-display text-2xl font-bold tracking-tight">Account</h1>
            </header>

            <div className="gf-panel hud p-6">
                <div className="space-y-3">
                    <div>
                        <div className="gf-label">Name</div>
                        <div className="mt-1 text-sm font-medium text-ink">
                            {user.displayName ?? 'No name set'}
                        </div>
                    </div>

                    <div>
                        <div className="gf-label">Email</div>
                        <div className="mt-1 font-mono text-sm text-ink">{user.email}</div>
                    </div>

                    <div>
                        <div className="gf-label">Account Created</div>
                        <div className="mt-1 font-mono text-sm text-ink">
                            {user.metadata.creationTime
                                ? new Date(user.metadata.creationTime).toLocaleDateString()
                                : 'Unknown'}
                        </div>
                    </div>

                    <div>
                        <div className="gf-label">Level Progress</div>
                        <div className="mt-1 font-mono text-sm text-ink">
                            {completedCount} / {LEVELS.length} completed
                        </div>
                    </div>
                </div>

                <div className="mt-6 border-t border-line pt-4">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        className="btn-line"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
}