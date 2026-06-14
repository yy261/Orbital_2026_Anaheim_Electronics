import { Handle, Position, type NodeProps } from 'reactflow';
import type { InputNodeData } from '../../../types/circuit';
import { useAppStore } from '../../../store';

export default function InputNode({ id, data, selected }: NodeProps<InputNodeData>) {
    const toggleInput = useAppStore((state) => state.toggleInput);

    let stateClass: string;
    let labelText: string;
    if (data.value === true) {
        stateClass = 'bg-accent text-accent-ink border-accent';
        labelText = 'HIGH';
    } else {
        stateClass = 'bg-sunken text-muted border-line';
        labelText = 'LOW';
    }

    let ringClass: string;
    if (selected === true) {
        ringClass = 'ring-2 ring-accent ring-offset-1 ring-offset-surface';
    } else {
        ringClass = '';
    }

    return (
        <div
            onClick={() => toggleInput(id)}
            className={`flex min-w-[88px] cursor-pointer flex-col items-center justify-center rounded-md border px-5 py-3 font-mono text-sm font-semibold shadow-lift ${stateClass} ${ringClass}`}
        >
            <div>{data.label}</div>
            <div className="text-[10px] font-normal opacity-80">{labelText}</div>
            <Handle
                type="source"
                position={Position.Right}
                className="!h-3 !w-3 !rounded-full !border-2"
                style={{ borderColor: 'var(--surface)', background: 'var(--ink)' }}
            />
        </div>
    );
}