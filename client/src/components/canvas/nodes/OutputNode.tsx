import { Handle, Position, type NodeProps } from 'reactflow';
import type { OutputNodeData } from '../../../types/circuit';

// A read-only display node. One input handle on the left, no output.
// The "lamp" lights up when the incoming signal is HIGH.
//
// Pre-simulation (output === null): grey, dim.
// After simulation:
//   output === true  -> bright red glow (HIGH, lit)
//   output === false -> dim grey (LOW, off)
//
// We use red rather than green so an OUTPUT lit up is visually distinct
// from a gate showing HIGH. Helps the eye find the "answer" in a busy
// circuit.
export default function OutputNode({ data, selected }: NodeProps<OutputNodeData>) {
    let isHigh: boolean;
    if (data.output === true) {
        isHigh = true;
    } else {
        isHigh = false;
    }

    let lampClass: string;
    if (isHigh === true) {
        // Bright red fill + matching ring to suggest the lamp is "glowing".
        lampClass = 'bg-red-500 shadow-[0_0_12px_3px_rgba(239,68,68,0.6)]';
    } else {
        lampClass = 'bg-gray-300';
    }

    let borderClass: string;
    if (selected === true) {
        borderClass = 'border-blue-500 ring-2 ring-blue-200';
    } else if (isHigh === true) {
        borderClass = 'border-red-500';
    } else {
        borderClass = 'border-gray-400';
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
            className={`relative flex min-w-[88px] flex-col items-center justify-center rounded-md border-2 bg-white px-5 py-3 shadow-sm ${borderClass}`}
        >
            <Handle
                type="target"
                position={Position.Left}
                className="!h-3 !w-3 !border-2 !border-white !bg-gray-600"
            />
            <div className={`h-5 w-5 rounded-full ${lampClass}`} title={stateLabel} />
            <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                {data.label}
            </div>
        </div>
    );
}
