import { Handle, Position, type NodeProps } from 'reactflow';
import type { GateNodeData, GateType } from '../../../types/circuit';

// Input pin counts per gate. NOT is single-input; the rest are binary.
const INPUT_COUNT: Record<GateType, number> = {
    AND: 2,
    OR: 2,
    NAND: 2,
    NOR: 2,
    XOR: 2,
    NOT: 1,
};

// A gate on the canvas. Output state drives the colour:
//   output === true  -> amber border + lit status dot (HIGH)
//   output === false -> muted border + dim dot (LOW)
//   output === null  -> muted border, dim dot (not simulated yet)
export default function GateNode({ data, selected }: NodeProps<GateNodeData>) {
    const inputCount = INPUT_COUNT[data.gateType] ?? 2;

    let isHigh: boolean;
    if (data.output === true) {
        isHigh = true;
    } else {
        isHigh = false;
    }

    let borderClass: string;
    if (selected === true) {
        borderClass = 'border-accent ring-2 ring-accent ring-offset-1 ring-offset-surface';
    } else if (isHigh === true) {
        borderClass = 'border-accent';
    } else {
        borderClass = 'border-line';
    }

    let dotClass: string;
    if (isHigh === true) {
        dotClass = 'bg-accent shadow-glow';
    } else {
        dotClass = 'bg-sunken';
    }

    let dotTitle: string;
    if (data.output === null) {
        dotTitle = 'Not simulated';
    } else if (isHigh === true) {
        dotTitle = 'HIGH';
    } else {
        dotTitle = 'LOW';
    }

    const pinStyle = { borderColor: 'var(--surface)', background: 'var(--ink)' };

    return (
        <div
            className={`relative min-w-[92px] rounded-md border bg-surface px-5 py-3 text-center shadow-lift ${borderClass}`}
        >
            {Array.from({ length: inputCount }).map((_, i) => {
                const topPercent = ((i + 1) * 100) / (inputCount + 1);
                return (
                    <Handle
                        key={`in-${i}`}
                        type="target"
                        position={Position.Left}
                        id={`in-${i}`}
                        style={{ top: `${topPercent}%`, ...pinStyle }}
                        className="!h-3 !w-3 !rounded-full !border-2"
                    />
                );
            })}

            <div className="font-display text-sm font-bold tracking-wide text-ink">
                {data.gateType}
            </div>

            <div
                className={`mx-auto mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`}
                title={dotTitle}
            />

            <Handle
                type="source"
                position={Position.Right}
                style={pinStyle}
                className="!h-3 !w-3 !rounded-full !border-2"
            />
        </div>
    );
}