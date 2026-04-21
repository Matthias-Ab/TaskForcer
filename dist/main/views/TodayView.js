import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTodayTasks } from '@/hooks/useTasks';
import { TaskCard } from '@/components/TaskCard';
import { CreateTaskForm } from '@/components/CreateTaskForm';
import { TaskSkeletonList } from '@/components/ui/Skeleton';
import { Dialog } from '@/components/ui/Dialog';
import { pageTransition, listItem } from '@/lib/animations';
import { CheckSquare2, AlertTriangle, Circle } from 'lucide-react';
export function TodayView() {
    const { tasks, loading, completeTask, startTask, snoozeTask, deleteTask, createTask } = useTodayTasks();
    const [showCreate, setShowCreate] = useState(false);
    const critical = tasks.filter(t => t.priority === 'critical' && t.status !== 'completed');
    const medium = tasks.filter(t => t.priority === 'medium' && t.status !== 'completed');
    const low = tasks.filter(t => t.priority === 'low' && t.status !== 'completed');
    const completed = tasks.filter(t => t.status === 'completed');
    return (_jsxs(motion.div, { variants: pageTransition, initial: "hidden", animate: "visible", exit: "exit", className: "flex flex-col h-full overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-zinc-800/40 flex-shrink-0", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-lg font-semibold text-zinc-100", children: "Today" }), _jsxs("p", { className: "text-xs text-zinc-500 mt-0.5", children: [new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), ' · ', tasks.filter(t => t.status !== 'completed').length, " remaining"] })] }), _jsxs("button", { onClick: () => setShowCreate(true), className: "px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-600/30 text-sm font-medium hover:bg-indigo-600/30 transition-colors", children: ["+ Add Task", _jsx("span", { className: "ml-2 text-xs text-indigo-500/60 font-mono", children: "N" })] })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-6 py-4 space-y-6", children: [loading ? (_jsx(TaskSkeletonList, { count: 6 })) : tasks.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-16 text-center", children: [_jsx(CheckSquare2, { size: 40, className: "text-emerald-500 mb-3" }), _jsx("p", { className: "text-zinc-300 font-medium", children: "All clear for today!" }), _jsx("p", { className: "text-zinc-600 text-sm mt-1", children: "Add a task to get started." })] })) : (_jsxs(_Fragment, { children: [_jsx(TaskGroup, { label: "Critical", icon: _jsx(AlertTriangle, { size: 13, className: "text-red-500" }), tasks: critical, count: critical.length, onComplete: completeTask, onStart: startTask, onSnooze: snoozeTask, onDelete: deleteTask }), _jsx(TaskGroup, { label: "Medium", icon: _jsx(Circle, { size: 13, className: "text-amber-400" }), tasks: medium, count: medium.length, onComplete: completeTask, onStart: startTask, onSnooze: snoozeTask, onDelete: deleteTask }), _jsx(TaskGroup, { label: "Low Priority", icon: _jsx(Circle, { size: 13, className: "text-zinc-500" }), tasks: low, count: low.length, onComplete: completeTask, onStart: startTask, onSnooze: snoozeTask, onDelete: deleteTask }), completed.length > 0 && (_jsx(TaskGroup, { label: "Completed", icon: _jsx(CheckSquare2, { size: 13, className: "text-emerald-500" }), tasks: completed, count: completed.length, onComplete: completeTask, onStart: startTask, onSnooze: snoozeTask, onDelete: deleteTask, collapsed: true }))] })), _jsx(CreateTaskForm, { onSubmit: createTask, compact: true })] }), _jsx(Dialog, { open: showCreate, onClose: () => setShowCreate(false), title: "New Task", size: "md", children: _jsx(CreateTaskForm, { onSubmit: async (data) => {
                        await createTask(data);
                        setShowCreate(false);
                    }, onCancel: () => setShowCreate(false) }) })] }));
}
function TaskGroup({ label, icon, tasks, count, onComplete, onStart, onSnooze, onDelete, collapsed = false }) {
    const [open, setOpen] = useState(!collapsed);
    if (count === 0)
        return null;
    return (_jsxs("div", { children: [_jsxs("button", { onClick: () => setOpen(o => !o), className: "flex items-center gap-2 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider hover:text-zinc-300 transition-colors", children: [icon, label, _jsx("span", { className: "ml-1 px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-500 font-mono normal-case", children: count })] }), _jsx(AnimatePresence, { children: open && (_jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.2 }, className: "overflow-hidden", children: _jsx(motion.div, { className: "space-y-1.5", layout: true, children: _jsx(AnimatePresence, { initial: false, children: tasks.map(task => (_jsx(motion.div, { variants: listItem, initial: "hidden", animate: "visible", exit: "exit", layout: true, children: _jsx(TaskCard, { task: task, onComplete: onComplete, onStart: onStart, onSnooze: onSnooze, onDelete: onDelete }) }, task.id))) }) }) })) })] }));
}
