import { Task } from '@/hooks/useTasks'

export interface HabitChain {
  rootId: string
  title: string
  recurrenceRule: string
  nagEnabled: boolean
  streak: number
  completedCount: number
  totalCount: number
}

interface ChainGroup {
  root: Task
  occurrences: Task[]
}

function groupChains(allTasks: Task[]): ChainGroup[] {
  const byId = new Map(allTasks.map(t => [t.id, t]))
  const groups = new Map<string, Task[]>()
  for (const t of allTasks) {
    if (!t.recurrence_rule) continue
    const rootId = t.parent_task_id ?? t.id
    if (!groups.has(rootId)) groups.set(rootId, [])
    groups.get(rootId)!.push(t)
  }
  const result: ChainGroup[] = []
  for (const [rootId, occurrences] of groups) {
    const root = byId.get(rootId) ?? occurrences[0]
    result.push({ root, occurrences })
  }
  return result
}

/**
 * Consecutive completed occurrences counting back from the most recent one that's already due.
 * Today's occurrence doesn't break an existing streak just for being still-pending -- the day
 * isn't over yet -- it only breaks the streak once it's actually in the past uncompleted.
 */
function currentStreak(occurrences: Task[], now: number): number {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const due = occurrences
    .filter(t => t.due_at !== null && t.due_at <= now)
    .sort((a, b) => b.due_at! - a.due_at!)
  let streak = 0
  for (const occ of due) {
    if (occ.status === 'completed') { streak++; continue }
    if (occ.due_at! >= startOfToday.getTime()) continue // still-pending today -- doesn't break the streak
    break
  }
  return streak
}

/** Maps every task id in a recurring chain (root + all spawned children) to that chain's current streak. */
export function computeStreakMap(allTasks: Task[], now: number = Date.now()): Map<string, number> {
  const map = new Map<string, number>()
  for (const { root, occurrences } of groupChains(allTasks)) {
    const streak = currentStreak(occurrences, now)
    map.set(root.id, streak)
    for (const occ of occurrences) map.set(occ.id, streak)
  }
  return map
}

/** One summary row per recurring task chain, for a habit-tracking view. */
export function computeHabitChains(allTasks: Task[], now: number = Date.now()): HabitChain[] {
  const chains = groupChains(allTasks).map(({ root, occurrences }) => {
    const due = occurrences.filter(t => t.due_at !== null && t.due_at <= now)
    return {
      rootId: root.id,
      title: root.title,
      recurrenceRule: root.recurrence_rule as string,
      nagEnabled: root.nag_enabled,
      streak: currentStreak(occurrences, now),
      completedCount: due.filter(t => t.status === 'completed').length,
      totalCount: due.length,
    }
  })
  return chains.sort((a, b) => b.streak - a.streak)
}
