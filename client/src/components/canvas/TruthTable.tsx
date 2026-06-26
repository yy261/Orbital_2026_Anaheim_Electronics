import type { TruthTable } from '../../types/circuit';

export default function TruthTableView({ table }: { table: TruthTable | null }) {
    if (table === null) {
        return (
            <div className="p-4">
                <div className="gf-label mb-2">Truth Table</div>
                <p className="text-sm text-muted">
                    Run <span className="font-semibold text-ink">Simulate</span> to compute
                    the table.
                </p>
            </div>
        );
    }

    if (table.inputIds.length === 0) {
        return (
            <div className="p-4">
                <div className="gf-label mb-2">Truth Table</div>
                <p className="text-sm text-muted">No INPUT nodes — nothing to enumerate.</p>
            </div>
        );
    }

    if (table.outputIds.length === 0) {
        return (
            <div className="p-4">
                <div className="gf-label mb-2">Truth Table</div>
                <p className="text-sm text-muted">No gates — nothing to compute.</p>
            </div>
        );
    }

    function cellText(value: boolean): string {
        if (value === true) {
            return '1';
        }
        return '0';
    }

    function cellClass(value: boolean): string {
        if (value === true) {
            return 'text-accent font-semibold';
        }
        return 'text-muted';
    }

    return (
        <div className="overflow-auto p-4">
            <div className="gf-label mb-3">Truth Table</div>
            <table className="min-w-full border-collapse text-center font-mono text-xs">
                <thead>
                    <tr className="border-b border-line">
                        {table.inputLabels.map((label, i) => {
                            return (
                                <th key={`in-${i}`} className="px-2 py-1.5 font-semibold text-ink">
                                    {label}
                                </th>
                            );
                        })}
                        <th className="px-2 py-1.5 text-line">│</th>
                        {table.outputLabels.map((label, i) => {
                            return (
                                <th key={`out-${i}`} className="px-2 py-1.5 font-semibold text-accent">
                                    {label}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map((row, rIdx) => {
                        return (
                            <tr key={rIdx} className="border-b border-line/50">
                                {row.inputs.map((value, i) => {
                                    return (
                                        <td key={`in-${i}`} className={`px-2 py-1.5 ${cellClass(value)}`}>
                                            {cellText(value)}
                                        </td>
                                    );
                                })}
                                <td className="px-2 py-1.5 text-line">│</td>
                                {row.outputs.map((value, i) => {
                                    return (
                                        <td key={`out-${i}`} className={`px-2 py-1.5 ${cellClass(value)}`}>
                                            {cellText(value)}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}