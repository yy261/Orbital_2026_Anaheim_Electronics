import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signUpWithEmail, signInWithGoogle, getFirebaseErrorMessage } from '../firebase/auth';

export default function Signup() {
    const navigate = useNavigate();
    const location = useLocation();

    const [displayName, setDisplayName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirm, setConfirm] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [googleLoading, setGoogleLoading] = useState<boolean>(false);

    let from: string;
    const state = location.state as { from?: { pathname: string } } | null;
    if (state !== null && state.from !== undefined) {
        from = state.from.pathname;
    } else {
        from = '/learn';
    }

    async function handleSignup() {
        if (displayName.trim() === '') {
            setError('Enter your name.');
            return;
        }
        if (email.trim() === '') {
            setError('Enter your email.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await signUpWithEmail(email.trim(), password, displayName.trim());
            navigate(from, { replace: true });
        } catch (err: unknown) {
            let code = '';
            if (err !== null && typeof err === 'object' && 'code' in err) {
                code = String((err as { code: unknown }).code);
            }
            setError(getFirebaseErrorMessage(code));
            setLoading(false);
        }
    }

    async function handleGoogleSignup() {
        setGoogleLoading(true);
        setError(null);

        try {
            await signInWithGoogle();
            navigate(from, { replace: true });
        } catch (err: unknown) {
            let code = '';
            if (err !== null && typeof err === 'object' && 'code' in err) {
                code = String((err as { code: unknown }).code);
            }
            setError(getFirebaseErrorMessage(code));
            setGoogleLoading(false);
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            handleSignup();
        }
    }

    let signupLabel: string;
    if (loading === true) {
        signupLabel = 'Creating account…';
    } else {
        signupLabel = 'Create account';
    }

    let googleLabel: string;
    if (googleLoading === true) {
        googleLabel = 'Connecting…';
    } else {
        googleLabel = 'Continue with Google';
    }

    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="hud gf-panel w-full max-w-sm p-8">
                <div className="gf-label mb-2">GF-ACCESS // New Operator</div>
                <h1 className="mb-1 font-display text-2xl font-bold tracking-tight">
                    Create account
                </h1>
                <p className="mb-6 text-sm text-muted">
                    Sign up to save circuits and track your progress.
                </p>

                {error !== null && (
                    <div className="mb-4 rounded-md border border-danger px-3 py-2 text-sm text-danger">
                        {error}
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="gf-label mb-1 block">Name</label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Your name"
                            className="w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                        />
                    </div>

                    <div>
                        <label className="gf-label mb-1 block">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="you@example.com"
                            className="w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                        />
                    </div>

                    <div>
                        <label className="gf-label mb-1 block">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="At least 6 characters"
                            className="w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                        />
                    </div>

                    <div>
                        <label className="gf-label mb-1 block">Confirm password</label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="••••••••"
                            className="w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSignup}
                        disabled={loading}
                        className="btn-solid w-full"
                    >
                        {signupLabel}
                    </button>

                    <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-line" />
                        <span className="gf-label">or</span>
                        <div className="h-px flex-1 bg-line" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleSignup}
                        disabled={googleLoading}
                        className="btn-line w-full"
                    >
                        {googleLabel}
                    </button>
                </div>

                <p className="mt-6 text-center text-sm text-muted">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-accent hover:underline">
                        Log in
                    </Link>
                </p>
                <p className="mt-2 text-center text-sm">
                    <Link to="/build" className="gf-label hover:text-ink">
                        Continue as guest
                    </Link>
                </p>
            </div>
        </div>
    );
}