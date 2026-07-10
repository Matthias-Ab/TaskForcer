import { useState, useRef, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOutsideClick } from '@/hooks/useOutsideClick'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  label?: string
  placeholder?: string
}

export function TagInput({ value, onChange, suggestions = [], label, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useOutsideClick(containerRef, showSuggestions, () => setShowSuggestions(false))

  const matches = draft.trim()
    ? suggestions.filter(s => s.toLowerCase().includes(draft.trim().toLowerCase()) && !value.includes(s)).slice(0, 6)
    : []

  function addTag(tag: string) {
    const clean = tag.trim()
    if (clean && !value.includes(clean)) onChange([...value, clean])
    setDraft('')
    setShowSuggestions(false)
  }

  function removeTag(tag: string) {
    onChange(value.filter(t => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(draft)
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      removeTag(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5 relative" ref={containerRef}>
      {label && (
        <label className="text-xs font-medium" style={{ color: 'var(--tf-text-muted)' }}>{label}</label>
      )}
      <div
        className="w-full rounded-xl px-2 py-1.5 border flex items-center gap-1 flex-wrap focus-within:ring-2 focus-within:ring-indigo-500"
        style={{ background: 'var(--tf-input-bg)', borderColor: 'var(--tf-input-border)' }}
      >
        {value.map(tag => (
          <span key={tag} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--tf-bg-tertiary)', color: 'var(--tf-text)' }}>
            {tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`} className="hover:text-red-400">
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={e => { setDraft(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm py-1 focus:outline-none"
          style={{ color: 'var(--tf-input-text)' }}
        />
      </div>
      {showSuggestions && matches.length > 0 && (
        <div
          className="absolute top-full mt-1 left-0 z-10 w-full rounded-xl border shadow-lg overflow-hidden"
          style={{ background: 'var(--tf-dialog-bg)', borderColor: 'var(--tf-border)' }}
        >
          {matches.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => addTag(m)}
              className={cn('block w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-[var(--tf-bg-tertiary)]')}
              style={{ color: 'var(--tf-text)' }}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
