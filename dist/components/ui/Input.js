import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
export const Input = forwardRef(({ label, error, className, ...props }, ref) => {
    return (_jsxs("div", { className: "flex flex-col gap-1.5", children: [label && _jsx("label", { className: "text-xs font-medium text-zinc-400", children: label }), _jsx("input", { ref: ref, className: cn('w-full rounded-xl bg-zinc-800/80 border border-zinc-700/60 px-3 py-2 text-sm text-zinc-100', 'placeholder:text-zinc-600', 'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent', 'transition-all duration-150', error && 'border-red-500 focus:ring-red-500', className), ...props }), error && _jsx("p", { className: "text-xs text-red-400", children: error })] }));
});
Input.displayName = 'Input';
export const Textarea = forwardRef(({ label, className, ...props }, ref) => {
    return (_jsxs("div", { className: "flex flex-col gap-1.5", children: [label && _jsx("label", { className: "text-xs font-medium text-zinc-400", children: label }), _jsx("textarea", { ref: ref, className: cn('w-full rounded-xl bg-zinc-800/80 border border-zinc-700/60 px-3 py-2 text-sm text-zinc-100 resize-none', 'placeholder:text-zinc-600', 'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent', 'transition-all duration-150', className), ...props })] }));
});
Textarea.displayName = 'Textarea';
