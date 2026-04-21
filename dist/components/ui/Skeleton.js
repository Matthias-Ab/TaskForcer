import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
export function Skeleton({ className }) {
    return (_jsx("div", { className: cn('animate-pulse rounded-xl bg-zinc-800/60', className) }));
}
export function TaskSkeleton() {
    return (_jsxs("div", { className: "flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800/40", children: [_jsx(Skeleton, { className: "w-5 h-5 rounded-full flex-shrink-0" }), _jsxs("div", { className: "flex-1 space-y-2", children: [_jsx(Skeleton, { className: "h-4 w-3/4" }), _jsx(Skeleton, { className: "h-3 w-1/3" })] }), _jsx(Skeleton, { className: "h-5 w-16" })] }));
}
export function TaskSkeletonList({ count = 5 }) {
    return (_jsx("div", { className: "space-y-2", children: Array.from({ length: count }).map((_, i) => (_jsx(TaskSkeleton, {}, i))) }));
}
