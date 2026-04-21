import { useState, useEffect } from 'react'
import { Minus, Square, X, CheckSquare2 } from 'lucide-react'
import { ipc } from '@/lib/ipc'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    ipc.invoke<boolean>('window:is-maximized').then(setIsMaximized)
  }, [])

  return (
    <div
      className="titlebar-drag flex items-center justify-between h-10 px-4 flex-shrink-0 select-none border-b"
      style={{ borderColor: 'var(--tf-border)', background: 'var(--tf-bg)' }}
    >
      <div className="flex items-center gap-2 titlebar-no-drag">
        <CheckSquare2 size={16} className="text-indigo-400" />
        <span className="text-sm font-semibold" style={{ color: 'var(--tf-text-muted)' }}>TaskForcer</span>
      </div>

      <div className="titlebar-no-drag flex items-center gap-1">
        <WinBtn onClick={() => ipc.invoke('window:minimize')} icon={<Minus size={12} />} title="Minimize" danger={false} />
        <WinBtn
          onClick={() => { ipc.invoke('window:maximize'); setIsMaximized(m => !m) }}
          icon={<Square size={10} />}
          title={isMaximized ? 'Restore' : 'Maximize'}
          danger={false}
        />
        <WinBtn onClick={() => ipc.invoke('window:close')} icon={<X size={12} />} title="Close" danger />
      </div>
    </div>
  )
}

function WinBtn({ onClick, icon, title, danger }: { onClick: () => void; icon: React.ReactNode; title: string; danger: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-100 active:scale-90"
      style={{ color: 'var(--tf-text-muted)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? '#dc2626' : 'var(--tf-bg-tertiary)'
        if (danger) e.currentTarget.style.color = '#ffffff'
        else e.currentTarget.style.color = 'var(--tf-text)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = ''
        e.currentTarget.style.color = 'var(--tf-text-muted)'
      }}
    >
      {icon}
    </button>
  )
}
