import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { motion } from 'framer-motion';
import { ipc } from '@/lib/ipc';
import { formatDate, cn } from '@/lib/utils';
import { AlertTriangle, CheckSquare2, Sun } from 'lucide-react';
import '@/styles/globals.css';
function MorningPopup() {
    const [tasks, setTasks] = useState([]);
    const [acknowledged, setAcknowledged] = useState(false);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        ipc.invoke('tasks:today').then(t => {
            setTasks(t.filter(task => task.priority === 'critical' || task.priority === 'medium'));
            setLoading(false);
        });
    }, []);
    const critical = tasks.filter(t => t.priority === 'critical');
    const medium = tasks.filter(t => t.priority === 'medium');
    async function dismiss() {
        if (!acknowledged)
            return;
        await ipc.invoke('morning:dismiss');
    }
    return (_jsxs("div", { className: "flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden", children: [_jsx("div", { className: "flex-shrink-0 px-8 pt-8 pb-6", children: _jsxs(motion.div, { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, transition: { type: 'spring', stiffness: 260, damping: 26 }, className: "flex items-center gap-3 mb-2", children: [_jsx("div", { className: "w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center", children: _jsx(Sun, { size: 20, className: "text-amber-400" }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold text-zinc-100", children: "Good morning!" }), _jsx("p", { className: "text-sm text-zinc-500", children: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) })] })] }) }), _jsx("div", { className: "flex-1 overflow-y-auto px-8 pb-4", children: loading ? (_jsx("div", { className: "space-y-2", children: Array.from({ length: 4 }).map((_, i) => (_jsx("div", { className: "h-12 rounded-xl bg-zinc-800/40 animate-pulse" }, i))) })) : tasks.length === 0 ? (_jsxs("div", { className: "text-center py-8", children: [_jsx(CheckSquare2, { size: 32, className: "text-emerald-500 mx-auto mb-2" }), _jsx("p", { className: "text-zinc-400", children: "No tasks scheduled for today. Add some!" })] })) : (_jsxs("div", { className: "space-y-4", children: [critical.length > 0 && (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(AlertTriangle, { size: 12, className: "text-red-500" }), _jsxs("span", { className: "text-xs font-semibold text-red-500 uppercase tracking-wider", children: ["Critical (", critical.length, ")"] })] }), _jsx("div", { className: "space-y-1.5", children: critical.map(task => _jsx(MorningTaskRow, { task: task }, task.id)) })] })), medium.length > 0 && (_jsxs("div", { children: [_jsxs("span", { className: "text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2", children: ["Medium Priority (", medium.length, ")"] }), _jsx("div", { className: "space-y-1.5", children: medium.map(task => _jsx(MorningTaskRow, { task: task }, task.id)) })] }))] })) }), _jsxs("div", { className: "flex-shrink-0 px-8 pb-8 pt-4 border-t border-zinc-800/40", children: [_jsxs("label", { className: "flex items-center gap-3 cursor-pointer mb-4", children: [_jsx("div", { className: cn('w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all', acknowledged ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600 hover:border-indigo-500'), onClick: () => setAcknowledged(a => !a), children: acknowledged && (_jsx("svg", { width: "10", height: "10", viewBox: "0 0 10 10", fill: "none", children: _jsx("path", { d: "M1.5 5L4 7.5L8.5 2.5", stroke: "white", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) })) }), _jsx("span", { className: "text-sm text-zinc-300", children: "I acknowledge my tasks for today and commit to completing them" })] }), _jsx(motion.button, { onClick: dismiss, disabled: !acknowledged, whileHover: acknowledged ? { scale: 1.02 } : {}, whileTap: acknowledged ? { scale: 0.98 } : {}, className: cn('w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200', acknowledged
                            ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'), children: "Let's get to work \u2192" })] })] }));
}
function MorningTaskRow({ task }) {
    return (_jsxs("div", { className: "flex items-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-800/40 bg-zinc-900/30", children: [_jsx("div", { className: cn('w-1.5 h-1.5 rounded-full', task.priority === 'critical' ? 'bg-red-500' : 'bg-amber-400') }), _jsx("span", { className: "text-sm text-zinc-200 flex-1 truncate", children: task.title }), task.due_at && (_jsx("span", { className: "text-xs text-zinc-500 font-mono", children: formatDate(task.due_at) }))] }));
}
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(MorningPopup, {}) }));
