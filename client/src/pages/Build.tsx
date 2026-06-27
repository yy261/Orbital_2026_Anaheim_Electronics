import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { saveCircuit } from '../firebase/firestore';
import GatePalette from '../components/canvas/GatePalette';
import LogicCanvas from '../components/canvas/LogicCanvas';
import TruthTableView from '../components/canvas/TruthTable';
import SaveModal from '../components/SaveModal';

export default function Build() {
    const simulate = useAppStore((s) => s.simulate);
    const clear = useAppStore((s) => s.clear);
    const copySelection = useAppStore((s) => s.copySelection);
    const paste = useAppStore((s) => s.paste);
    const simulating = useAppStore((s) => s.simulating);
    const simulateError = useAppStore((s) => s.simulateError);
    const truthTable = useAppStore((s) => s.truthTable);
    const nodes = useAppStore((s) => s.nodes);
    const edges = useAppStore((s) => s.edges);

    const { user } = useAuth();

    const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    // Keyboard shortcuts for copy/paste
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement;
            const isTextInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable === true;
            if (isTextInput === true) {
                return;
            }

            const isCtrlOrCmd = event.ctrlKey === true || event.metaKey === true;
            if (isCtrlOrCmd === false) {
                return;
            }

            const key = event.key.toLowerCase();
            if (key === 'c') {
                event.preventDefault();
                copySelection();
            } else if (key === 'v') {
                event.preventDefault();
                paste();
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [copySelection, paste]);

    // Clears the save confirmation message after 3 seconds
    useEffect(() => {
        if (saveMessage === null) {
            return;
        }
        const timer = setTimeout(() => setSaveMessage(null), 3000);
        return () => clearTimeout(timer);
    }, [saveMessage]);

    function handleSaveClick() {
        if (user === null) {
            setSaveMessage('Log in to save circuits.');
            return;
        }
        if (nodes.length === 0) {
            setSaveMessage('Canvas is empty — nothing to save.');
            return;
        }
        setShowSaveModal(true);
    }

    async function handleSave(name: string) {
        if (user === null) {
            return;
        }
        setSaving(true);
        try {
            await saveCircuit(user.uid, name, nodes, edges);
            setSaveMessage(`"${name}" saved.`);
            setShowSaveModal(false);
        } catch (err) {
            console.error('Save failed:', err);
            setSaveMessage('Save failed — check the console.');
        }
        setSaving(false);
    }

    let simulateLabel: string;
    if (simulating === true) {
        simulateLabel = 'Simulating…';
    } else {
        simulateLabel = 'Simulate';
    }

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
                <div className="mr-2 leading-tight">
                    <div className="gf-label">GF-02 // Build Console</div>
                    <div className="font-display text-sm font-bold tracking-tight">
                        Logic Workbench
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => simulate()}
                    disabled={simulating}
                    className="btn-solid"
                >
                    {simulateLabel}
                </button>
                <button type="button" onClick={handleSaveClick} className="btn-line">
                    Save
                </button>
                <button type="button" onClick={() => clear()} className="btn-line">
                    Clear
                </button>

                {saveMessage !== null && (
                    <span className="ml-2 font-mono text-xs text-scope">{saveMessage}</span>
                )}

                <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    Drag · click IN to toggle · Ctrl+C/V · Backspace
                </div>
            </div>

            {/* Error banner */}
            {simulateError !== null && (
                <div className="border-b border-danger bg-sunken px-4 py-2 text-sm text-danger">
                    {simulateError}
                </div>
            )}

            {/* Main row */}
            <div className="flex flex-1 overflow-hidden">
                <GatePalette />
                <div className="relative flex-1">
                    <LogicCanvas />
                </div>
                <div className="flex w-72 flex-col border-l border-line bg-paper">
                    <div className="flex-1 overflow-auto">
                        <TruthTableView table={truthTable} />
                    </div>
                    <div className="border-t border-line px-4 py-2 text-[10px] text-muted">
                        Canvas powered by React Flow
                    </div>
                </div>
            </div>

            {/* Save modal */}
            {showSaveModal === true && (
                <SaveModal
                    onSave={handleSave}
                    onClose={() => setShowSaveModal(false)}
                    saving={saving}
                />
            )}
        </div>
    );
}