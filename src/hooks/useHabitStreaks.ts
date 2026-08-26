import { useState, useEffect, useCallback } from 'react'
import { ipc } from '@/lib/ipc'
import { Task } from './useTasks'
import { computeStreakMap, computeHabitChains, HabitChain } from '@/lib/streaks'

/**
 * Streaks need the FULL task history (including past-completed occurrences that have long since
 * rolled out of "today"), not the today-filtered list the rest of the app runs on -- so this does
 * its own fetch of every task rather than reusing TaskContext.
 */
export function useHabitStreaks(refreshKey?: unknown) {
  const [streaks, setStreaks] = useState<Map<string, number>>(new Map())
  const [chains, setChains] = useState<HabitChain[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const all = await ipc.invoke<Task[]>('tasks:list')
      setStreaks(computeStreakMap(all))
      setChains(computeHabitChains(all))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  return { streaks, chains, loading, reload: load }
}
