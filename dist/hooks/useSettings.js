import { useState, useEffect, useCallback } from 'react';
import { ipc } from '@/lib/ipc';
export function useSettings() {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        ipc.invoke('settings:getAll').then(s => {
            setSettings(s);
            setLoading(false);
        });
    }, []);
    const setSetting = useCallback(async (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        try {
            await ipc.invoke('settings:set', key, value);
            if (key === 'auto_launch') {
                ipc.invoke('auto_launch:toggle', value === 'true').catch(() => { });
            }
        }
        catch {
            setSettings(prev => ({ ...prev }));
        }
    }, []);
    return { settings, loading, setSetting };
}
