import { useState, useEffect } from 'react'
import { ipc } from '@/lib/ipc'

export interface XPStatus {
  total_xp: number
  level: number
  level_title: string
  xp_in_level: number
  xp_for_next: number
  xp_pct: number
}

export function useXP() {
  const [xp, setXP] = useState<XPStatus | null>(null)
  const [freezes, setFreezes] = useState(0)

  async function load() {
    const [xpData, freezeCount] = await Promise.all([
      ipc.invoke<XPStatus>('scores:xp'),
      ipc.invoke<number>('scores:streak-freezes'),
    ])
    setXP(xpData)
    setFreezes(freezeCount)
  }

  useEffect(() => { load() }, [])

  async function useFreeze() {
    const result = await ipc.invoke<{ ok: boolean; streak_restored?: number; reason?: string }>('scores:use-freeze')
    if (result.ok) {
      await load()
      return result
    }
    return result
  }

  return { xp, freezes, reload: load, useFreeze }
}
