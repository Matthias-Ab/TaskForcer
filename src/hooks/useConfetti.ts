import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { DailyScore } from './useScore'

export function useConfetti(score: DailyScore | null) {
  const firedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!score || score.score < 100) return
    const today = new Date().toISOString().split('T')[0]
    if (firedRef.current === today) return
    firedRef.current = today

    const duration = 3000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
      })
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'],
      })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [score?.score])
}
