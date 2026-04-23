import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { ipc } from '@/lib/ipc'
import { toast } from 'sonner'
import { Task } from '@/hooks/useTasks'

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
  getSubtasks: (parentId: string) => Promise<Task[]>
  createSubtask: (parentId: string, data: Partial<Task>) => Promise<Task | null>
  completeSubtask: (id: string) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
}

const TaskContext = createContext<TaskContextValue | null>(null)

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

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
      parent_task_id: null,
      required_tools: [],
      allowed_urls: [],
      distraction_apps: [],
      tags: data.tags || [],
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
    const prev = tasks.find(t => t.id === id)
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
  }, [tasks])

  const completeTask = useCallback(async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' as const } : t))
    try {
      await ipc.invoke('tasks:complete', id)
      await ipc.invoke('scoring:invalidate')
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' as const } : t))
      toast.error('Failed to complete task')
    }
  }, [])

  const startTask = useCallback(async (id: string): Promise<Task | null> => {
    const task = tasks.find(t => t.id === id)
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'in_progress' as const } :
      t.status === 'in_progress' ? { ...t, status: 'pending' as const } : t
    ))
    try {
      const { task: updated, sessionId } = await ipc.invoke<{ task: Task; sessionId: string }>('tasks:start', id)
      if (task) {
        await ipc.invoke('task:started', id, task.title)
        await ipc.invoke('forcing:start-task-session', id)
        await ipc.invoke('focus:start', sessionId, id)
      }
      return updated
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' as const } : t))
      toast.error('Failed to start task')
      return null
    }
  }, [tasks])

  const snoozeTask = useCallback(async (id: string, minutes = 30) => {
    const task = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await ipc.invoke('tasks:snooze', id, minutes)
      toast.success(`Snoozed for ${minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}`)
    } catch {
      if (task) setTasks(prev => [...prev, task])
      toast.error('Failed to snooze task')
    }
  }, [tasks])

  const deleteTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))
    try {
      await ipc.invoke('tasks:delete', id)
    } catch {
      if (task) setTasks(prev => [...prev, task])
      toast.error('Failed to delete task')
    }
  }, [tasks])

  const deleteTasks = useCallback(async (ids: string[]) => {
    const removed = tasks.filter(t => ids.includes(t.id))
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
    try {
      await Promise.all(ids.map(id => ipc.invoke('tasks:delete', id)))
      toast.success(`Deleted ${ids.length} task${ids.length > 1 ? 's' : ''}`)
    } catch {
      setTasks(prev => [...prev, ...removed])
      toast.error('Failed to delete tasks')
    }
  }, [tasks])

  const completeTasks = useCallback(async (ids: string[]) => {
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: 'completed' as const } : t))
    try {
      await Promise.all(ids.map(id => ipc.invoke('tasks:complete', id)))
      await ipc.invoke('scoring:invalidate')
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
      snoozeTask, deleteTask, deleteTasks, completeTasks, updateTasksPriority,
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
