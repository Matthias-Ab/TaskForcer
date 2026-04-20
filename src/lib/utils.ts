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

export function priorityColor(priority: string): string {
  switch (priority) {
    case 'critical': return 'text-red-500'
    case 'medium': return 'text-amber-400'
    default: return 'text-zinc-400'
  }
}

export function priorityBg(priority: string): string {
  switch (priority) {
    case 'critical': return 'bg-red-500/10 border-red-500/20'
    case 'medium': return 'bg-amber-400/10 border-amber-400/20'
    default: return 'bg-zinc-800/50 border-zinc-700/40'
  }
}
