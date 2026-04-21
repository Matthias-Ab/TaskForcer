import { motion } from 'framer-motion'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/contexts/ThemeContext'
import { pageTransition } from '@/lib/animations'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ipc } from '@/lib/ipc'
import { toast } from 'sonner'
import { Download, Trash2, RefreshCw, Sun, Moon } from 'lucide-react'

export function SettingsView() {
  const { settings, loading, setSetting } = useSettings()
  const { theme, toggleTheme } = useTheme()

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
            <Input
              label="Check-in interval (minutes)"
              type="number"
              value={settings.checkin_interval_min || '25'}
              onChange={e => setSetting('checkin_interval_min', e.target.value)}
              min="5"
              max="120"
            />
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

        {/* Data */}
        <Section title="Data">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="sm" onClick={exportData}>
              <Download size={14} />
              Export JSON
            </Button>
            <Button variant="ghost" size="sm" onClick={clearShameLog} className="!text-red-500">
              <Trash2 size={14} />
              Clear Shame Log
            </Button>
            <Button variant="ghost" size="sm" onClick={resetStreaks} className="!text-amber-500">
              <RefreshCw size={14} />
              Reset Streaks
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
