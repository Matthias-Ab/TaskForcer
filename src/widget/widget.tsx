import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import { motion } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { formatDuration } from '@/lib/utils'
import { Check, EyeOff, Timer, RotateCcw, Coffee } from 'lucide-react'
import '@/styles/globals.css'

const POMODORO_SECONDS = 25 * 60

type Mode = 'elapsed' | 'pomodoro'

function Widget() {
  const [taskTitle, setTaskTitle] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<Mode>('elapsed')

  // Elapsed timer
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number>(0)

  // Pomodoro
  const [pomodoroLeft, setPomodoroLeft] = useState(POMODORO_SECONDS)
  const [pomoDone, setPomoDone] = useState(false)
  const pomStartRef = useRef<number>(0)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null)

  const clearTick = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  useEffect(() => {
    ipc.on('widget:update-task', (...args: unknown[]) => {
      const payload = args[0] as { taskId: string | null; taskTitle: string | null }
      setTaskId(payload.taskId)
      setTaskTitle(payload.taskTitle)
      if (payload.taskId) {
        startTimeRef.current = Date.now()
        pomStartRef.current = Date.now()
        setElapsed(0)
        setPomodoroLeft(POMODORO_SECONDS)
        setPomoDone(false)
        setRunning(true)
      } else {
        setRunning(false)
        setPomoDone(false)
      }
    })
  }, [])

  useEffect(() => {
    clearTick()
    if (!running) return
    intervalRef.current = setInterval(() => {
      const now = Date.now()
      setElapsed(Math.floor((now - startTimeRef.current) / 1000))
      const left = Math.max(0, POMODORO_SECONDS - Math.floor((now - pomStartRef.current) / 1000))
      setPomodoroLeft(left)
      if (left === 0 && !pomDone) {
        setPomoDone(true)
        playBell()
      }
    }, 1000)
    return clearTick
  }, [running, clearTick])

  // Workaround: pomDone inside interval closure needs ref
  const pomDone = pomoDone
  function playBell() {
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.6)
    } catch {}
  }

  function resetPomodoro() {
    pomStartRef.current = Date.now()
    setPomodoroLeft(POMODORO_SECONDS)
    setPomoDone(false)
  }

  async function complete() {
    if (!taskId) return
    await ipc.invoke('tasks:complete', taskId)
    await ipc.invoke('task:stopped')
    setTaskTitle(null); setTaskId(null); setRunning(false); setPomoDone(false)
  }

  async function minimize() { await ipc.invoke('widget:minimize-temporarily') }

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return
    dragRef.current = { startX: e.screenX, startY: e.screenY, winX: 0, winY: 0 }
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return
    const dx = e.screenX - dragRef.current.startX
    const dy = e.screenY - dragRef.current.startY
    ipc.invoke('widget:set-position', dragRef.current.winX + dx, dragRef.current.winY + dy)
  }
  function handleMouseUp() { dragRef.current = null }

  const pomPct = pomodoroLeft / POMODORO_SECONDS
  const pomColor = pomoDone ? '#10b981' : pomodoroLeft < 60 ? '#ef4444' : pomodoroLeft < 5 * 60 ? '#f59e0b' : '#6366f1'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="w-full h-full rounded-2xl overflow-hidden select-none cursor-default"
      style={{
        background: 'rgba(9, 9, 11, 0.88)',
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
        <div className="flex items-center gap-2.5 px-3 h-full">
          {/* Active pulse */}
          <div className={`w-2 h-2 rounded-full flex-shrink-0 animate-pulse ${pomoDone ? 'bg-emerald-400' : 'bg-amber-400'}`} />

          {/* Task + timer display */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-zinc-400 leading-none mb-0.5">
              {mode === 'pomodoro' ? (pomoDone ? '🍅 Break time!' : 'Pomodoro') : 'Working on'}
            </p>
            <p className="text-xs font-medium text-zinc-100 truncate">{taskTitle}</p>
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center flex-shrink-0">
            {mode === 'pomodoro' ? (
              <div className="relative w-8 h-8">
                <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5" />
                  <circle
                    cx="16" cy="16" r="13" fill="none"
                    stroke={pomColor} strokeWidth="2.5"
                    strokeDasharray={`${2 * Math.PI * 13}`}
                    strokeDashoffset={`${2 * Math.PI * 13 * (1 - pomPct)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[8px] text-zinc-200">
                  {Math.floor(pomodoroLeft / 60)}:{String(pomodoroLeft % 60).padStart(2, '0')}
                </span>
              </div>
            ) : (
              <span className="font-mono text-sm tabular-nums text-amber-400">
                {formatDuration(elapsed)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => setMode(m => m === 'elapsed' ? 'pomodoro' : 'elapsed')}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
              title={mode === 'elapsed' ? 'Switch to Pomodoro' : 'Switch to elapsed'}
            >
              <Timer size={10} />
            </button>
            {mode === 'pomodoro' && (
              <button
                onClick={resetPomodoro}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
                title="Reset Pomodoro"
              >
                <RotateCcw size={10} />
              </button>
            )}
            {pomoDone && (
              <button
                onClick={resetPomodoro}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                title="Start next Pomodoro"
              >
                <Coffee size={10} />
              </button>
            )}
            <button onClick={minimize} className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors" title="Minimize for 30s">
              <EyeOff size={10} />
            </button>
            <button onClick={complete} className="w-6 h-6 rounded-lg flex items-center justify-center text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors" title="Mark complete">
              <Check size={10} />
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
