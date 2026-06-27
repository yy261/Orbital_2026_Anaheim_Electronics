import { useState } from 'react';

type Props = {
    onSave: (name: string) => void;
    onClose: () => void;
    saving: boolean;
};

// Modal dialog for naming a circuit before saving to Firestore
export default function SaveModal({ onSave, onClose, saving }: Props) {
    const [name, setName] = useState<string>('');

    function handleSave() {
        const trimmed = name.trim();
        if (trimmed === '') {
            return;
        }
        onSave(trimmed);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            handleSave();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    }

    let saveLabel: string;
    if (saving === true) {
        saveLabel = 'Saving…';
    } else {
        saveLabel = 'Save';
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="hud gf-panel w-full max-w-sm p-6">
                <div className="gf-label mb-2">GF-SAVE // Archive Circuit</div>
                <h2 className="mb-4 font-display text-lg font-bold tracking-tight">
                    Save Circuit
                </h2>

                <div className="mb-4">
                    <label className="gf-label mb-1 block">Circuit Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. Half Adder"
                        autoFocus
                        className="w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || name.trim() === ''}
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