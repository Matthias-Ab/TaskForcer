import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ipc } from '@/lib/ipc';
import { Button } from './ui/Button';
import { Textarea } from './ui/Input';
import { scaleIn } from '@/lib/animations';
import { Lock, AlertTriangle } from 'lucide-react';
export function LockoutDialog() {
    const [open, setOpen] = useState(false);
    const [score, setScore] = useState(0);
    const [threshold, setThreshold] = useState(50);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const handler = (...args) => {
            const payload = args[0];
            setScore(payload.score);
            setThreshold(payload.threshold);
            setOpen(true);
        };
        ipc.on('forcing:lockout-request', handler);
        return () => ipc.off('forcing:lockout-request', handler);
    }, []);
    async function handleSubmit(e) {
        e.preventDefault();
        if (reason.length < 20)
            return;
        setLoading(true);
        await ipc.invoke('forcing:lockout-excuse', reason);
        setOpen(false);
        setLoading(false);
    }
    return (_jsx(AnimatePresence, { children: open && (_jsxs(motion.div, { className: "fixed inset-0 z-[200] flex items-center justify-center p-4", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, children: [_jsx("div", { className: "absolute inset-0 bg-black/80 backdrop-blur-md" }), _jsxs(motion.div, { variants: scaleIn, initial: "hidden", animate: "visible", exit: "exit", className: "relative z-10 w-full max-w-md rounded-2xl bg-zinc-900 border border-red-500/30 shadow-2xl shadow-red-500/10 p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center", children: _jsx(Lock, { size: 20, className: "text-red-400" }) }), _jsxs("div", { children: [_jsx("h2", { className: "text-base font-semibold text-zinc-100", children: "Productivity Lockout" }), _jsx("p", { className: "text-xs text-zinc-500", children: "You must explain before quitting" })] })] }), _jsxs("div", { className: "flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4", children: [_jsx(AlertTriangle, { size: 14, className: "text-red-400 mt-0.5 flex-shrink-0" }), _jsxs("p", { className: "text-sm text-red-300", children: ["Your score today is ", _jsxs("strong", { children: [Math.round(score), "/100"] }), " (minimum ", threshold, " to quit freely). Provide a written reason to continue (min 20 characters)."] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsx(Textarea, { label: "Why are you quitting without completing your tasks?", placeholder: "Be honest. This will be logged to your shame log...", value: reason, onChange: e => setReason(e.target.value), rows: 4, autoFocus: true }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: `text-xs font-mono ${reason.length >= 20 ? 'text-emerald-400' : 'text-zinc-500'}`, children: [reason.length, "/20 min chars"] }), _jsx(Button, { type: "submit", variant: "danger", disabled: reason.length < 20 || loading, children: "Log & Quit" })] })] })] })] })) }));
}
