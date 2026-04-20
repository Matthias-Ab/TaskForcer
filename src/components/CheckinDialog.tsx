import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ipc } from '@/lib/ipc'
import { Button } from './ui/Button'
import { scaleIn } from '@/lib/animations'
import { CheckSquare2, X } from 'lucide-react'

export function CheckinDialog() {
  const [open, setOpen] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [taskTitle, setTaskTitle] = useState('')

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const payload = args[0] as { taskId: string; taskTitle: string }
      setTaskId(payload.taskId)
      setTaskTitle(payload.taskTitle)
      setOpen(true)
    }
    ipc.on('forcing:checkin-request', handler)
    return () => ipc.off('forcing:checkin-request', handler)
  }, [])

  async function respond(stillWorking: boolean) {
    setOpen(false)
    await ipc.invoke('forcing:checkin-response', taskId, stillWorking)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-2xl p-6 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-600/20 flex items-center justify-center mx-auto mb-4">
              <CheckSquare2 size={24} className="text-indigo-400" />
            </div>
            <h2 className="text-base font-semibold text-zinc-100 mb-1">Check-in Time!</h2>
            <p className="text-sm text-zinc-400 mb-6">
              Still working on:{' '}
              <span className="text-zinc-200 font-medium">"{taskTitle}"</span>?
            </p>
            <div className="flex gap-3">
              <Button
                className="flex-1"
                variant="danger"
                onClick={() => respond(false)}
              >
                <X size={14} />
                No, distracted
              </Button>
              <Button
                className="flex-1"
                variant="success"
                onClick={() => respond(true)}
              >
                <CheckSquare2 size={14} />
                Yes, on it!
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
