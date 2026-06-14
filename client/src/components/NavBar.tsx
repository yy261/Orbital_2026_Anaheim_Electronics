import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { signOutUser } from '../firebase/auth';

export default function NavBar() {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    async function handleSignOut() {
        try {
            await signOutUser();
            navigate('/login');
        } catch (err) {
            console.error('Sign out failed:', err);
        }
    }

    let themeGlyph: string;
    let themeTitle: string;
    if (theme === 'dark') {
        themeGlyph = '☀';
        themeTitle = 'Switch to Daylight';
    } else {
        themeGlyph = '☾';
        themeTitle = 'Switch to Night Shift';
    }

    let authArea: ReactNode;
    if (user !== null) {
        let shownName: string;
        if (user.displayName !== null && user.displayName !== '') {
            shownName = user.displayName;
        } else {
            shownName = user.email ?? 'Operator';
        }
        authArea = (
            <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted">{shownName}</span>
                <button type="button" onClick={handleSignOut} className="btn-line">
                    Log out
                </button>
            </div>
        );
    } else {
        authArea = (
            <button type="button" onClick={() => navigate('/login')} className="btn-solid">
                Log in
            </button>
        );
    }

    return (
        <nav
            className="flex items-center justify-between bg-surface px-6 py-3"
            style={{
                borderBottom: '1px solid var(--line)',
                boxShadow: '0 4px 0 -3px var(--line)',
            }}
        >
            <div className="flex items-center gap-8">
                {/* monogram plate + wordmark */}
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-mono text-sm font-semibold text-accent-ink">
                        GF
                    </div>
                    <div className="leading-tight">
                        <div className="font-display text-base font-bold tracking-tight">
                            GateForge
                        </div>
                        <div className="gf-label">Logic Sim &amp; Circuit Builder</div>
                    </div>
                </div>

                <div className="flex gap-6">
                    <StyledNavLink to="/learn">Learn</StyledNavLink>
                    <StyledNavLink to="/build">Build</StyledNavLink>
                    <StyledNavLink to="/circuits">My Circuits</StyledNavLink>
                    <StyledNavLink to="/account">Account</StyledNavLink>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={toggleTheme}
                    title={themeTitle}
                    aria-label={themeTitle}
                    className="btn-line flex h-9 w-9 items-center justify-center !p-0 text-base"
                >
                    {themeGlyph}
                </button>
                {authArea}
            </div>
        </nav>
    );
}

function StyledNavLink({ to, children }: { to: string; children: ReactNode }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => {
                let classes =
                    'relative pb-1 font-mono text-xs uppercase tracking-[0.14em] transition-colors';
                if (isActive) {
                    classes = `${classes} text-accent after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-accent`;
                } else {
                    classes = `${classes} text-muted hover:text-ink`;
                }
                return classes;
            }}
        >
            {children}
        </NavLink>
    );
}