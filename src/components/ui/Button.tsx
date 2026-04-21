import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none',
          'active:scale-[0.97]',
          size === 'sm' && 'px-3 py-1.5 text-xs',
          size === 'md' && 'px-4 py-2 text-sm',
          size === 'lg' && 'px-5 py-2.5 text-base',
          variant === 'primary' && 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm',
          variant === 'secondary' && 'hover:opacity-80 text-[--tf-text] border',
          variant === 'ghost' && 'hover:text-[--tf-text] text-[--tf-text-muted]',
          variant === 'danger' && 'bg-red-600 hover:bg-red-500 text-white',
          variant === 'success' && 'bg-emerald-600 hover:bg-emerald-500 text-white',
          className
        )}
        style={variant === 'secondary' ? {
          background: 'var(--tf-bg-tertiary)',
          borderColor: 'var(--tf-border)',
          color: 'var(--tf-text)',
        } : variant === 'ghost' ? {
          color: 'var(--tf-text-muted)',
        } : undefined}
        onMouseEnter={e => {
          if (variant === 'ghost') (e.currentTarget as HTMLElement).style.background = 'var(--tf-bg-tertiary)'
        }}
        onMouseLeave={e => {
          if (variant === 'ghost') (e.currentTarget as HTMLElement).style.background = ''
        }}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
