import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { TitleBar } from '@/components/TitleBar';
import { Sidebar } from '@/components/Sidebar';
import { TodayView } from './views/TodayView';
import { CalendarView } from './views/CalendarView';
import { UpcomingView } from './views/UpcomingView';
import { StatsView } from './views/StatsView';
import { ShameLogView } from './views/ShameLogView';
import { SettingsView } from './views/SettingsView';
import { CommandPalette } from '@/components/CommandPalette';
import { CheckinDialog } from '@/components/CheckinDialog';
import { LockoutDialog } from '@/components/LockoutDialog';
import { Dialog } from '@/components/ui/Dialog';
import { CreateTaskForm } from '@/components/CreateTaskForm';
import { useTodayTasks } from '@/hooks/useTasks';
export function App() {
    const location = useLocation();
    const [showCreateTask, setShowCreateTask] = useState(false);
    const { createTask } = useTodayTasks();
    return (_jsxs("div", { className: "flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden", children: [_jsx(TitleBar, {}), _jsxs("div", { className: "flex flex-1 overflow-hidden", children: [_jsx(Sidebar, {}), _jsx("main", { className: "flex-1 overflow-hidden relative", children: _jsx(AnimatePresence, { mode: "wait", initial: false, children: _jsxs(Routes, { location: location, children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/today", replace: true }) }), _jsx(Route, { path: "/today", element: _jsx(TodayView, {}) }), _jsx(Route, { path: "/calendar", element: _jsx(CalendarView, {}) }), _jsx(Route, { path: "/upcoming", element: _jsx(UpcomingView, {}) }), _jsx(Route, { path: "/stats", element: _jsx(StatsView, {}) }), _jsx(Route, { path: "/shame", element: _jsx(ShameLogView, {}) }), _jsx(Route, { path: "/settings", element: _jsx(SettingsView, {}) })] }, location.pathname) }) })] }), _jsx(CheckinDialog, {}), _jsx(LockoutDialog, {}), _jsx(Dialog, { open: showCreateTask, onClose: () => setShowCreateTask(false), title: "New Task", children: _jsx(CreateTaskForm, { onSubmit: async (data) => {
                        await createTask(data);
                        setShowCreateTask(false);
                    }, onCancel: () => setShowCreateTask(false) }) }), _jsx(CommandPalette, { onCreateTask: () => setShowCreateTask(true) }), _jsx(Toaster, { theme: "dark", position: "bottom-right", toastOptions: {
                    style: { background: '#18181b', border: '1px solid #27272a', color: '#fafafa' },
                } })] }));
}
