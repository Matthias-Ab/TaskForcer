import { useState, useEffect, useCallback, useRef } from 'react'
import { ipc } from '@/lib/ipc'
import { toast } from 'sonner'

const UNDO_WINDOW_MS = 5000

export interface Project {
  id: string
  name: string
  color: string
  emoji: string
  created_at: number
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const pendingDeletes = useRef(new Map<string, ReturnType<typeof setTimeout>>())

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
    const project = projects.find(p => p.id === id)
    if (!project) return
    setProjects(prev => prev.filter(p => p.id !== id))

    const timeoutId = setTimeout(async () => {
      pendingDeletes.current.delete(id)
      try {
        await ipc.invoke('projects:delete', id)
      } catch {
        toast.error('Failed to delete project')
        load()
      }
    }, UNDO_WINDOW_MS)
    pendingDeletes.current.set(id, timeoutId)

    toast(`Deleted project "${project.name}"`, {
      action: {
        label: 'Undo',
        onClick: () => {
          const pending = pendingDeletes.current.get(id)
          if (!pending) return
          clearTimeout(pending)
          pendingDeletes.current.delete(id)
          setProjects(prev => prev.some(p => p.id === id) ? prev : [...prev, project])
        },
      },
    })
  }, [projects, load])

  return { projects, createProject, updateProject, deleteProject, reload: load }
}
