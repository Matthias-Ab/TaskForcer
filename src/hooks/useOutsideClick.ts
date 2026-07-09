import { RefObject, useEffect } from 'react'

/** Calls `onOutside` on any mousedown outside `ref`'s element, while `active` is true. */
export function useOutsideClick(ref: RefObject<HTMLElement | null>, active: boolean, onOutside: () => void): void {
  useEffect(() => {
    if (!active) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [active, ref, onOutside])
}
