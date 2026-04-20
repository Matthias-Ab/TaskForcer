import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom/client'
import { motion } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { formatDuration } from '@/lib/utils'
import { Check, EyeOff } from 'lucide-react'
import '@/styles/globals.css'

function Widget() {
  const [taskTitle, setTaskTitle] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null)

  useEffect(() => {
    ipc.on('widget:update-task', (...args: unknown[]) => {
      const payload = args[0] as { taskId: string | null; taskTitle: string | null }
      setTaskId(payload.taskId)
      setTaskTitle(payload.taskTitle)
      if (payload.taskId) {
        startTimeRef.current = Date.now()
        setElapsed(0)
        setRunning(true)
      } else {
        setRunning(false)
      }
    })
  }, [])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  async function complete() {
    if (!taskId) return
    await ipc.invoke('tasks:complete', taskId)
    await ipc.invoke('task:stopped')
    setTaskTitle(null)
    setTaskId(null)
    setRunning(false)
  }

  async function minimize() {
    await ipc.invoke('widget:minimize-temporarily')
  }

  function handleMouseDown(e: React.MouseEvent) {
    // Only allow drag on the main bar, not buttons
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return
    dragRef.current = { startX: e.screenX, startY: e.screenY, winX: 0, winY: 0 }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return
    const dx = e.screenX - dragRef.current.startX
    const dy = e.screenY - dragRef.current.startY
    ipc.invoke('widget:set-position', dragRef.current.winX + dx, dragRef.current.winY + dy)
  }

  function handleMouseUp() {
    dragRef.current = null
  }

  const scoreColor = elapsed > 0 ? 'text-amber-400' : 'text-zinc-400'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="w-full h-full rounded-2xl overflow-hidden select-none cursor-default"
      style={{
        background: 'rgba(9, 9, 11, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(63, 63, 70, 0.5)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {taskTitle ? (
        <div className="flex items-center gap-3 px-4 h-full">
          {/* Active indicator */}
          <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />

          {/* Task info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-400 leading-none mb-0.5">Working on</p>
            <p className="text-sm font-medium text-zinc-100 truncate">{taskTitle}</p>
          </div>

          {/* Timer */}
          <span className={`font-mono text-sm tabular-nums ${scoreColor}`}>
            {formatDuration(elapsed)}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={minimize}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              title="Minimize for 30s"
            >
              <EyeOff size={12} />
            </button>
            <button
              onClick={complete}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              title="Mark complete"
            >
              <Check size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 h-full">
          <div className="w-2 h-2 rounded-full bg-zinc-700 flex-shrink-0" />
          <p className="text-xs text-zinc-600">No active task — start one in TaskForcer</p>
        </div>
      )}
    </motion.div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Widget />
  </React.StrictMode>
)
