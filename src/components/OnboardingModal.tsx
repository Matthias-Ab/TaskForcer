import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare2, Bell, Lock, Flame, ArrowRight, ArrowLeft } from 'lucide-react'
import { useSettings } from '@/hooks/useSettings'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { useFocusTrap } from '@/hooks/useFocusTrap'

const STEPS = ['welcome', 'schedule', 'personality', 'done'] as const

export function OnboardingModal() {
  const { settings, loading, setSetting } = useSettings()
  const [step, setStep] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const open = !loading && settings.onboarding_complete !== 'true'
  useFocusTrap(panelRef, open)

  function finish() {
    setSetting('onboarding_complete', 'true')
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to TaskForcer"
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
          style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
        >
          <div className="p-8 min-h-[380px] flex flex-col">
            <div className="flex-1">
              {STEPS[step] === 'welcome' && (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-600/30 flex items-center justify-center mx-auto mb-4">
                    <CheckSquare2 size={26} className="text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>Welcome to TaskForcer</h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--tf-text-muted)' }}>
                    This isn't a gentle to-do list. TaskForcer actively forces you to stay on task with
                    check-ins, a public shame log, and an end-of-day lockout — because willpower alone
                    hasn't been working.
                  </p>
                  <div className="grid grid-cols-3 gap-3 mt-6 text-left">
                    <FeatureCard icon={<Bell size={16} className="text-amber-400" />} title="Check-ins" desc="Periodic 'still on task?' prompts while you work" />
                    <FeatureCard icon={<Flame size={16} className="text-red-400" />} title="Shame log" desc="Every distraction and missed task, logged" />
                    <FeatureCard icon={<Lock size={16} className="text-purple-400" />} title="Lockout" desc="Explain yourself before quitting on a bad day" />
                  </div>
                </div>
              )}

              {STEPS[step] === 'schedule' && (
                <div>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>Set your schedule</h2>
                  <p className="text-sm mb-5" style={{ color: 'var(--tf-text-muted)' }}>
                    These drive when check-ins fire and when the end-of-day lockout kicks in. You can change these anytime in Settings.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Work start"
                      type="time"
                      value={settings.work_start || '09:00'}
                      onChange={e => setSetting('work_start', e.target.value)}
                    />
                    <Input
                      label="Work end"
                      type="time"
                      value={settings.work_end || '18:00'}
                      onChange={e => setSetting('work_end', e.target.value)}
                    />
                    <Input
                      label="Check-in interval (min)"
                      type="number"
                      min="5" max="120"
                      value={settings.checkin_interval_min || '25'}
                      onChange={e => setSetting('checkin_interval_min', e.target.value)}
                    />
                    <Input
                      label="Lockout threshold (score)"
                      type="number"
                      min="0" max="100"
                      value={settings.lockout_threshold || '50'}
                      onChange={e => setSetting('lockout_threshold', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {STEPS[step] === 'personality' && (
                <div>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--tf-text)' }}>Pick your tone</h2>
                  <p className="text-sm mb-5" style={{ color: 'var(--tf-text-muted)' }}>
                    Roast mode rewrites shame log entries in a sarcastic, mocking tone instead of a plain factual one.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSetting('roast_mode', 'true')}
                      className="flex-1 rounded-xl border p-4 text-left transition-colors"
                      style={{
                        borderColor: settings.roast_mode === 'true' ? '#6366f1' : 'var(--tf-border)',
                        background: settings.roast_mode === 'true' ? 'rgba(99,102,241,0.1)' : 'var(--tf-card-bg)',
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: 'var(--tf-text)' }}>🔥 Roast mode</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--tf-text-muted)' }}>"Another task sent to the graveyard. RIP."</p>
                    </button>
                    <button
                      onClick={() => setSetting('roast_mode', 'false')}
                      className="flex-1 rounded-xl border p-4 text-left transition-colors"
                      style={{
                        borderColor: settings.roast_mode !== 'true' ? '#6366f1' : 'var(--tf-border)',
                        background: settings.roast_mode !== 'true' ? 'rgba(99,102,241,0.1)' : 'var(--tf-card-bg)',
                      }}
                    >
                      <p className="text-sm font-medium" style={{ color: 'var(--tf-text)' }}>Plain mode</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--tf-text-muted)' }}>"Missed task: 'Write the report'"</p>
                    </button>
                  </div>
                </div>
              )}

              {STEPS[step] === 'done' && (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center mx-auto mb-4">
                    <CheckSquare2 size={26} className="text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--tf-text)' }}>You're set up</h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--tf-text-muted)' }}>
                    Add your first task, hit start, and TaskForcer takes it from there. Every setting here
                    can be changed later from Settings.
                  </p>
                </div>
              )}
            </div>

            {/* Step dots */}
            <div className="flex justify-center gap-1.5 my-5">
              {STEPS.map((s, i) => (
                <div key={s} className="h-1.5 rounded-full transition-all" style={{
                  width: i === step ? 20 : 6,
                  background: i === step ? '#6366f1' : 'var(--tf-bg-tertiary)',
                }} />
              ))}
            </div>

            <div className="flex items-center justify-between">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft size={14} /> Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={finish}>Skip</Button>
              )}
              {step < STEPS.length - 1 ? (
                <Button variant="primary" onClick={() => setStep(s => s + 1)}>
                  Next <ArrowRight size={14} />
                </Button>
              ) : (
                <Button variant="primary" onClick={finish}>Let's get to work</Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-card-bg)' }}>
      <div className="mb-1.5">{icon}</div>
      <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--tf-text)' }}>{title}</p>
      <p className="text-[11px] leading-snug" style={{ color: 'var(--tf-text-faint)' }}>{desc}</p>
    </div>
  )
}
