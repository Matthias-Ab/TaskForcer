export function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === 1) return `Tomorrow ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  if (diffDays === -1) return 'Yesterday'
  if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function isOverdue(dueAt: number | null): boolean {
  if (!dueAt) return false
  return dueAt < Date.now()
}

export function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: unknown[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

export const SNOOZE_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: 'Tomorrow', minutes: 60 * 16 },
]

export function priorityDotColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-red-500'
    case 'medium': return 'bg-amber-400'
    default: return 'bg-zinc-500'
  }
}
