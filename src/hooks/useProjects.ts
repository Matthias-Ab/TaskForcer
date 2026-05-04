import { useState, useEffect, useCallback } from 'react'
import { ipc } from '@/lib/ipc'
import { toast } from 'sonner'

export interface Project {
  id: string
  name: string
  color: string
  emoji: string
  created_at: number
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])

  const load = useCallback(async () => {
    const data = await ipc.invoke<Project[]>('projects:list')
    setProjects(data)
  }, [])

  useEffect(() => { load() }, [load])

  const createProject = useCallback(async (data: { name: string; color: string; emoji: string }) => {
    try {
      const p = await ipc.invoke<Project>('projects:create', data)
      setProjects(prev => [...prev, p])
      return p
    } catch {
      toast.error('Failed to create project')
      return null
    }
  }, [])

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => {
    try {
      const p = await ipc.invoke<Project>('projects:update', id, data)
      if (p) setProjects(prev => prev.map(x => x.id === id ? p : x))
      return p
    } catch {
      toast.error('Failed to update project')
      return null
    }
  }, [])

  const deleteProject = useCallback(async (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    try {
      await ipc.invoke('projects:delete', id)
    } catch {
      toast.error('Failed to delete project')
      load()
    }
  }, [load])

  return { projects, createProject, updateProject, deleteProject, reload: load }
}
