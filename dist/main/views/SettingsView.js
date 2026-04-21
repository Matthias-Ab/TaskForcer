import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { useSettings } from '@/hooks/useSettings';
import { pageTransition } from '@/lib/animations';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ipc } from '@/lib/ipc';
import { toast } from 'sonner';
import { Download, Trash2, RefreshCw } from 'lucide-react';
export function SettingsView() {
    const { settings, loading, setSetting } = useSettings();
    if (loading)
        return null;
    async function exportData() {
        const data = await ipc.invoke('settings:export');
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `taskforcer-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Data exported!');
    }
    async function clearShameLog() {
        if (!confirm('Clear your shame log? Cannot be undone.'))
            return;
        await ipc.invoke('settings:clearShameLog');
        toast.success('Shame log cleared');
    }
    async function resetStreaks() {
        if (!confirm('Reset all streaks to 0?'))
            return;
        await ipc.invoke('settings:resetStreaks');
        toast.success('Streaks reset');
    }
    return (_jsxs(motion.div, { variants: pageTransition, initial: "hidden", animate: "visible", exit: "exit", className: "flex flex-col h-full overflow-hidden", children: [_jsx("div", { className: "px-6 py-4 border-b border-zinc-800/40 flex-shrink-0", children: _jsx("h1", { className: "text-lg font-semibold text-zinc-100", children: "Settings" }) }), _jsxs("div", { className: "flex-1 overflow-y-auto px-6 py-6 space-y-8", children: [_jsx(Section, { title: "Work Hours", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsx(Input, { label: "Start time", type: "time", value: settings.work_start || '09:00', onChange: e => setSetting('work_start', e.target.value) }), _jsx(Input, { label: "End time", type: "time", value: settings.work_end || '18:00', onChange: e => setSetting('work_end', e.target.value) })] }) }), _jsx(Section, { title: "Forcing Mechanisms", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Input, { label: "Check-in interval (minutes)", type: "number", value: settings.checkin_interval_min || '25', onChange: e => setSetting('checkin_interval_min', e.target.value), min: "5", max: "120" }), _jsx(Input, { label: "End-of-day lockout threshold (score 0\u2013100)", type: "number", value: settings.lockout_threshold || '50', onChange: e => setSetting('lockout_threshold', e.target.value), min: "0", max: "100" }), _jsx(Input, { label: "Idle detection threshold (minutes)", type: "number", value: settings.idle_threshold_min || '10', onChange: e => setSetting('idle_threshold_min', e.target.value), min: "5" })] }) }), _jsx(Section, { title: "Focus Tracking", children: _jsxs("div", { className: "space-y-4", children: [_jsx(Toggle, { label: "Enable focus tracking (read-only window polling)", checked: settings.focus_tracking !== 'false', onChange: v => setSetting('focus_tracking', v ? 'true' : 'false') }), _jsx(Toggle, { label: "Enable sounds", checked: settings.sound_enabled !== 'false', onChange: v => setSetting('sound_enabled', v ? 'true' : 'false') }), _jsx(Toggle, { label: "Launch at startup", checked: settings.auto_launch === 'true', onChange: v => setSetting('auto_launch', v ? 'true' : 'false') })] }) }), _jsx(Section, { title: "Data", children: _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs(Button, { variant: "secondary", size: "sm", onClick: exportData, children: [_jsx(Download, { size: 14 }), "Export JSON"] }), _jsxs(Button, { variant: "ghost", size: "sm", onClick: clearShameLog, className: "text-red-500", children: [_jsx(Trash2, { size: 14 }), "Clear Shame Log"] }), _jsxs(Button, { variant: "ghost", size: "sm", onClick: resetStreaks, className: "text-amber-500", children: [_jsx(RefreshCw, { size: 14 }), "Reset Streaks"] })] }) })] })] }));
}
function Section({ title, children }) {
    return (_jsxs("div", { children: [_jsx("h2", { className: "text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-4", children: title }), children] }));
}
function Toggle({ label, checked, onChange }) {
    return (_jsxs("label", { className: "flex items-center gap-3 cursor-pointer group", children: [_jsx("div", { className: `relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-zinc-700'}`, onClick: () => onChange(!checked), children: _jsx("div", { className: `absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}` }) }), _jsx("span", { className: "text-sm text-zinc-300 group-hover:text-zinc-100 transition-colors", children: label })] }));
}
