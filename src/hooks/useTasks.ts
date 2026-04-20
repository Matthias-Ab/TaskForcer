import { useState, useEffect, useCallback } from 'react'
import { ipc } from '@/lib/ipc'
import { toast } from 'sonner'

export interface Task {
  id: string
  title: string
  description: string
  due_at: number | null
  priority: 'low' | 'medium' | 'critical'
  estimate_minutes: number
  status: 'pending' | 'in_progress' | 'completed' | 'snoozed' | 'cancelled'
  created_at: number
  completed_at: number | null
  recurrence_rule: string | null
  parent_task_id: string | null
  required_tools: string[]
  allowed_urls: string[]
  distraction_apps: string[]
  tags: string[]
}

export function useTodayTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await ipc.invoke<Task[]>('tasks:today')
    setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const completeTask = useCallback(async (id: string) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' as const } : t))
    try {
      await ipc.invoke('tasks:complete', id)
      await ipc.invoke('scoring:invalidate')
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending' as const } : t))
      toast.error('Failed to complete task')
    }
  }, [])

  const startTask = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id)
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'in_progress' as const } :
      t.status === 'in_progress' ? { ...t, status: 'pending' as const } : t
    ))
    try {
      const { task: updated, sessionId } = await ipc.invoke<{ task: Task; sessionId: string }>(
        'tasks:start', id
      )
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
      toast.success(`Snoozed for ${minutes} minutes`)
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

  const createTask = useCallback(async (data: Partial<Task>) => {
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
      recurrence_rule: null,
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

  return { tasks, loading, load, completeTask, startTask, snoozeTask, deleteTask, createTask }
}

export function useAllTasks(filter?: { status?: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await ipc.invoke<Task[]>('tasks:list', filter)
    setTasks(data)
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  return { tasks, loading, reload: load, setTasks }
}
