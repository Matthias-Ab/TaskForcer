import { useState, useEffect, useCallback } from 'react'
import { ipc } from '@/lib/ipc'

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
  project_id: string | null
  sort_order: number
  blocked_by: string[]
  elapsed_seconds: number
  required_tools: string[]
  allowed_urls: string[]
  distraction_apps: string[]
  tags: string[]
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
