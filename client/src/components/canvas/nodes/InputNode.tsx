import { Handle, Position, type NodeProps } from 'reactflow';
import type { InputNodeData } from '../../../types/circuit';
import { useAppStore } from '../../../store';

// A clickable input source. The user toggles it between LOW (false) and
// HIGH (true) by clicking the body. Clicking the React Flow handle on the
// right edge is reserved for drawing wires — those clicks don't bubble.
//
// Sized to match GateNode (min-w-[88px], px-5 py-3) so the canvas looks
// uniform regardless of which node type the user dropped.
//
// Visual state:
//   value === true  -> green fill, "HIGH" label
//   value === false -> grey fill, "LOW" label
export default function InputNode({ id, data, selected }: NodeProps<InputNodeData>) {
    const toggleInput = useAppStore((state) => state.toggleInput);

    let bgClass: string;
    let labelText: string;
    if (data.value === true) {
        bgClass = 'bg-green-500 text-white border-green-600';
        labelText = 'HIGH';
    } else {
        bgClass = 'bg-gray-200 text-gray-700 border-gray-400';
        labelText = 'LOW';
    }

    let ringClass: string;
    if (selected === true) {
        ringClass = 'ring-2 ring-blue-300';
    } else {
        ringClass = '';
    }

    return (
        <div
            onClick={() => toggleInput(id)}
            className={`flex min-w-[88px] cursor-pointer flex-col items-center justify-center rounded-md border-2 px-5 py-3 text-sm font-semibold shadow-sm ${bgClass} ${ringClass}`}
        >
            <div>{data.label}</div>
            <div className="text-[10px] font-normal opacity-80">{labelText}</div>
            <Handle
                type="source"
                position={Position.Right}
                className="!h-3 !w-3 !border-2 !border-white !bg-gray-700"
            />
        </div>
    );
}
