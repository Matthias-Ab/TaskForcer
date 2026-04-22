import { useState, useEffect, useCallback } from 'react'
import { ipc } from '@/lib/ipc'
import { Task } from './useTasks'
import { toast } from 'sonner'

export interface TaskTemplate {
  id: string
  name: string
  data: Pick<Task, 'title' | 'description' | 'priority' | 'estimate_minutes' | 'tags' | 'recurrence_rule'>
  created_at: number
}

export function useTemplates() {
  const [templates, setTemplates] = useState<TaskTemplate[]>([])

  const load = useCallback(async () => {
    const data = await ipc.invoke<TaskTemplate[]>('templates:list')
    setTemplates(data)
  }, [])

  useEffect(() => { load() }, [load])

  const saveTemplate = useCallback(async (name: string, task: Task) => {
    const data = {
      title: task.title,
      description: task.description,
      priority: task.priority,
      estimate_minutes: task.estimate_minutes,
      tags: task.tags,
      recurrence_rule: task.recurrence_rule,
    }
    const tmpl = await ipc.invoke<TaskTemplate>('templates:save', name, data)
    setTemplates(prev => [tmpl, ...prev])
    toast.success(`Template "${name}" saved`)
    return tmpl
  }, [])

  const deleteTemplate = useCallback(async (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
    await ipc.invoke('templates:delete', id)
  }, [])

  return { templates, saveTemplate, deleteTemplate, reload: load }
}
