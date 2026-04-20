import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './widget.html',
    './morning.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design system tokens
        'tf-bg': 'var(--tf-bg)',
        'tf-bg-secondary': 'var(--tf-bg-secondary)',
        'tf-bg-tertiary': 'var(--tf-bg-tertiary)',
        'tf-border': 'var(--tf-border)',
        'tf-border-subtle': 'var(--tf-border-subtle)',
        'tf-text': 'var(--tf-text)',
        'tf-text-muted': 'var(--tf-text-muted)',
        'tf-text-faint': 'var(--tf-text-faint)',
        'tf-critical': 'var(--tf-critical)',
        'tf-critical-bg': 'var(--tf-critical-bg)',
        'tf-complete': 'var(--tf-complete)',
        'tf-complete-bg': 'var(--tf-complete-bg)',
        'tf-progress': 'var(--tf-progress)',
        'tf-progress-bg': 'var(--tf-progress-bg)',
        'tf-accent': 'var(--tf-accent)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      spacing: {
        '3': '12px',
        '4': '16px',
        '6': '24px',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
