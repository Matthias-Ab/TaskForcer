import { useState, useEffect } from 'react';
import { ipc } from '@/lib/ipc';
export function useTodayScore() {
    const [score, setScore] = useState(null);
    useEffect(() => {
        ipc.invoke('scores:today').then(setScore).catch(() => { });
        const interval = setInterval(() => {
            ipc.invoke('scores:today').then(setScore).catch(() => { });
        }, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);
    return score;
}
export function useScoreHistory(days = 30) {
    const [history, setHistory] = useState([]);
    useEffect(() => {
        ipc.invoke('scores:history', days).then(setHistory).catch(() => { });
    }, [days]);
    return history;
}
