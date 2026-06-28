import { useState } from 'react';
import type { Node, Edge } from 'reactflow';
import type { AnyNodeData, InputNodeData, OutputNodeData } from '../types/circuit';

type Props = {
    selectedNodes: Node<AnyNodeData>[];
    allEdges: Edge[];
    onSave: (name: string, inputLabels: string[], outputLabels: string[]) => void;
    onClose: () => void;
};

// Modal for creating a custom component from the currently selected nodes.
// Detects input/output boundary nodes, auto-populates label fields from
// existing node labels, and lets the user rename them before saving.
export default function CustomComponentModal({ selectedNodes, allEdges, onSave, onClose }: Props) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const selectedIds = new Set(selectedNodes.map((n) => n.id));

    // INPUT nodes in selection become the component's input pins
    const inputNodes = selectedNodes.filter((n) => n.type === 'INPUT');

    // OUTPUT nodes in selection become the component's output pins.
    // If none, fall back to gates that drive edges crossing the boundary.
    const outputNodes = selectedNodes.filter((n) => n.type === 'OUTPUT');

    const [inputLabels, setInputLabels] = useState<string[]>(() => {
        return inputNodes.map((n, i) => {
            const d = n.data as InputNodeData;
            if (d.label) {
                return d.label;
            }
            return String.fromCharCode(65 + i);
        });
    });

    const [outputLabels, setOutputLabels] = useState<string[]>(() => {
        if (outputNodes.length > 0) {
            return outputNodes.map((n, i) => {
                const d = n.data as OutputNodeData;
                if (d.label) {
                    return d.label;
                }
                return `Q${i}`;
            });
        }
        // Count boundary output gates
        const boundaryOutputIds = new Set<string>();
        for (const edge of allEdges) {
            if (selectedIds.has(edge.source) && !selectedIds.has(edge.target)) {
                boundaryOutputIds.add(edge.source);
            }
        }
        return Array.from(boundaryOutputIds).map((_, i) => `Q${i}`);
    });

    function updateInputLabel(index: number, value: string) {
        const updated = [...inputLabels];
        updated[index] = value;
        setInputLabels(updated);
    }

    function updateOutputLabel(index: number, value: string) {
        const updated = [...outputLabels];
        updated[index] = value;
        setOutputLabels(updated);
    }

    function handleSave() {
        if (name.trim() === '') {
            return;
        }
        setSaving(true);
        onSave(name.trim(), inputLabels, outputLabels);
    }

    let saveLabel: string;
    if (saving) {
        saveLabel = 'Saving…';
    } else {
        saveLabel = 'Create Component';
    }

    const canSave =
        !saving &&
        name.trim() !== '' &&
        inputLabels.length > 0 &&
        outputLabels.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="hud w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-xl">
                <div className="gf-label mb-4">Create Custom Component</div>

                <div className="mb-4">
                    <label className="gf-label mb-1 block">Component Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Half Adder"
                        autoFocus
                        className="w-full rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                </div>

                <div className="mb-4">
                    <div className="gf-label mb-2">Input Pins ({inputLabels.length})</div>
                    {inputLabels.length === 0 && (
                        <div className="font-mono text-xs text-muted">
                            No INPUT nodes in selection.
                        </div>
                    )}
                    {inputLabels.map((label, i) => (
                        <div key={i} className="mb-1 flex items-center gap-2">
                            <span className="w-12 font-mono text-xs text-muted">in-{i}</span>
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => updateInputLabel(i, e.target.value)}
                                className="flex-1 rounded border border-line bg-paper px-2 py-1 text-sm text-ink outline-none focus:border-accent"
                            />
                        </div>
                    ))}
                </div>

                <div className="mb-4">
                    <div className="gf-label mb-2">Output Pins ({outputLabels.length})</div>
                    {outputLabels.length === 0 && (
                        <div className="font-mono text-xs text-muted">
                            No OUTPUT nodes or boundary gates detected.
                        </div>
                    )}
                    {outputLabels.map((label, i) => (
                        <div key={i} className="mb-1 flex items-center gap-2">
                            <span className="w-12 font-mono text-xs text-muted">out-{i}</span>
                            <input
                                type="text"
                                value={label}
                                onChange={(e) => updateOutputLabel(i, e.target.value)}
                                className="flex-1 rounded border border-line bg-paper px-2 py-1 text-sm text-ink outline-none focus:border-accent"
                            />
                        </div>
                    ))}
                </div>

                <div className="mb-3 font-mono text-xs text-muted">
                    {selectedNodes.length} nodes selected
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!canSave}
                        className="btn-solid"
                    >
                        {saveLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="btn-line"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}