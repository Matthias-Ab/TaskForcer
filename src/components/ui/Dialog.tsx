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
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={`relative z-10 rounded-2xl shadow-2xl border ${
              size === 'sm' ? 'w-full max-w-sm' :
              size === 'lg' ? 'w-full max-w-2xl' :
              'w-full max-w-md'
            }`}
            style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--tf-border)' }}>
              <h2 className="text-base font-semibold" style={{ color: 'var(--tf-text)' }}>{title}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1 transition-colors"
                style={{ color: 'var(--tf-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 px-6 pb-5">{footer}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
