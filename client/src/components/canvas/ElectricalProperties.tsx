// Properties panel for the electrical canvas.
//
// Shows editable fields for whichever electrical component is currently
// selected, so values are no longer stuck at their hardcoded defaults:
//   - VOLTAGE_SOURCE: source voltage (V)
//   - RESISTOR:       resistance (ohms)
//   - LED:            current threshold to light (A)
// Switch open/closed is toggled by clicking the node itself, so it is shown
// here as read-only status only.

import { useAppStore } from '../../store';
import type {
    VoltageSourceNodeData,
    ResistorNodeData,
    LEDNodeData,
    SwitchNodeData,
} from '../../types/circuit';

export default function ElectricalProperties() {
    const elecNodes = useAppStore((s) => s.elecNodes);
    const updateElecNodeData = useAppStore((s) => s.updateElecNodeData);

    const selected = elecNodes.filter((n) => n.selected === true);

    if (selected.length === 0) {
        return (
            <div className="p-4">
                <div className="gf-label mb-2">Properties</div>
                <div className="font-mono text-xs leading-relaxed text-muted">
                    Select a component to edit its value. Drop a voltage source,
                    resistors, LEDs and switches, then wire terminal_b → terminal_a
                    into a closed loop and press Simulate.
                </div>
            </div>
        );
    }

    if (selected.length > 1) {
        return (
            <div className="p-4">
                <div className="gf-label mb-2">Properties</div>
                <div className="font-mono text-xs text-muted">
                    {selected.length} components selected. Select a single component
                    to edit its value.
                </div>
            </div>
        );
    }

    const node = selected[0];

    function handleNumber(field: string, raw: string) {
        const parsed = parseFloat(raw);
        if (Number.isNaN(parsed) === true) {
            return;
        }
        updateElecNodeData(node.id, { [field]: parsed });
    }

    let body: React.ReactNode;

    if (node.type === 'VOLTAGE_SOURCE') {
        const data = node.data as VoltageSourceNodeData;
        body = (
            <label className="block">
                <span className="gf-label mb-1 block">Voltage (V)</span>
                <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={data.voltage}
                    onChange={(e) => handleNumber('voltage', e.target.value)}
                    className="w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
            </label>
        );
    } else if (node.type === 'RESISTOR') {
        const data = node.data as ResistorNodeData;
        body = (
            <label className="block">
                <span className="gf-label mb-1 block">Resistance (Ω)</span>
                <input
                    type="number"
                    step="10"
                    min="0"
                    value={data.resistance}
                    onChange={(e) => handleNumber('resistance', e.target.value)}
                    className="w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
            </label>
        );
    } else if (node.type === 'LED') {
        const data = node.data as LEDNodeData;
        body = (
            <label className="block">
                <span className="gf-label mb-1 block">Light threshold (A)</span>
                <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={data.threshold}
                    onChange={(e) => handleNumber('threshold', e.target.value)}
                    className="w-full rounded-md border bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-accent"
                />
            </label>
        );
    } else {
        const data = node.data as SwitchNodeData;
        let stateText: string;
        if (data.closed === true) {
            stateText = 'CLOSED';
        } else {
            stateText = 'OPEN';
        }
        body = (
            <div className="font-mono text-xs text-muted">
                Switch is <span className="text-accent">{stateText}</span>. Click the
                switch node on the canvas to toggle it.
            </div>
        );
    }

    let label: string;
    const anyData = node.data as { label?: string };
    if (anyData.label !== undefined) {
        label = anyData.label;
    } else {
        label = node.id;
    }

    let typeText: string;
    if (node.type !== undefined) {
        typeText = node.type.replace('_', ' ');
    } else {
        typeText = 'Component';
    }

    return (
        <div className="p-4">
            <div className="gf-label mb-2">Properties</div>
            <div className="mb-3 font-display text-sm font-bold text-ink">
                {label} · {typeText}
            </div>
            {body}
        </div>
    );
}
