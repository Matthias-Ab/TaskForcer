import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-xs font-medium text-zinc-400">{label}</label>}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl bg-zinc-800/80 border border-zinc-700/60 px-3 py-2 text-sm text-zinc-100',
            'placeholder:text-zinc-600',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'transition-all duration-150',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
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
  ({ label, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-xs font-medium text-zinc-400">{label}</label>}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-xl bg-zinc-800/80 border border-zinc-700/60 px-3 py-2 text-sm text-zinc-100 resize-none',
            'placeholder:text-zinc-600',
            'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
            'transition-all duration-150',
            className
          )}
          {...props}
        />
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
