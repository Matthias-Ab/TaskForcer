import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { motion } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { Task } from '@/hooks/useTasks'
import { formatDate, cn } from '@/lib/utils'
import { AlertTriangle, CheckSquare2, Sun } from 'lucide-react'
import '@/styles/globals.css'

function MorningPopup() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ipc.invoke<Task[]>('tasks:today').then(t => {
      setTasks(t.filter(task => task.priority === 'critical' || task.priority === 'medium'))
      setLoading(false)
    })
  }, [])

  const critical = tasks.filter(t => t.priority === 'critical')
  const medium = tasks.filter(t => t.priority === 'medium')

  async function dismiss() {
    if (!acknowledged) return
    await ipc.invoke('morning:dismiss')
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Gradient header */}
      <div className="flex-shrink-0 px-8 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="flex items-center gap-3 mb-2"
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 flex items-center justify-center">
            <Sun size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Good morning!</h1>
            <p className="text-sm text-zinc-500">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-8 pb-4">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-zinc-800/40 animate-pulse" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare2 size={32} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-zinc-400">No tasks scheduled for today. Add some!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {critical.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                    Critical ({critical.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {critical.map(task => <MorningTaskRow key={task.id} task={task} />)}
                </div>
              </div>
            )}
            {medium.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                  Medium Priority ({medium.length})
                </span>
                <div className="space-y-1.5">
                  {medium.map(task => <MorningTaskRow key={task.id} task={task} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Acknowledgement */}
      <div className="flex-shrink-0 px-8 pb-8 pt-4 border-t border-zinc-800/40">
        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <div
            className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
              acknowledged ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600 hover:border-indigo-500'
            )}
            onClick={() => setAcknowledged(a => !a)}
          >
            {acknowledged && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-sm text-zinc-300">I acknowledge my tasks for today and commit to completing them</span>
        </label>

        <motion.button
          onClick={dismiss}
          disabled={!acknowledged}
          whileHover={acknowledged ? { scale: 1.02 } : {}}
          whileTap={acknowledged ? { scale: 0.98 } : {}}
          className={cn(
            'w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200',
            acknowledged
              ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          )}
        >
          Let's get to work →
        </motion.button>
      </div>
    </div>
  )
}

function MorningTaskRow({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-zinc-800/40 bg-zinc-900/30">
      <div className={cn(
        'w-1.5 h-1.5 rounded-full',
        task.priority === 'critical' ? 'bg-red-500' : 'bg-amber-400'
      )} />
      <span className="text-sm text-zinc-200 flex-1 truncate">{task.title}</span>
      {task.due_at && (
        <span className="text-xs text-zinc-500 font-mono">{formatDate(task.due_at)}</span>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MorningPopup />
  </React.StrictMode>
)
