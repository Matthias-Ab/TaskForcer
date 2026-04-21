import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDays, CheckSquare2, Clock, BarChart2, Skull, Settings, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTodayScore } from '@/hooks/useScore';
const links = [
    { to: '/today', icon: CheckSquare2, label: 'Today', shortcut: '1' },
    { to: '/calendar', icon: CalendarDays, label: 'Calendar', shortcut: '2' },
    { to: '/upcoming', icon: Clock, label: 'Upcoming', shortcut: '3' },
    { to: '/stats', icon: BarChart2, label: 'Stats', shortcut: '4' },
    { to: '/shame', icon: Skull, label: 'Shame Log', shortcut: '5' },
];
export function Sidebar() {
    const score = useTodayScore();
    const scoreColor = !score ? 'text-zinc-500'
        : score.score >= 80 ? 'text-emerald-400'
            : score.score >= 50 ? 'text-amber-400'
                : 'text-red-400';
    return (_jsxs("aside", { className: "flex flex-col w-56 flex-shrink-0 border-r border-zinc-800/60 bg-zinc-950/80", children: [_jsxs("div", { className: "px-4 py-4 border-b border-zinc-800/40", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-xs text-zinc-500 font-medium uppercase tracking-wider", children: "Today's Score" }), score?.streak_day ? (_jsxs("div", { className: "flex items-center gap-1 text-amber-400", children: [_jsx(Flame, { size: 12 }), _jsx("span", { className: "text-xs font-mono", children: score.streak_day })] })) : null] }), _jsxs("div", { className: cn('text-3xl font-mono font-bold mt-1 tabular-nums', scoreColor), children: [score ? Math.round(score.score) : '--', _jsx("span", { className: "text-base text-zinc-600 font-sans font-normal", children: "/100" })] }), score && (_jsx("div", { className: "mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden", children: _jsx(motion.div, { className: cn('h-full rounded-full', score.score >= 80 ? 'bg-emerald-500' : score.score >= 50 ? 'bg-amber-400' : 'bg-red-500'), initial: { width: 0 }, animate: { width: `${score.score}%` }, transition: { duration: 0.8, ease: 'easeOut' } }) }))] }), _jsx("nav", { className: "flex-1 py-3 px-2 space-y-0.5 overflow-y-auto", children: links.map(({ to, icon: Icon, label, shortcut }) => (_jsx(NavLink, { to: to, children: ({ isActive }) => (_jsxs(motion.div, { className: cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer', 'group relative', isActive
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'), whileHover: { x: 1 }, whileTap: { scale: 0.98 }, transition: { duration: 0.1 }, children: [_jsx(Icon, { size: 16, className: "flex-shrink-0" }), _jsx("span", { className: "flex-1", children: label }), _jsxs("span", { className: "text-[10px] text-zinc-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity", children: ["\u2318", shortcut] }), isActive && (_jsx(motion.div, { className: "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-indigo-500 rounded-full", layoutId: "activeIndicator" }))] })) }, to))) }), _jsx("div", { className: "px-2 py-3 border-t border-zinc-800/40", children: _jsx(NavLink, { to: "/settings", children: ({ isActive }) => (_jsxs(motion.div, { className: cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer', isActive
                            ? 'bg-zinc-800 text-zinc-100'
                            : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/60'), whileHover: { x: 1 }, whileTap: { scale: 0.98 }, children: [_jsx(Settings, { size: 16 }), _jsx("span", { children: "Settings" })] })) }) })] }));
}
