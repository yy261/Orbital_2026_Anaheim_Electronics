import { Handle, Position, type NodeProps } from 'reactflow';
import type { OutputNodeData } from '../../../types/circuit';

// A read-only display lamp. One input handle, no output.
// Lit (amber disc + glow ring) when the incoming signal is HIGH, dim otherwise.
// Pre-simulation (output === null) it stays dim with a dash label.
export default function OutputNode({ data, selected }: NodeProps<OutputNodeData>) {
    let isHigh: boolean;
    if (data.output === true) {
        isHigh = true;
    } else {
        isHigh = false;
    }

    let lampClass: string;
    if (isHigh === true) {
        lampClass = 'bg-accent shadow-glow';
    } else {
        lampClass = 'bg-sunken';
    }

    let borderClass: string;
    if (selected === true) {
        borderClass = 'border-accent ring-2 ring-accent ring-offset-1 ring-offset-surface';
    } else if (isHigh === true) {
        borderClass = 'border-accent';
    } else {
        borderClass = 'border-line';
    }

    let stateLabel: string;
    if (data.output === null) {
        stateLabel = '—';
    } else if (isHigh === true) {
        stateLabel = 'HIGH';
    } else {
        stateLabel = 'LOW';
    }

    return (
        <div
            className={`relative flex min-w-[88px] flex-col items-center justify-center rounded-md border bg-surface px-5 py-3 shadow-lift ${borderClass}`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!h-3 !w-3 !rounded-full !border-2"
                style={{ borderColor: 'var(--surface)', background: 'var(--ink)' }}
            />
            <div className={`h-5 w-5 rounded-full ${lampClass}`} title={stateLabel} />
            <div className="gf-label mt-1">{data.label}</div>
        </div>
    );
}