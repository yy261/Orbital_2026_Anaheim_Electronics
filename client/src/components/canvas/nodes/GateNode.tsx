import { Handle, Position, type NodeProps } from 'reactflow';
import type { GateNodeData, GateType } from '../../../types/circuit';

// How many input pins each gate has. NOT is the only single-input gate;
// everything else is binary for now. Multi-input variants are a later idea.
const INPUT_COUNT: Record<GateType, number> = {
    AND: 2,
    OR: 2,
    NAND: 2,
    NOR: 2,
    XOR: 2,
    NOT: 1,
};

// A single gate as it appears on the canvas. The `data` prop is whatever we
// stored on the node in the Zustand store. The Handle components are React
// Flow's connection points — `target` = input, `source` = output.
//
// Output colour reflects the most recent simulation result:
//   data.output === true  -> green border (HIGH)
//   data.output === false -> grey border (LOW)
//   data.output === null  -> grey border (not simulated yet)
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
        borderClass = 'border-blue-500 ring-2 ring-blue-200';
    } else if (isHigh === true) {
        borderClass = 'border-green-500';
    } else {
        borderClass = 'border-gray-400';
    }

    let dotClass: string;
    if (isHigh === true) {
        dotClass = 'bg-green-500';
    } else {
        dotClass = 'bg-gray-300';
    }

    let dotTitle: string;
    if (data.output === null) {
        dotTitle = 'Not simulated';
    } else if (isHigh === true) {
        dotTitle = 'HIGH';
    } else {
        dotTitle = 'LOW';
    }

    return (
        <div
            className={`relative min-w-[88px] rounded-md border-2 bg-white px-5 py-3 text-center shadow-sm ${borderClass}`}
        >
            {/* Input handles, distributed evenly down the left edge. */}
            {Array.from({ length: inputCount }).map((_, i) => {
                // Spread inputs vertically: 1 input -> 50%, 2 inputs -> 33%/66%, etc.
                const topPercent = ((i + 1) * 100) / (inputCount + 1);
                return (
                    <Handle
                        key={`in-${i}`}
                        type="target"
                        position={Position.Left}
                        id={`in-${i}`}
                        style={{ top: `${topPercent}%` }}
                        className="!h-3 !w-3 !border-2 !border-white !bg-gray-600"
                    />
                );
            })}

            <div className="text-sm font-semibold tracking-wide">{data.gateType}</div>

            <div
                className={`mx-auto mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`}
                title={dotTitle}
            />

            <Handle
                type="source"
                position={Position.Right}
                className="!h-3 !w-3 !border-2 !border-white !bg-gray-600"
            />
        </div>
    );
}
