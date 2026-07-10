import { motion } from 'framer-motion'
import { useRef } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/contexts/ThemeContext'
import { pageTransition } from '@/lib/animations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ipc } from '@/lib/ipc'
import { toast } from 'sonner'
import { Download, Upload, Trash2, RefreshCw, Sun, Moon, PlayCircle, CalendarDays, Lock } from 'lucide-react'

export function SettingsView() {
  const { settings, loading, setSetting } = useSettings()
  const { theme, toggleTheme } = useTheme()
  const importInputRef = useRef<HTMLInputElement>(null)
  const importIcsRef = useRef<HTMLInputElement>(null)
  const importEncryptedRef = useRef<HTMLInputElement>(null)

  if (loading) return null

  async function exportData() {
    const data = await ipc.invoke('settings:export')
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `taskforcer-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Data exported!')
  }

  async function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!confirm('Importing will REPLACE all current tasks, sessions, scores, and settings with the contents of this file. This cannot be undone. Continue?')) return
    try {
      const payload = JSON.parse(await file.text())
      await ipc.invoke('settings:import', payload)
      toast.success('Data imported — reloading...')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : 'invalid file'}`)
    }
  }

  async function exportEncrypted() {
    const result = await ipc.invoke<{ data: string; encrypted: boolean }>('settings:export-encrypted')
    const blob = new Blob([result.data], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `taskforcer-backup-${new Date().toISOString().split('T')[0]}.tfbackup`
    a.click()
    URL.revokeObjectURL(url)
    if (result.encrypted) {
      toast.success('Encrypted backup exported — only restorable on this computer, by this user')
    } else {
      toast.warning('Backup exported, but this system has no OS keychain available — it was NOT encrypted')
    }
  }

  async function importEncrypted(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!confirm('Importing will REPLACE all current tasks, sessions, scores, and settings with the contents of this backup. This cannot be undone. Continue?')) return
    try {
      const data = await file.text()
      await ipc.invoke('settings:import-encrypted', { data })
      toast.success('Backup restored — reloading...')
      setTimeout(() => window.location.reload(), 800)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Restore failed')
    }
  }

  async function exportIcs() {
    const ics = await ipc.invoke<string>('calendar:export-ics')
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `taskforcer-calendar-${new Date().toISOString().split('T')[0]}.ics`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Calendar exported!')
  }

  async function importIcs(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const result = await ipc.invoke<{ imported: number; total: number }>('calendar:import-ics', text)
      toast.success(`Imported ${result.imported} of ${result.total} event${result.total !== 1 ? 's' : ''} as tasks`)
    } catch (err) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : 'invalid .ics file'}`)
    }
  }

  async function clearShameLog() {
    if (!confirm('Clear your shame log? Cannot be undone.')) return
    await ipc.invoke('settings:clearShameLog')
    toast.success('Shame log cleared')
  }

  async function resetStreaks() {
    if (!confirm('Reset all streaks to 0?')) return
    await ipc.invoke('settings:resetStreaks')
    toast.success('Streaks reset')
  }

  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex flex-col h-full overflow-hidden"
    >
      <div className="px-6 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--tf-border)' }}>
        <h1 className="text-lg font-semibold" style={{ color: 'var(--tf-text)' }}>Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--tf-text)' }}>Theme</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--tf-text-muted)' }}>
                Currently using {theme} mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors"
              style={{ background: 'var(--tf-bg-tertiary)', borderColor: 'var(--tf-border)', color: 'var(--tf-text)' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </Section>

        {/* Work hours */}
        <Section title="Work Hours">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start time"
              type="time"
              value={settings.work_start || '09:00'}
              onChange={e => setSetting('work_start', e.target.value)}
            />
            <Input
              label="End time"
              type="time"
              value={settings.work_end || '18:00'}
              onChange={e => setSetting('work_end', e.target.value)}
            />
          </div>
        </Section>

        {/* Forcing settings */}
        <Section title="Forcing Mechanisms">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--tf-text-muted)' }}>Check-in interval by priority (minutes)</p>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="Critical"
                  type="number"
                  value={settings.checkin_interval_critical || '15'}
                  onChange={e => setSetting('checkin_interval_critical', e.target.value)}
                  min="5" max="120"
                />
                <Input
                  label="Medium"
                  type="number"
                  value={settings.checkin_interval_medium || '25'}
                  onChange={e => setSetting('checkin_interval_medium', e.target.value)}
                  min="5" max="120"
                />
                <Input
                  label="Low"
                  type="number"
                  value={settings.checkin_interval_low || '40'}
                  onChange={e => setSetting('checkin_interval_low', e.target.value)}
                  min="5" max="120"
                />
              </div>
            </div>
            <Input
              label="End-of-day lockout threshold (score 0–100)"
              type="number"
              value={settings.lockout_threshold || '50'}
              onChange={e => setSetting('lockout_threshold', e.target.value)}
              min="0"
              max="100"
            />
            <Input
              label="Idle detection threshold (minutes)"
              type="number"
              value={settings.idle_threshold_min || '10'}
              onChange={e => setSetting('idle_threshold_min', e.target.value)}
              min="5"
            />
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <div className="space-y-4">
            <Toggle
              label="Notify when a task is due in 15 minutes"
              checked={settings.notify_due_soon !== 'false'}
              onChange={v => setSetting('notify_due_soon', v ? 'true' : 'false')}
            />
            <Toggle
              label="Notify when a task becomes overdue"
              checked={settings.notify_overdue !== 'false'}
              onChange={v => setSetting('notify_overdue', v ? 'true' : 'false')}
            />
            <Toggle
              label="Notify when idle with critical tasks pending"
              checked={settings.notify_idle !== 'false'}
              onChange={v => setSetting('notify_idle', v ? 'true' : 'false')}
            />
          </div>
        </Section>

        {/* Focus tracking */}
        <Section title="Focus Tracking">
          <div className="space-y-4">
            <Toggle
              label="Enable focus tracking (read-only window polling)"
              checked={settings.focus_tracking !== 'false'}
              onChange={v => setSetting('focus_tracking', v ? 'true' : 'false')}
            />
            <Toggle
              label="Enable sounds"
              checked={settings.sound_enabled !== 'false'}
              onChange={v => setSetting('sound_enabled', v ? 'true' : 'false')}
            />
            <Toggle
              label="Launch at startup"
              checked={settings.auto_launch === 'true'}
              onChange={v => setSetting('auto_launch', v ? 'true' : 'false')}
            />
          </div>
        </Section>

        {/* Personality */}
        <Section title="Personality">
          <div className="space-y-4">
            <Toggle
              label="🔥 Roast mode — shame log entries written in sarcastic tone"
              checked={settings.roast_mode === 'true'}
              onChange={v => setSetting('roast_mode', v ? 'true' : 'false')}
            />
          </div>
        </Section>

        {/* Data */}
        <Section title="Data">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={exportData}>
              <Download size={14} />
              Export JSON
            </Button>
            <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={importData} />
            <Button variant="secondary" size="sm" onClick={() => importInputRef.current?.click()}>
              <Upload size={14} />
              Import JSON
            </Button>
            <Button variant="secondary" size="sm" onClick={exportIcs}>
              <CalendarDays size={14} />
              Export Calendar (.ics)
            </Button>
            <input ref={importIcsRef} type="file" accept=".ics,text/calendar" className="hidden" onChange={importIcs} />
            <Button variant="secondary" size="sm" onClick={() => importIcsRef.current?.click()}>
              <CalendarDays size={14} />
              Import Calendar (.ics)
            </Button>
            <Button variant="secondary" size="sm" onClick={exportEncrypted}>
              <Lock size={14} />
              Export Encrypted Backup
            </Button>
            <input ref={importEncryptedRef} type="file" accept=".tfbackup" className="hidden" onChange={importEncrypted} />
            <Button variant="secondary" size="sm" onClick={() => importEncryptedRef.current?.click()}>
              <Lock size={14} />
              Restore Encrypted Backup
            </Button>
            <Button variant="ghost" size="sm" onClick={clearShameLog} className="!text-red-500">
              <Trash2 size={14} />
              Clear Shame Log
            </Button>
            <Button variant="ghost" size="sm" onClick={resetStreaks} className="!text-amber-500">
              <RefreshCw size={14} />
              Reset Streaks
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSetting('onboarding_complete', 'false')}>
              <PlayCircle size={14} />
              Replay Welcome Tour
            </Button>
          </div>
        </Section>
      </div>
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--tf-text-muted)' }}>{title}</h2>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-indigo-600' : ''}`}
        style={!checked ? { background: 'var(--tf-bg-tertiary)' } : {}}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-sm transition-colors" style={{ color: 'var(--tf-text-muted)' }}>{label}</span>
    </label>
  )
}
