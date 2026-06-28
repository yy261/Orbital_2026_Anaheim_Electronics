import { Handle, Position, type NodeProps } from 'reactflow';
import type { CustomNodeData } from '../../../types/circuit';

// A user-created reusable component on the logic canvas.
// Input handles on the left, output handles on the right, both
// evenly spaced based on the component definition's label arrays.
export default function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
    const inputCount = data.inputLabels.length;
    const outputCount = data.outputLabels.length;

    let borderClass: string;
    if (selected === true) {
        borderClass = 'border-accent ring-2 ring-accent ring-offset-1 ring-offset-surface';
    } else {
        borderClass = 'border-line';
    }

    const pinStyle = { borderColor: 'var(--surface)', background: 'var(--ink)' };

    return (
        <div
            className={`relative min-w-[110px] rounded-md border-2 border-dashed bg-surface px-5 py-3 text-center shadow-lift ${borderClass}`}
        >
            {data.inputLabels.map((label, i) => {
                const topPercent = ((i + 1) * 100) / (inputCount + 1);
                return (
                    <div key={`in-${i}`}>
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`in-${i}`}
                            style={{ top: `${topPercent}%`, ...pinStyle }}
                            className="!h-3 !w-3 !rounded-full !border-2"
                        />
                        <div
                            className="absolute font-mono text-[9px] text-muted"
                            style={{
                                top: `${topPercent}%`,
                                left: '16px',
                                transform: 'translateY(-50%)',
                            }}
                        >
                            {label}
                        </div>
                    </div>
                );
            })}

            <div className="font-display text-sm font-bold tracking-wide text-ink">
                {data.name}
            </div>
            <div className="gf-label mt-1">CUSTOM</div>

            {data.outputLabels.map((label, i) => {
                const topPercent = ((i + 1) * 100) / (outputCount + 1);
                const isHigh = data.outputs[`out-${i}`] === true;

                let dotClass: string;
                if (isHigh) {
                    dotClass = 'bg-accent shadow-glow';
                } else {
                    dotClass = 'bg-sunken';
                }

                return (
                    <div key={`out-${i}`}>
                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`out-${i}`}
                            style={{ top: `${topPercent}%`, ...pinStyle }}
                            className="!h-3 !w-3 !rounded-full !border-2"
                        />
                        <div
                            className="absolute font-mono text-[9px] text-muted"
                            style={{
                                top: `${topPercent}%`,
                                right: '16px',
                                transform: 'translateY(-50%)',
                                textAlign: 'right',
                            }}
                        >
                            {label}
                        </div>
                        <div
                            className={`absolute h-2 w-2 rounded-full ${dotClass}`}
                            style={{
                                top: `${topPercent}%`,
                                right: '28px',
                                transform: 'translateY(-50%)',
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
}