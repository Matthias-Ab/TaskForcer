import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Minus, Square, X, CheckSquare2 } from 'lucide-react';
import { ipc } from '@/lib/ipc';
import { cn } from '@/lib/utils';
export function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);
    useEffect(() => {
        ipc.invoke('window:is-maximized').then(setIsMaximized);
    }, []);
    return (_jsxs("div", { className: "titlebar-drag flex items-center justify-between h-10 px-4 flex-shrink-0 select-none border-b border-zinc-800/60", children: [_jsxs("div", { className: "flex items-center gap-2 titlebar-no-drag", children: [_jsx(CheckSquare2, { size: 16, className: "text-indigo-400" }), _jsx("span", { className: "text-sm font-semibold text-zinc-300", children: "TaskForcer" })] }), _jsxs("div", { className: "titlebar-no-drag flex items-center gap-1", children: [_jsx(WindowButton, { onClick: () => ipc.invoke('window:minimize'), icon: _jsx(Minus, { size: 12 }), title: "Minimize", hoverClass: "hover:bg-zinc-700" }), _jsx(WindowButton, { onClick: () => {
                            ipc.invoke('window:maximize');
                            setIsMaximized(m => !m);
                        }, icon: _jsx(Square, { size: 10 }), title: isMaximized ? 'Restore' : 'Maximize', hoverClass: "hover:bg-zinc-700" }), _jsx(WindowButton, { onClick: () => ipc.invoke('window:close'), icon: _jsx(X, { size: 12 }), title: "Close", hoverClass: "hover:bg-red-600" })] })] }));
}
function WindowButton({ onClick, icon, title, hoverClass, }) {
    return (_jsx("button", { onClick: onClick, title: title, className: cn('w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 transition-all duration-100', hoverClass, 'hover:text-zinc-100 active:scale-90'), children: icon }));
}
