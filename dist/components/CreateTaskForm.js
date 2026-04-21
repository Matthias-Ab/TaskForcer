import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, Textarea } from './ui/Input';
import { Button } from './ui/Button';
import { scaleIn } from '@/lib/animations';
export function CreateTaskForm({ onSubmit, onCancel, compact = false }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [dueDate, setDueDate] = useState('');
    const [estimate, setEstimate] = useState('30');
    const [tags, setTags] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        if (!title.trim())
            return;
        setLoading(true);
        await onSubmit({
            title: title.trim(),
            description,
            priority,
            due_at: dueDate ? new Date(dueDate).getTime() : null,
            estimate_minutes: parseInt(estimate) || 30,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        });
        setTitle('');
        setDescription('');
        setDueDate('');
        setEstimate('30');
        setTags('');
        setLoading(false);
        setOpen(false);
    }
    if (compact) {
        return (_jsx("div", { children: _jsx(AnimatePresence, { children: !open ? (_jsxs(motion.button, { initial: { opacity: 0 }, animate: { opacity: 1 }, onClick: () => setOpen(true), className: "flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-dashed border-zinc-700/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 text-sm transition-colors", children: [_jsx(Plus, { size: 14 }), "Add task...", _jsx("span", { className: "ml-auto text-xs text-zinc-600 font-mono", children: "N" })] })) : (_jsxs(motion.form, { variants: scaleIn, initial: "hidden", animate: "visible", exit: "exit", onSubmit: handleSubmit, className: "rounded-xl border border-indigo-500/30 bg-zinc-900/80 p-4 space-y-3", children: [_jsx(Input, { autoFocus: true, placeholder: "Task title...", value: title, onChange: e => setTitle(e.target.value), onKeyDown: e => e.key === 'Escape' && setOpen(false) }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { value: priority, onChange: e => setPriority(e.target.value), className: "flex-1 rounded-xl bg-zinc-800/80 border border-zinc-700/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500", children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "critical", children: "Critical" })] }), _jsx(Input, { type: "datetime-local", value: dueDate, onChange: e => setDueDate(e.target.value), className: "flex-1", placeholder: "Due date" }), _jsx(Input, { type: "number", value: estimate, onChange: e => setEstimate(e.target.value), placeholder: "Min", className: "w-20", min: "1" })] }), _jsx(Input, { placeholder: "Tags (comma-separated)", value: tags, onChange: e => setTags(e.target.value) }), _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: () => setOpen(false), children: "Cancel" }), _jsx(Button, { type: "submit", variant: "primary", size: "sm", disabled: !title.trim() || loading, children: "Add Task" })] })] })) }) }));
    }
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx(Input, { label: "Title", placeholder: "What needs to be done?", value: title, onChange: e => setTitle(e.target.value), autoFocus: true }), _jsx(Textarea, { label: "Description", placeholder: "Optional details...", value: description, onChange: e => setDescription(e.target.value), rows: 3 }), _jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("label", { className: "text-xs font-medium text-zinc-400", children: "Priority" }), _jsxs("select", { value: priority, onChange: e => setPriority(e.target.value), className: "rounded-xl bg-zinc-800/80 border border-zinc-700/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500", children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "critical", children: "Critical" })] })] }), _jsx(Input, { label: "Due date", type: "datetime-local", value: dueDate, onChange: e => setDueDate(e.target.value) }), _jsx(Input, { label: "Estimate (min)", type: "number", value: estimate, onChange: e => setEstimate(e.target.value), min: "1" })] }), _jsx(Input, { label: "Tags", placeholder: "work, health, learning", value: tags, onChange: e => setTags(e.target.value) }), _jsxs("div", { className: "flex gap-2 justify-end pt-2", children: [onCancel && (_jsx(Button, { type: "button", variant: "ghost", onClick: onCancel, children: "Cancel" })), _jsx(Button, { type: "submit", variant: "primary", disabled: !title.trim() || loading, children: "Create Task" })] })] }));
}
