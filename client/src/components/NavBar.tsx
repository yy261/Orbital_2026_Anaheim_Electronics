import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

export default function NavBar() {
    return (
        <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 shadow-sm">
            <div className="flex items-center gap-8">
                <span className="text-lg font-bold tracking-tight text-gray-900">
                    Logic Sim &amp; Circuit Builder
                </span>
                <div className="flex gap-5 text-sm">
                    <StyledNavLink to="/learn">Learn</StyledNavLink>
                    <StyledNavLink to="/build">Build</StyledNavLink>
                    <StyledNavLink to="/circuits">My Circuits</StyledNavLink>
                    <StyledNavLink to="/account">Account</StyledNavLink>
                </div>
            </div>
            <button
                type="button"
                className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
                disabled
                title="Auth arrives in phase 8"
            >
                Log in
            </button>
        </nav>
    );
}

// Wrapper so active links get a visual cue. NavLink already gives us
// isActive, we just translate it into a class string.
function StyledNavLink({ to, children }: { to: string; children: ReactNode }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => {
                let classes: string;
                if (isActive) {
                    classes = 'font-semibold text-gray-900';
                } else {
                    classes = 'text-gray-500 hover:text-gray-900';
                }
                return classes;
            }}
        >
            {children}
        </NavLink>
    );
}
