import { useState, useEffect, useCallback, useRef } from 'react'
import { ipc } from '@/lib/ipc'
import { toast } from 'sonner'

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const settingsRef = useRef(settings)
  useEffect(() => { settingsRef.current = settings }, [settings])

  useEffect(() => {
    ipc.invoke<Record<string, string>>('settings:getAll').then(s => {
      setSettings(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const setSetting = useCallback(async (key: string, value: string) => {
    const previous = settingsRef.current[key]
    setSettings(prev => ({ ...prev, [key]: value }))
    try {
      await ipc.invoke('settings:set', key, value)
      if (key === 'auto_launch') {
        ipc.invoke('auto_launch:toggle', value === 'true').catch(() => {})
      }
    } catch {
      setSettings(prev => ({ ...prev, [key]: previous }))
      toast.error('Failed to save setting')
    }
  }, [])

  return { settings, loading, setSetting }
}
