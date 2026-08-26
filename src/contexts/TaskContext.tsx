import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { ipc } from '@/lib/ipc'
import { toast } from 'sonner'
import { Task } from '@/hooks/useTasks'

// IPC errors arrive wrapped, e.g. "Error invoking remote handler for 'tasks:start': Error: Blocked by: X, Y"
function extractBlockedByMessage(err: unknown): string | null {
  const message = err instanceof Error ? err.message : String(err)
  const match = message.match(/Blocked by: .+$/)
  return match ? match[0] : null
}

interface TaskContextValue {
  tasks: Task[]
  loading: boolean
  reload: () => Promise<void>
  createTask: (data: Partial<Task>) => Promise<Task | null>
  updateTask: (id: string, data: Partial<Task>) => Promise<Task | null>
  completeTask: (id: string) => Promise<void>
  startTask: (id: string) => Promise<Task | null>
  snoozeTask: (id: string, minutes?: number) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  deleteTasks: (ids: string[]) => Promise<void>
  completeTasks: (ids: string[]) => Promise<void>
  updateTasksPriority: (ids: string[], priority: Task['priority']) => Promise<void>
  reorderTasks: (orderedIds: string[]) => Promise<void>
  getSubtasks: (parentId: string) => Promise<Task[]>
  createSubtask: (parentId: string, data: Partial<Task>) => Promise<Task | null>
  completeSubtask: (id: string) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
}

