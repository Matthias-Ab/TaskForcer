import { RefObject, useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(el => el.offsetParent !== null)
}

/**
 * Traps Tab focus within `containerRef` while `open` is true, and restores focus to
 * whatever was focused before the dialog opened. If `onClose` is provided, Escape
 * invokes it; otherwise Escape is swallowed (for dialogs with no legitimate dismiss action).
 */
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, open: boolean, onClose?: () => void): void {
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement | null

    const container = containerRef.current
    const focusable = container ? getFocusable(container) : []
    ;(focusable[0] ?? container)?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab' || !container) return

      const elements = getFocusable(container)
      if (elements.length === 0) {
        e.preventDefault()
        return
      }
      const first = elements[0]
      const last = elements[elements.length - 1]
      const active = document.activeElement

      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      } else if (!container.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      previouslyFocused.current?.focus?.()
    }
  }, [open, containerRef, onClose])
}
