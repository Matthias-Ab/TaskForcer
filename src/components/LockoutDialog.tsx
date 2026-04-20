import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { Button } from './ui/Button'
import { Textarea } from './ui/Input'
import { scaleIn } from '@/lib/animations'
import { Lock, AlertTriangle } from 'lucide-react'

export function LockoutDialog() {
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState(0)
  const [threshold, setThreshold] = useState(50)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const payload = args[0] as { score: number; threshold: number }
      setScore(payload.score)
      setThreshold(payload.threshold)
      setOpen(true)
    }
    ipc.on('forcing:lockout-request', handler)
    return () => ipc.off('forcing:lockout-request', handler)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (reason.length < 20) return
    setLoading(true)
    await ipc.invoke('forcing:lockout-excuse', reason)
    setOpen(false)
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md rounded-2xl bg-zinc-900 border border-red-500/30 shadow-2xl shadow-red-500/10 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Lock size={20} className="text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-100">Productivity Lockout</h2>
                <p className="text-xs text-zinc-500">You must explain before quitting</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">
                Your score today is <strong>{Math.round(score)}/100</strong> (minimum {threshold} to quit freely).
                Provide a written reason to continue (min 20 characters).
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                label="Why are you quitting without completing your tasks?"
                placeholder="Be honest. This will be logged to your shame log..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={4}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono ${reason.length >= 20 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {reason.length}/20 min chars
                </span>
                <Button
                  type="submit"
                  variant="danger"
                  disabled={reason.length < 20 || loading}
                >
                  Log & Quit
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
