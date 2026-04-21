import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { scaleIn } from '@/lib/animations';
import { CheckSquare2, CalendarDays, Clock, BarChart2, Skull, Settings, Plus, Play, Search } from 'lucide-react';
import { useTodayTasks } from '@/hooks/useTasks';
export function CommandPalette({ onCreateTask }) {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { tasks, startTask } = useTodayTasks();
    const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(o => !o);
            }
            // Number shortcuts when palette is closed
            if (!open && !e.metaKey && !e.ctrlKey && !e.altKey) {
                const shortcuts = {
                    '1': '/today', '2': '/calendar', '3': '/upcoming', '4': '/stats', '5': '/shame',
                };
                if (shortcuts[e.key])
                    navigate(shortcuts[e.key]);
                if (e.key === 'n' && onCreateTask)
                    onCreateTask();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [open, navigate, onCreateTask]);
    const runCommand = useCallback((fn) => {
        setOpen(false);
        fn();
    }, []);
    return (_jsx(AnimatePresence, { children: open && (_jsxs(motion.div, { className: "fixed inset-0 z-[150] flex items-start justify-center pt-[15vh] px-4", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.1 }, children: [_jsx("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm", onClick: () => setOpen(false) }), _jsx(motion.div, { variants: scaleIn, initial: "hidden", animate: "visible", exit: "exit", className: "relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800/80 bg-zinc-900 shadow-2xl overflow-hidden", children: _jsxs(Command, { className: "[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-zinc-800", children: [_jsxs("div", { className: "flex items-center gap-2 px-4 py-3", children: [_jsx(Search, { size: 16, className: "text-zinc-500 flex-shrink-0" }), _jsx(Command.Input, { placeholder: "Search commands, navigate, start task...", className: "flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none", autoFocus: true }), _jsx("kbd", { className: "text-[10px] text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-700", children: "ESC" })] }), _jsxs(Command.List, { className: "max-h-80 overflow-y-auto p-2", children: [_jsx(Command.Empty, { className: "py-8 text-center text-sm text-zinc-500", children: "No commands found." }), _jsx(Command.Group, { heading: "Navigate", className: "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-600 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5", children: [
                                            { label: 'Today', to: '/today', icon: CheckSquare2, key: '1' },
                                            { label: 'Calendar', to: '/calendar', icon: CalendarDays, key: '2' },
                                            { label: 'Upcoming', to: '/upcoming', icon: Clock, key: '3' },
                                            { label: 'Stats', to: '/stats', icon: BarChart2, key: '4' },
                                            { label: 'Shame Log', to: '/shame', icon: Skull, key: '5' },
                                            { label: 'Settings', to: '/settings', icon: Settings, key: ',' },
                                        ].map(({ label, to, icon: Icon, key }) => (_jsxs(Command.Item, { value: label, onSelect: () => runCommand(() => navigate(to)), className: "flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 cursor-pointer aria-selected:bg-zinc-800 aria-selected:text-zinc-100 transition-colors", children: [_jsx(Icon, { size: 14, className: "text-zinc-500" }), label, _jsxs("kbd", { className: "ml-auto text-[10px] text-zinc-600", children: ["\u2318", key] })] }, to))) }), _jsx(Command.Group, { heading: "Actions", children: _jsxs(Command.Item, { value: "Create new task", onSelect: () => runCommand(() => onCreateTask?.()), className: "flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 cursor-pointer aria-selected:bg-zinc-800 aria-selected:text-zinc-100", children: [_jsx(Plus, { size: 14, className: "text-indigo-400" }), "Create new task", _jsx("kbd", { className: "ml-auto text-[10px] text-zinc-600", children: "N" })] }) }), pendingTasks.length > 0 && (_jsx(Command.Group, { heading: "Start Task", children: pendingTasks.slice(0, 5).map(task => (_jsxs(Command.Item, { value: `start ${task.title}`, onSelect: () => runCommand(() => startTask(task.id)), className: "flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-zinc-300 cursor-pointer aria-selected:bg-zinc-800 aria-selected:text-zinc-100", children: [_jsx(Play, { size: 14, className: "text-amber-400" }), _jsx("span", { className: "truncate", children: task.title }), _jsx("span", { className: `ml-auto text-[10px] px-1.5 py-0.5 rounded ${task.priority === 'critical' ? 'text-red-400' :
                                                        task.priority === 'medium' ? 'text-amber-400' : 'text-zinc-500'}`, children: task.priority })] }, task.id))) }))] })] }) })] })) }));
}
