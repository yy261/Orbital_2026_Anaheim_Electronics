// Electrical component nodes. All four share the same two-terminal pattern:
// terminal_a on the left (target handle), terminal_b on the right (source handle).
// Wire from one component's terminal_b to the next component's terminal_a to
// form a series circuit. Complete the loop back to the voltage source's terminal_a.

import { Handle, Position, type NodeProps } from 'reactflow';
import type {
    VoltageSourceNodeData,
    ResistorNodeData,
    LEDNodeData,
    SwitchNodeData,
} from '../../../types/circuit';
import { useAppStore } from '../../../store';

const pinStyle = { borderColor: 'var(--surface)', background: 'var(--ink)' };

function Terminals() {
    return (
        <>
            <Handle
                type="target"
                position={Position.Left}
                id="terminal_a"
                style={pinStyle}
                className="!h-3 !w-3 !rounded-full !border-2"
            />
            <Handle
                type="source"
                position={Position.Right}
                id="terminal_b"
                style={pinStyle}
                className="!h-3 !w-3 !rounded-full !border-2"
            />
        </>
    );
}

// DC voltage source. Displays configured voltage and computed current post-simulation.
export function VoltageSourceNode({ data, selected }: NodeProps<VoltageSourceNodeData>) {
    let borderClass: string;
    if (selected === true) {
        borderClass = 'border-accent ring-2 ring-accent ring-offset-1 ring-offset-surface';
    } else {
        borderClass = 'border-line';
    }

    let currentText: string;
    if (data.computedCurrent !== null && data.computedCurrent !== undefined) {
        currentText = `${(data.computedCurrent * 1000).toFixed(1)} mA`;
    } else {
        currentText = '';
    }

    return (
        <div
            className={`relative flex min-w-[100px] flex-col items-center justify-center rounded-md border bg-surface px-4 py-3 shadow-lift ${borderClass}`}
        >
            <Terminals />
            <div className="font-mono text-xs text-muted">−</div>
            <div className="font-display text-sm font-bold text-ink">{data.voltage}V</div>
            <div className="font-mono text-xs text-muted">+</div>
            {currentText !== '' && (
                <div className="mt-1 font-mono text-[10px] text-accent">{currentText}</div>
            )}
            <div className="gf-label mt-1">{data.label}</div>
        </div>
    );
}

// Resistor. Displays resistance and computed voltage drop / current post-simulation.
export function ResistorNode({ data, selected }: NodeProps<ResistorNodeData>) {
    let borderClass: string;
    if (selected === true) {
        borderClass = 'border-accent ring-2 ring-accent ring-offset-1 ring-offset-surface';
    } else {
        borderClass = 'border-line';
    }

    let simInfo: string;
    if (data.computedCurrent !== null && data.computedCurrent !== undefined) {
        const mA = (data.computedCurrent * 1000).toFixed(1);
        const vDrop =
            data.computedVoltage !== null && data.computedVoltage !== undefined
                ? data.computedVoltage.toFixed(2)
                : '0';
        simInfo = `${vDrop}V / ${mA}mA`;
    } else {
        simInfo = '';
    }

    return (
        <div
            className={`relative flex min-w-[100px] flex-col items-center justify-center rounded-md border bg-surface px-4 py-3 shadow-lift ${borderClass}`}
        >
            <Terminals />
            <div className="font-display text-sm font-bold text-ink">{data.resistance}Ω</div>
            {simInfo !== '' && (
                <div className="mt-1 font-mono text-[10px] text-accent">{simInfo}</div>
            )}
            <div className="gf-label mt-1">{data.label}</div>
        </div>
    );
}

// LED. Glows amber when the simulated current exceeds the threshold.
export function LEDNode({ data, selected }: NodeProps<LEDNodeData>) {
    let isLit: boolean;
    if (data.lit === true) {
        isLit = true;
    } else {
        isLit = false;
    }

    let borderClass: string;
    if (selected === true) {
        borderClass = 'border-accent ring-2 ring-accent ring-offset-1 ring-offset-surface';
    } else if (isLit) {
        borderClass = 'border-accent';
    } else {
        borderClass = 'border-line';
    }

    let lampClass: string;
    if (isLit) {
        lampClass = 'bg-accent shadow-glow';
    } else {
        lampClass = 'bg-sunken';
    }

    let simInfo: string;
    if (data.computedCurrent !== null && data.computedCurrent !== undefined) {
        simInfo = `${(data.computedCurrent * 1000).toFixed(1)}mA`;
    } else {
        simInfo = '';
    }

    return (
        <div
            className={`relative flex min-w-[100px] flex-col items-center justify-center rounded-md border bg-surface px-4 py-3 shadow-lift ${borderClass}`}
        >
            <Terminals />
            <div className={`h-5 w-5 rounded-full ${lampClass}`} />
            <div className="mt-1 font-display text-xs font-bold text-ink">LED</div>
            {simInfo !== '' && (
                <div className="mt-1 font-mono text-[10px] text-accent">{simInfo}</div>
            )}
            <div className="gf-label mt-1">{data.label}</div>
        </div>
    );
}

// Switch. Click to toggle open/closed. Visual style mirrors InputNode.
export function SwitchNode({ id, data, selected }: NodeProps<SwitchNodeData>) {
    const toggleSwitch = useAppStore((s) => s.toggleSwitch);

    let stateClass: string;
    let labelText: string;
    if (data.closed === true) {
        stateClass = 'bg-accent text-accent-ink border-accent';
        labelText = 'CLOSED';
    } else {
        stateClass = 'bg-sunken text-muted border-line';
        labelText = 'OPEN';
    }

    let ringClass: string;
    if (selected === true) {
        ringClass = 'ring-2 ring-accent ring-offset-1 ring-offset-surface';
    } else {
        ringClass = '';
    }

    return (
        <div
            onClick={() => toggleSwitch(id)}
            className={`relative flex min-w-[100px] cursor-pointer flex-col items-center justify-center rounded-md border px-4 py-3 font-mono text-sm font-semibold shadow-lift ${stateClass} ${ringClass}`}
        >
            <Handle
                type="target"
                position={Position.Left}
                id="terminal_a"
                style={pinStyle}
                className="!h-3 !w-3 !rounded-full !border-2"
            />
            <div>SW</div>
            <div className="text-[10px] font-normal opacity-80">{labelText}</div>
            <div className="gf-label mt-1">{data.label}</div>
            <Handle
                type="source"
                position={Position.Right}
                id="terminal_b"
                style={pinStyle}
                className="!h-3 !w-3 !rounded-full !border-2"
            />
        </div>
    );
}