import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium" style={{ color: 'var(--tf-text-muted)' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl px-3 py-2 text-sm border transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          style={{
            background: 'var(--tf-input-bg)',
            borderColor: error ? undefined : 'var(--tf-input-border)',
            color: 'var(--tf-input-text)',
            ...style,
          }}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className, style, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-xs font-medium" style={{ color: 'var(--tf-text-muted)' }}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-xl px-3 py-2 text-sm border resize-none transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            className
          )}
          style={{
            background: 'var(--tf-input-bg)',
            borderColor: 'var(--tf-input-border)',
            color: 'var(--tf-input-text)',
            ...style,
          }}
          {...props}
        />
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