const TaskContext = createContext<TaskContextValue | null>(null)

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  // Lets mutation callbacks read the latest tasks without depending on `tasks`,
  // so their identity stays stable and memoized TaskCard/SortableTaskCard rows
  // don't re-render on every unrelated task's mutation.
  const tasksRef = useRef<Task[]>(tasks)
  useEffect(() => { tasksRef.current = tasks }, [tasks])

  const reload = useCallback(async () => {
    const data = await ipc.invoke<Task[]>('tasks:today')
    setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const createTask = useCallback(async (data: Partial<Task>): Promise<Task | null> => {
    const optimisticId = `optimistic-${Date.now()}`
    const optimistic: Task = {
      id: optimisticId,
      title: data.title || 'New Task',
      description: data.description || '',
      due_at: data.due_at ?? null,
      priority: data.priority || 'medium',
      estimate_minutes: data.estimate_minutes || 30,
      status: 'pending',
      created_at: Date.now(),
      completed_at: null,
      recurrence_rule: data.recurrence_rule ?? null,
      recurrence_end_at: data.recurrence_end_at ?? null,
      nag_enabled: data.nag_enabled ?? false,
      parent_task_id: null,
      required_tools: [],
      allowed_urls: [],
      distraction_apps: [],
      tags: data.tags || [],
      project_id: data.project_id ?? null,
      sort_order: 0,
      blocked_by: [],
      elapsed_seconds: 0,
    }
    setTasks(prev => [optimistic, ...prev])
    try {
      const created = await ipc.invoke<Task>('tasks:create', data)
      setTasks(prev => prev.map(t => t.id === optimisticId ? created : t))
      return created
    } catch {
      setTasks(prev => prev.filter(t => t.id !== optimisticId))
      toast.error('Failed to create task')
      return null
    }
  }, [])

  const updateTask = useCallback(async (id: string, data: Partial<Task>): Promise<Task | null> => {
    const prev = tasksRef.current.find(t => t.id === id)
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...data } : t))
    try {
      const updated = await ipc.invoke<Task>('tasks:update', id, data)
      if (updated) setTasks(ts => ts.map(t => t.id === id ? updated : t))
      return updated
    } catch {
      if (prev) setTasks(ts => ts.map(t => t.id === id ? prev : t))
      toast.error('Failed to update task')
      return null
    }
  }, [])

  const completeTask = useCallback(async (id: string) => {
    const wasInProgress = tasksRef.current.find(t => t.id === id)?.status === 'in_progress'
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' as const } : t))
    try {
      await ipc.invoke('tasks:complete', id)
      await ipc.invoke('scoring:invalidate')
      // Stop the widget if this was the active task
      if (wasInProgress) await ipc.invoke('task:stopped')
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' as const } : t))
      toast.error('Failed to complete task')
    }
  }, [])

  const startTask = useCallback(async (id: string): Promise<Task | null> => {
    const task = tasksRef.current.find(t => t.id === id)
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'in_progress' as const } :
      t.status === 'in_progress' ? { ...t, status: 'pending' as const } : t
    ))
    try {
      const { task: updated, sessionId } = await ipc.invoke<{ task: Task; sessionId: string }>('tasks:start', id)
      if (updated) setTasks(prev => prev.map(t => t.id === id ? updated : t))
      if (task) {
        await ipc.invoke('task:started', id, task.title)
        await ipc.invoke('forcing:start-task-session', id)
        await ipc.invoke('focus:start', sessionId, id)
      }
      return updated
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' as const } : t))
      toast.error(extractBlockedByMessage(err) ?? 'Failed to start task')
      return null
    }
  }, [])

  const snoozeTask = useCallback(async (id: string, minutes = 30) => {
    const task = tasksRef.current.find(t => t.id === id)
    const wasInProgress = task?.status === 'in_progress'
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await ipc.invoke('tasks:snooze', id, minutes)
      if (wasInProgress) await ipc.invoke('task:stopped')
      toast.success(`Snoozed for ${minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}`)
    } catch {
      if (task) setTasks(prev => [...prev, task])
      toast.error('Failed to snooze task')
    }
  }, [])

  // Deletes are staged for a few seconds before actually hitting the DB, so "Undo"
  // can cancel the pending delete instead of having to resurrect a deleted row.
  const UNDO_WINDOW_MS = 5000
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const deleteTask = useCallback(async (id: string) => {
    const task = tasksRef.current.find(t => t.id === id)
    if (!task) return
    const wasInProgress = task.status === 'in_progress'
    setTasks(prev => prev.filter(t => t.id !== id))
    if (wasInProgress) ipc.invoke('task:stopped').catch(() => {})

    const timeoutId = setTimeout(async () => {
      pendingDeletes.current.delete(id)
      try {
        await ipc.invoke('tasks:delete', id)
      } catch {
        setTasks(prev => prev.some(t => t.id === id) ? prev : [...prev, task])
        toast.error('Failed to delete task')
      }
    }, UNDO_WINDOW_MS)
    pendingDeletes.current.set(id, timeoutId)

    toast(`Deleted "${task.title}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          const pending = pendingDeletes.current.get(id)
          if (!pending) return
          clearTimeout(pending)
          pendingDeletes.current.delete(id)
          setTasks(prev => prev.some(t => t.id === id) ? prev : [...prev, task])
        },
      },
    })
  }, [])

  const deleteTasks = useCallback(async (ids: string[]) => {
    const removed = tasksRef.current.filter(t => ids.includes(t.id))
    if (!removed.length) return
    const hasActiveTask = removed.some(t => t.status === 'in_progress')
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
    if (hasActiveTask) ipc.invoke('task:stopped').catch(() => {})

    const timeoutId = setTimeout(async () => {
      for (const id of ids) pendingDeletes.current.delete(id)
      try {
        await Promise.all(ids.map(id => ipc.invoke('tasks:delete', id)))
      } catch {
        setTasks(prev => [...prev, ...removed.filter(t => !prev.some(p => p.id === t.id))])
        toast.error('Failed to delete tasks')
      }
    }, UNDO_WINDOW_MS)
    for (const id of ids) pendingDeletes.current.set(id, timeoutId)

    toast(`Deleted ${ids.length} task${ids.length > 1 ? 's' : ''}`, {
      action: {
        label: 'Undo',
        onClick: () => {
          if (!pendingDeletes.current.has(ids[0])) return
          clearTimeout(timeoutId)
          for (const id of ids) pendingDeletes.current.delete(id)
          setTasks(prev => [...prev, ...removed.filter(t => !prev.some(p => p.id === t.id))])
        },
      },
    })
  }, [])

  const completeTasks = useCallback(async (ids: string[]) => {
    const hasActiveTask = tasksRef.current.some(t => ids.includes(t.id) && t.status === 'in_progress')
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: 'completed' as const } : t))
    try {
      await Promise.all(ids.map(id => ipc.invoke('tasks:complete', id)))
      await ipc.invoke('scoring:invalidate')
      if (hasActiveTask) await ipc.invoke('task:stopped')
      toast.success(`Completed ${ids.length} task${ids.length > 1 ? 's' : ''}`)
    } catch {
      toast.error('Failed to complete tasks')
      reload()
    }
  }, [reload])

  const updateTasksPriority = useCallback(async (ids: string[], priority: Task['priority']) => {
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, priority } : t))
    try {
      await Promise.all(ids.map(id => ipc.invoke('tasks:update', id, { priority })))
    } catch {
      toast.error('Failed to update priority')
      reload()
    }
  }, [reload])

  const reorderTasks = useCallback(async (orderedIds: string[]) => {
    setTasks(prev => {
      const idSet = new Set(orderedIds)
      const reordered = orderedIds
        .map((id, i) => {
          const t = prev.find(p => p.id === id)
          return t ? { ...t, sort_order: i } : null
        })
        .filter((t): t is Task => t !== null)
      let i = 0
      return prev.map(t => idSet.has(t.id) ? reordered[i++] : t)
    })
    try {
      await ipc.invoke('tasks:reorder', orderedIds)
    } catch {
      toast.error('Failed to reorder tasks')
      reload()
    }
  }, [reload])

  const getSubtasks = useCallback(async (parentId: string): Promise<Task[]> => {
    return ipc.invoke<Task[]>('tasks:subtasks', parentId)
  }, [])

  const createSubtask = useCallback(async (parentId: string, data: Partial<Task>): Promise<Task | null> => {
    try {
      const created = await ipc.invoke<Task>('tasks:create', {
        ...data,
        parent_task_id: parentId,
        priority: data.priority || 'medium',
        status: 'pending',
      })
      return created
    } catch {
      toast.error('Failed to create subtask')
      return null
    }
  }, [])

  const completeSubtask = useCallback(async (id: string) => {
    try {
      await ipc.invoke('tasks:complete', id)
    } catch {
      toast.error('Failed to complete subtask')
    }
  }, [])

  const deleteSubtask = useCallback(async (id: string) => {
    try {
      await ipc.invoke('tasks:delete', id)
    } catch {
      toast.error('Failed to delete subtask')
    }
  }, [])

  return (
    <TaskContext.Provider value={{
      tasks, loading, reload,
      createTask, updateTask, completeTask, startTask,
      snoozeTask, deleteTask, deleteTasks, completeTasks, updateTasksPriority, reorderTasks,
      getSubtasks, createSubtask, completeSubtask, deleteSubtask,
    }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTaskContext() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider')
  return ctx
}
