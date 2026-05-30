import { useEffect, useState } from 'react';

// Placeholder for the structured levels
// Keeps a small backend health pinger so a new teammate can verify the
// /api connection is live without opening the Build page.
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

    return (
        <div className="space-y-4 p-6">
            <h1 className="text-2xl font-bold">Learn</h1>

            <div className="rounded-md border border-gray-200 bg-white p-4 text-sm">
                <span className="font-medium">Backend health: </span>
                {backendStatus === 'pending' && (
                    <span className="text-gray-500">checking...</span>
                )}
                {backendStatus === 'ok' && <span className="text-green-600">ok</span>}
                {backendStatus === 'down' && (
                    <span className="text-red-600">
                        unreachable &mdash; make sure{' '}
                        <code className="bg-gray-100 px-1">npm run dev</code> is running in the{' '}
                        <code className="bg-gray-100 px-1">/server</code> folder
                    </span>
                )}
            </div>
        </div>
    );
}
