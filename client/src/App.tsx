import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import Build from './pages/Build';
import Learn from './pages/Learn';
import MyCircuits from './pages/MyCircuits';
import Account from './pages/Account';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Top-level layout. NavBar stays mounted, route outlets swap below it.
export default function App() {
    return (
        <div className="flex h-screen flex-col text-ink">
            <NavBar />
            <main className="flex-1 overflow-hidden">
                <Routes>
                    <Route path="/" element={<Navigate to="/learn" replace />} />
                    <Route path="/learn" element={<Learn />} />
                    <Route path="/build" element={<Build />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route
                        path="/circuits"
                        element={
                            <ProtectedRoute>
                                <MyCircuits />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/account" element={<Account />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                </Routes>
            </main>
        </div>
    );
}