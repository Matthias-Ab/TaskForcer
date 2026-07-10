import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ipc } from '@/lib/ipc'
import { Task } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { useTaskContext } from '@/contexts/TaskContext'
import { useTemplates } from '@/hooks/useTemplates'
import { pageTransition } from '@/lib/animations'
import { CreateTaskForm } from '@/components/CreateTaskForm'
import { TaskCard } from '@/components/TaskCard'
import { TaskPreviewModal } from '@/components/TaskPreviewModal'
import { EditTaskForm } from '@/components/EditTaskForm'
import { CheckSquare2, Pencil, Trash2, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { toast } from 'sonner'

export function ProjectView() {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, updateProject, deleteProject } = useProjects()
  const { completeTask, startTask, snoozeTask, deleteTask, updateTask, createTask } = useTaskContext()
  const { saveTemplate: _saveTemplate } = useTemplates()
  const saveTemplate = useCallback((task: Task, name: string) => _saveTemplate(name, task), [_saveTemplate])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProject, setEditingProject] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectEmoji, setProjectEmoji] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [previewTask, setPreviewTask] = useState<Task | null>(null)

  const project = projects.find(p => p.id === projectId)

  const reload = useCallback(async () => {
    if (!projectId) return
    const data = await ipc.invoke<Task[]>('projects:tasks', projectId)
    setTasks(data)
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    reload().catch(() => setLoading(false))
  }, [reload])

  useEffect(() => {
    if (project) { setProjectName(project.name); setProjectEmoji(project.emoji) }
  }, [project])

  // ProjectView keeps its own task list, distinct from TaskContext's "today" scope,
  // so mutations there don't auto-sync here -- reload after each.
  const withReload = useCallback(<A extends unknown[]>(fn: (...a: A) => Promise<unknown>) =>
    async (...a: A) => { await fn(...a); await reload() },
  [reload])

  const handleComplete = withReload(completeTask)
  const handleStart = withReload(startTask)
  const handleSnooze = withReload(snoozeTask)
  const handleDelete = withReload(deleteTask)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = tasks.findIndex(t => t.id === active.id)
    const newIndex = tasks.findIndex(t => t.id === over.id)
    const reordered = arrayMove(tasks, oldIndex, newIndex)
    setTasks(reordered)
    await ipc.invoke('tasks:reorder', reordered.map(t => t.id))
  }

  async function saveProjectEdit() {
    if (!projectId || !projectName.trim()) return
    await updateProject(projectId, { name: projectName.trim(), emoji: projectEmoji })
    setEditingProject(false)
    toast.success('Project updated')
  }

  if (!project) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--tf-text-faint)' }}>
      Project not found
    </div>
  )

  const active = tasks.filter(t => t.status !== 'completed')
  const done = tasks.filter(t => t.status === 'completed')

  const cardProps = {
    onComplete: handleComplete,
    onStart: handleStart,
    onSnooze: handleSnooze,
    onDelete: handleDelete,
    onEdit: setEditingTask,
    onPreview: setPreviewTask,
    onSaveTemplate: saveTemplate,
  }

  return (
    <motion.div variants={pageTransition} initial="hidden" animate="visible" exit="exit" className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--tf-border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: project.color + '22', border: `1.5px solid ${project.color}44` }}>
            {project.emoji || project.name[0]}
          </div>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--tf-text)' }}>{project.name}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tf-text-muted)' }}>
              {active.length} active · {done.length} done
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEditingProject(true)}><Pencil size={13} /></Button>
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loading ? (
          <div className="space-y-2">{Array.from({length:4}).map((_,i)=><div key={i} className="h-12 rounded-xl animate-pulse" style={{background:'var(--tf-bg-tertiary)'}}/>)}</div>
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={active.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-1.5">
                  {active.map(task => (
                    <SortableTaskCard key={task.id} task={task} {...cardProps} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add task */}
            <CreateTaskForm
              compact
              onSubmit={async (data) => {
                await createTask({ ...data, project_id: projectId })
                await reload()
              }}
            />

            {/* Completed */}
            {done.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tf-text-faint)' }}>
                  <CheckCheck size={11} className="inline mr-1" />Completed ({done.length})
                </p>
                <div className="space-y-1 opacity-60">
                  {done.map(task => (
                    <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border" style={{ borderColor: 'var(--tf-card-border)', background: 'var(--tf-card-bg)' }}>
                      <CheckSquare2 size={14} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-sm line-through flex-1 truncate" style={{ color: 'var(--tf-text-faint)' }}>{task.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit project dialog */}
      <Dialog open={editingProject} onClose={() => setEditingProject(false)} title="Edit Project" size="sm">
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              value={projectEmoji}
              onChange={e => setProjectEmoji(e.target.value)}
              placeholder="😀"
              className="w-14 text-center rounded-xl px-2 py-2 text-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500"
              style={{ background: 'var(--tf-input-bg)', borderColor: 'var(--tf-input-border)', color: 'var(--tf-input-text)' }}
              maxLength={2}
            />
            <input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="Project name"
              className="flex-1 rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-indigo-500"
              style={{ background: 'var(--tf-input-bg)', borderColor: 'var(--tf-input-border)', color: 'var(--tf-input-text)' }}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-between">
            <Button size="sm" variant="danger" onClick={async () => {
              if (!confirm('Delete this project? Tasks will be unassigned.')) return
              await deleteProject(projectId!)
              setEditingProject(false)
            }}>
              <Trash2 size={12} /> Delete Project
            </Button>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditingProject(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={saveProjectEdit}>Save</Button>
            </div>
          </div>
        </div>
      </Dialog>

      <TaskPreviewModal
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onEdit={(task) => { setPreviewTask(null); setEditingTask(task) }}
        onComplete={handleComplete}
        onDelete={handleDelete}
        onStart={handleStart}
        onSnooze={handleSnooze}
      />

      <Dialog open={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task" size="md">
        {editingTask && (
          <EditTaskForm
            task={editingTask}
            onSubmit={async (data) => { await updateTask(editingTask.id, data); setEditingTask(null); await reload() }}
            onCancel={() => setEditingTask(null)}
          />
        )}
      </Dialog>
    </motion.div>
  )
}

function SortableTaskCard(props: Parameters<typeof TaskCard>[0]) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }} {...attributes} {...listeners}>
      <TaskCard {...props} />
    </div>
  )
}
