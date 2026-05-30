import { useEffect } from 'react';
import { useAppStore } from '../store';
import GatePalette from '../components/canvas/GatePalette';
import LogicCanvas from '../components/canvas/LogicCanvas';
import TruthTableView from '../components/canvas/TruthTable';

// The Build page layout:
//
//   +------------------------------------------------------------+
//   | Toolbar (Simulate / Clear)                                 |
//   +--------+----------------------------+----------------------+
//   |        |                            |                      |
//   | Gate   |   React Flow canvas        |   Truth table        |
//   | palette|                            |   panel              |
//   |        |                            |                      |
//   +--------+----------------------------+----------------------+
//
// The error banner (if any) sits between the toolbar and the row.
export default function Build() {
    const simulate = useAppStore((s) => s.simulate);
    const clear = useAppStore((s) => s.clear);
    const copySelection = useAppStore((s) => s.copySelection);
    const paste = useAppStore((s) => s.paste);
    const simulating = useAppStore((s) => s.simulating);
    const simulateError = useAppStore((s) => s.simulateError);
    const truthTable = useAppStore((s) => s.truthTable);

    // Ctrl/Cmd+C copies the current selection; Ctrl/Cmd+V pastes at a
    // 40px offset. Attached to the document so the user doesn't have to
    // click into the canvas first, but we still skip the handler when the
    // user is typing in a real input field, otherwise we'd hijack their
    // copy/paste there too.
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

    let simulateLabel: string;
    if (simulating === true) {
        simulateLabel = 'Simulating...';
    } else {
        simulateLabel = 'Simulate';
    }

    return (
        <div className="flex h-full flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
                <button
                    type="button"
                    onClick={() => simulate()}
                    disabled={simulating}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                    {simulateLabel}
                </button>
                <button
                    type="button"
                    onClick={() => clear()}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Clear
                </button>
                <div className="ml-auto text-xs text-gray-400">
                    Drag from the palette · click IN to toggle · Ctrl+C/V to duplicate · Backspace to delete
                </div>
            </div>

            {/* Error banner */}
            {simulateError !== null && (
                <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {simulateError}
                </div>
            )}

            {/* Main row */}
            <div className="flex flex-1 overflow-hidden">
                <GatePalette />
                <div className="flex-1 bg-gray-50">
                    <LogicCanvas />
                </div>
                <div className="w-72 overflow-auto border-l border-gray-200 bg-white">
                    <TruthTableView table={truthTable} />
                </div>
            </div>
        </div>
    );
}
