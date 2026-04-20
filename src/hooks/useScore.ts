import { useState, useEffect } from 'react'
import { ipc } from '@/lib/ipc'

export interface DailyScore {
  date: string
  completion_pct: number
  focus_pct: number
  score: number
  streak_day: number
}

export function useTodayScore() {
  const [score, setScore] = useState<DailyScore | null>(null)

  useEffect(() => {
    ipc.invoke<DailyScore>('scores:today').then(setScore).catch(() => {})

    const interval = setInterval(() => {
      ipc.invoke<DailyScore>('scores:today').then(setScore).catch(() => {})
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return score
}

export function useScoreHistory(days = 30) {
  const [history, setHistory] = useState<DailyScore[]>([])

  useEffect(() => {
    ipc.invoke<DailyScore[]>('scores:history', days).then(setHistory).catch(() => {})
  }, [days])

  return history
}
