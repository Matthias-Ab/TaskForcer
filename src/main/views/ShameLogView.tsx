import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import { motion } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { pageTransition } from '@/lib/animations'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skull, Trash2, Search, X } from 'lucide-react'
import { cn, debounce } from '@/lib/utils'
import { toast } from 'sonner'

interface ShameEntry {
  id: string
  type: 'distraction' | 'skipped_checkin' | 'missed_task' | 'late_completion' | 'excuse'
  task_id: string | null
  message: string
  created_at: number
}

interface ShameFilters {
  type?: ShameEntry['type']
  search?: string
  from?: number
  to?: number
}

const TYPE_COLORS: Record<ShameEntry['type'], string> = {
  distraction: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  skipped_checkin: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  missed_task: 'text-red-400 bg-red-500/10 border-red-500/20',
  late_completion: 'text-zinc-400 bg-zinc-700/30 border-zinc-700/40',
  excuse: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
}

const TYPE_LABELS: Record<ShameEntry['type'], string> = {
  distraction: 'Distraction',
  skipped_checkin: 'Skipped Check-in',
  missed_task: 'Missed Task',
  late_completion: 'Late Completion',
  excuse: 'Excuse',
}

const PAGE_SIZE = 100

export function ShameLogView() {
  const [entries, setEntries] = useState<ShameEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [filterType, setFilterType] = useState<ShameEntry['type'] | 'all'>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filters: ShameFilters = useMemo(() => ({
    type: filterType === 'all' ? undefined : filterType,
    search: search.trim() || undefined,
    from: dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : undefined,
    to: dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : undefined,
  }), [filterType, search, dateFrom, dateTo])

  const debouncedSetSearch = useRef(debounce((...args: unknown[]) => setSearch(args[0] as string), 300)).current

  useEffect(() => { debouncedSetSearch(searchInput) }, [searchInput, debouncedSetSearch])

  const load = useCallback(async () => {
    setLoading(true)
    const [data, count] = await Promise.all([
      ipc.invoke<ShameEntry[]>('shame:list', PAGE_SIZE, 0, filters),
      ipc.invoke<number>('shame:count', filters),
    ])
    setEntries(data)
    setTotalCount(count)
    setHasMore(data.length < count)
    setLoading(false)
  }, [filters])

  useEffect(() => { load().catch(() => setLoading(false)) }, [load])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const data = await ipc.invoke<ShameEntry[]>('shame:list', PAGE_SIZE, entries.length, filters)
      setEntries(prev => [...prev, ...data])
      setHasMore(entries.length + data.length < totalCount)
    } finally {
      setLoadingMore(false)
    }
  }

  async function clearLog() {
    if (!confirm('Clear your entire shame log? This cannot be undone.')) return
    await ipc.invoke('shame:clear')
    setEntries([])
    setTotalCount(0)
    setHasMore(false)
    toast.success('Shame log cleared')
  }

  const ITEM_HEIGHT = 72
  const hasActiveFilters = filterType !== 'all' || !!search || !!dateFrom || !!dateTo

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/40 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Skull size={18} className="text-red-500" />
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">Shame Log</h1>
            <p className="text-xs text-zinc-500">{totalCount} entries of failure</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={clearLog} className="text-red-500 hover:text-red-400">
          <Trash2 size={14} />
          Clear All
        </Button>
      </div>

      {/* Search + date range */}
      <div className="flex flex-wrap items-end gap-3 px-6 py-3 border-b border-zinc-800/40 flex-shrink-0">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-[38px] -translate-y-1/2 text-zinc-600" />
          <Input
            label="Search"
            placeholder="Search messages..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Input label="From" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <Input label="To" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={() => { setFilterType('all'); setSearchInput(''); setSearch(''); setDateFrom(''); setDateTo('') }}>
            <X size={12} /> Clear filters
          </Button>
        )}
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 px-6 py-3 border-b border-zinc-800/40 overflow-x-auto flex-shrink-0">
        {(['all', 'distraction', 'skipped_checkin', 'missed_task', 'late_completion', 'excuse'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterType(f)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              filterType === f
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-600/30'
                : 'text-zinc-500 hover:text-zinc-300 border border-zinc-800/60 hover:border-zinc-700'
            )}
          >
            {f === 'all' ? 'All' : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-hidden px-6 py-4 flex flex-col">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-zinc-800/40 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Skull size={36} className="text-zinc-700 mb-3" />
            <p className="text-zinc-500 text-sm">
              {hasActiveFilters ? 'No entries match these filters.' : 'No shame yet. Keep it that way.'}
            </p>
          </div>
        ) : entries.length > 50 ? (
          <List
            height={500}
            itemCount={entries.length}
            itemSize={ITEM_HEIGHT}
            width="100%"
          >
            {({ index, style }: ListChildComponentProps) => (
              <div style={style} className="pb-2">
                <ShameRow entry={entries[index]} />
              </div>
            )}
          </List>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {entries.map(entry => <ShameRow key={entry.id} entry={entry} />)}
          </div>
        )}

        {!loading && hasMore && (
          <div className="pt-3 flex-shrink-0 flex justify-center">
            <Button size="sm" variant="secondary" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading...' : `Load more (${totalCount - entries.length} remaining)`}
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ShameRow({ entry }: { entry: ShameEntry }) {
  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3 rounded-xl border',
      'border-zinc-800/40 bg-zinc-900/30'
    )}>
      <span className={cn(
        'text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap mt-0.5',
        TYPE_COLORS[entry.type]
      )}>
        {TYPE_LABELS[entry.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300 truncate">{entry.message}</p>
        <p className="text-xs text-zinc-600 mt-0.5">
          {new Date(entry.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  )
}
