import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { scaleIn } from '@/lib/animations'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const SHORTCUTS = [
  { group: 'Navigation', items: [
    { keys: ['1-6'], label: 'Switch views' },
    { keys: ['⌘', 'K'], label: 'Command palette' },
    { keys: ['⌘', 'F'], label: 'Search tasks' },
    { keys: ['?'], label: 'Show shortcuts' },
  ]},
  { group: 'Tasks', items: [
    { keys: ['N'], label: 'New task' },
    { keys: ['⌘', 'Enter'], label: 'Complete selected' },
    { keys: ['Esc'], label: 'Close modal / deselect' },
  ]},
  { group: 'Quick Capture', items: [
    { keys: ['#tag'], label: 'Add tag inline' },
    { keys: ['!critical'], label: 'Set critical priority' },
    { keys: ['!high'], label: 'Set critical priority' },
    { keys: ['!low'], label: 'Set low priority' },
  ]},
  { group: 'Bulk Actions', items: [
    { keys: ['Click'], label: 'Select task (in selection mode)' },
    { keys: ['Delete'], label: 'Delete selected' },
  ]},
]

interface ShortcutHelpProps {
  open: boolean
  onClose: () => void
}

export function ShortcutHelp({ open, onClose }: ShortcutHelpProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, open, onClose)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-md rounded-2xl border shadow-2xl"
            style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--tf-border)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--tf-text)' }}>Keyboard Shortcuts</h2>
              <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 transition-colors" style={{ color: 'var(--tf-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--tf-bg-tertiary)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}>
                <X size={15} />
              </button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-x-8 gap-y-5">
              {SHORTCUTS.map(group => (
                <div key={group.group}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tf-text-faint)' }}>{group.group}</p>
                  <div className="space-y-2">
                    {group.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <span className="text-xs" style={{ color: 'var(--tf-text-muted)' }}>{item.label}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {item.keys.map((k, j) => (
                            <kbd key={j} className="text-[10px] px-1.5 py-0.5 rounded border font-mono" style={{ color: 'var(--tf-text)', borderColor: 'var(--tf-border)', background: 'var(--tf-bg-tertiary)' }}>
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
