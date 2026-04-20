import { useState, useEffect, useCallback } from 'react'
import { ipc } from '@/lib/ipc'

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ipc.invoke<Record<string, string>>('settings:getAll').then(s => {
      setSettings(s)
      setLoading(false)
    })
  }, [])

  const setSetting = useCallback(async (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    try {
      await ipc.invoke('settings:set', key, value)
    } catch {
      setSettings(prev => ({ ...prev }))
    }
  }, [])

  return { settings, loading, setSetting }
}
