import { useEffect, useState } from 'react';

export default function Learn() {
    const [backendStatus, setBackendStatus] = useState<'pending' | 'ok' | 'down'>(
        'pending'
    );

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

    return (
        <div className="mx-auto max-w-3xl space-y-6 p-8">
            <header>
                <div className="gf-label mb-2">GF-01 // Module Index</div>
                <h1 className="font-display text-3xl font-bold tracking-tight">Learn</h1>
                <p className="mt-2 max-w-prose text-sm text-muted">
                    Structured levels will appear here — guided builds from a single gate
                    up to a half adder. The level system ships in a later phase.
                </p>
            </header>

            <section className="gf-panel hud p-5">
                <div className="gf-label mb-3">Simulation Backend</div>
                <div className="flex items-center gap-2 font-mono text-sm">
                    <span className={`h-2 w-2 rounded-full ${statusDotClass}`} />
                    <span className={statusTextClass}>{statusText}</span>
                </div>
                {backendStatus === 'down' && (
                    <p className="mt-3 text-xs text-muted">
                        The free-tier server sleeps when idle — the first request can take
                        up to a minute to wake it. If this persists locally, make sure{' '}
                        <code className="rounded bg-sunken px-1 font-mono">npm run dev</code>{' '}
                        is running in the <code className="rounded bg-sunken px-1 font-mono">/server</code>{' '}
                        folder.
                    </p>
                )}
            </section>
        </div>
    );
}