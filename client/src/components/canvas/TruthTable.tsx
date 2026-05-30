import type { TruthTable } from '../../types/circuit';

// Renders the truth table that comes back from /api/simulate.
// Hidden until the user has simulated at least once and the circuit is valid.
export default function TruthTableView({ table }: { table: TruthTable | null }) {
    if (table === null) {
        return (
            <div className="p-3 text-sm text-gray-500">
                Click <span className="font-semibold">Simulate</span> to compute the truth table.
            </div>
        );
    }

    if (table.inputIds.length === 0) {
        return (
            <div className="p-3 text-sm text-gray-500">
                No INPUT nodes on the canvas — nothing to enumerate.
            </div>
        );
    }

    if (table.outputIds.length === 0) {
        return (
            <div className="p-3 text-sm text-gray-500">
                No gates on the canvas — nothing to compute.
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
            return 'bg-green-50 text-green-700 font-semibold';
        }
        return 'text-gray-500';
    }

    return (
        <div className="overflow-auto p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Truth Table
            </div>
            <table className="min-w-full border-collapse text-center text-xs">
                <thead>
                    <tr className="border-b border-gray-300">
                        {table.inputLabels.map((label, i) => {
                            return (
                                <th
                                    key={`in-${i}`}
                                    className="px-2 py-1 font-semibold text-gray-700"
                                >
                                    {label}
                                </th>
                            );
                        })}
                        <th className="px-2 py-1 text-gray-300">|</th>
                        {table.outputLabels.map((label, i) => {
                            return (
                                <th
                                    key={`out-${i}`}
                                    className="px-2 py-1 font-semibold text-gray-700"
                                >
                                    {label}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {table.rows.map((row, rIdx) => {
                        return (
                            <tr key={rIdx} className="border-b border-gray-100">
                                {row.inputs.map((value, i) => {
                                    return (
                                        <td
                                            key={`in-${i}`}
                                            className={`px-2 py-1 ${cellClass(value)}`}
                                        >
                                            {cellText(value)}
                                        </td>
                                    );
                                })}
                                <td className="px-2 py-1 text-gray-300">|</td>
                                {row.outputs.map((value, i) => {
                                    return (
                                        <td
                                            key={`out-${i}`}
                                            className={`px-2 py-1 ${cellClass(value)}`}
                                        >
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
