import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Dialog({ open, onClose, title, children, footer, size = 'md' }: DialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            className={`relative z-10 rounded-2xl bg-zinc-900 border border-zinc-800/80 shadow-2xl ${
              size === 'sm' ? 'w-full max-w-sm' :
              size === 'lg' ? 'w-full max-w-2xl' :
              'w-full max-w-md'
            }`}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
              <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4">{children}</div>

            {/* Footer */}
            {footer && (
              <div className="flex justify-end gap-2 px-6 pb-5">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
