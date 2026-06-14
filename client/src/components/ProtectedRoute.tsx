import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

type Props = {
    children: ReactNode;
};

export default function ProtectedRoute({ children }: Props) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted">
                Loading…
            </div>
        );
    }

    if (user === null) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}