import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
export const Button = forwardRef(({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => {
    return (_jsx("button", { ref: ref, className: cn('inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900', 'disabled:opacity-50 disabled:pointer-events-none', 'active:scale-[0.97]', size === 'sm' && 'px-3 py-1.5 text-xs', size === 'md' && 'px-4 py-2 text-sm', size === 'lg' && 'px-5 py-2.5 text-base', variant === 'primary' && 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm', variant === 'secondary' && 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60', variant === 'ghost' && 'hover:bg-zinc-800/80 text-zinc-300 hover:text-zinc-100', variant === 'danger' && 'bg-red-600 hover:bg-red-500 text-white', variant === 'success' && 'bg-emerald-600 hover:bg-emerald-500 text-white', className), ...props, children: children }));
});
Button.displayName = 'Button';
