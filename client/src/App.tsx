import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Build from './pages/Build';
import Learn from './pages/Learn';
import MyCircuits from './pages/MyCircuits';
import Account from './pages/Account';

// Top-level layout. NavBar stays mounted, route outlets swap below it.
// Note: Build needs the full canvas viewport, so its own page handles
// horizontal layout (sidebar + canvas + truth-table panel) — App.tsx only
// gives it the vertical real estate.
export default function App() {
    return (
        <div className="flex h-screen flex-col bg-gray-50 text-gray-900">
            <NavBar />
            <main className="flex-1 overflow-hidden">
                <Routes>
                    <Route path="/" element={<Navigate to="/learn" replace />} />
                    <Route path="/learn" element={<Learn />} />
                    <Route path="/build" element={<Build />} />
                    <Route path="/circuits" element={<MyCircuits />} />
                    <Route path="/account" element={<Account />} />
                </Routes>
            </main>
        </div>
    );
}
