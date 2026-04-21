import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { motion } from 'framer-motion';
import { ipc } from '@/lib/ipc';
import { pageTransition } from '@/lib/animations';
import { Button } from '@/components/ui/Button';
import { Skull, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
const TYPE_COLORS = {
    distraction: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    skipped_checkin: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    missed_task: 'text-red-400 bg-red-500/10 border-red-500/20',
    late_completion: 'text-zinc-400 bg-zinc-700/30 border-zinc-700/40',
    excuse: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};
const TYPE_LABELS = {
    distraction: 'Distraction',
    skipped_checkin: 'Skipped Check-in',
    missed_task: 'Missed Task',
    late_completion: 'Late Completion',
    excuse: 'Excuse',
};
export function ShameLogView() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const load = useCallback(async () => {
        const data = await ipc.invoke('shame:list', 500, 0);
        setEntries(data);
        setLoading(false);
    }, []);
    useEffect(() => { load(); }, [load]);
    const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);
    async function clearLog() {
        if (!confirm('Clear your entire shame log? This cannot be undone.'))
            return;
        await ipc.invoke('shame:clear');
        setEntries([]);
        toast.success('Shame log cleared');
    }
    const ITEM_HEIGHT = 72;
    return (_jsxs(motion.div, { variants: pageTransition, initial: "hidden", animate: "visible", exit: "exit", className: "flex flex-col h-full overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-zinc-800/40 flex-shrink-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Skull, { size: 18, className: "text-red-500" }), _jsxs("div", { children: [_jsx("h1", { className: "text-lg font-semibold text-zinc-100", children: "Shame Log" }), _jsxs("p", { className: "text-xs text-zinc-500", children: [entries.length, " entries of failure"] })] })] }), _jsxs(Button, { size: "sm", variant: "ghost", onClick: clearLog, className: "text-red-500 hover:text-red-400", children: [_jsx(Trash2, { size: 14 }), "Clear All"] })] }), _jsx("div", { className: "flex gap-2 px-6 py-3 border-b border-zinc-800/40 overflow-x-auto flex-shrink-0", children: ['all', 'distraction', 'skipped_checkin', 'missed_task', 'late_completion', 'excuse'].map(f => (_jsx("button", { onClick: () => setFilter(f), className: cn('px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors', filter === f
                        ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-600/30'
                        : 'text-zinc-500 hover:text-zinc-300 border border-zinc-800/60 hover:border-zinc-700'), children: f === 'all' ? `All (${entries.length})` : TYPE_LABELS[f] }, f))) }), _jsx("div", { className: "flex-1 overflow-hidden px-6 py-4", children: loading ? (_jsx("div", { className: "space-y-2", children: Array.from({ length: 5 }).map((_, i) => (_jsx("div", { className: "h-16 rounded-xl bg-zinc-800/40 animate-pulse" }, i))) })) : filtered.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center h-full text-center", children: [_jsx(Skull, { size: 36, className: "text-zinc-700 mb-3" }), _jsx("p", { className: "text-zinc-500 text-sm", children: filter === 'all' ? 'No shame yet. Keep it that way.' : 'No entries of this type.' })] })) : filtered.length > 50 ? (_jsx(List, { height: 500, itemCount: filtered.length, itemSize: ITEM_HEIGHT, width: "100%", children: ({ index, style }) => (_jsx("div", { style: style, className: "pb-2", children: _jsx(ShameRow, { entry: filtered[index] }) })) })) : (_jsx("div", { className: "space-y-2", children: filtered.map(entry => _jsx(ShameRow, { entry: entry }, entry.id)) })) })] }));
}
function ShameRow({ entry }) {
    return (_jsxs("div", { className: cn('flex items-start gap-3 px-4 py-3 rounded-xl border', 'border-zinc-800/40 bg-zinc-900/30'), children: [_jsx("span", { className: cn('text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap mt-0.5', TYPE_COLORS[entry.type]), children: TYPE_LABELS[entry.type] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm text-zinc-300 truncate", children: entry.message }), _jsx("p", { className: "text-xs text-zinc-600 mt-0.5", children: new Date(entry.created_at).toLocaleString() })] })] }));
}
