import { useState, useEffect } from 'react'
import { Minus, Square, X, CheckSquare2 } from 'lucide-react'
import { ipc } from '@/lib/ipc'
import { cn } from '@/lib/utils'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    ipc.invoke<boolean>('window:is-maximized').then(setIsMaximized)
  }, [])

  return (
    <div className="titlebar-drag flex items-center justify-between h-10 px-4 flex-shrink-0 select-none border-b border-zinc-800/60">
      {/* App identity */}
      <div className="flex items-center gap-2 titlebar-no-drag">
        <CheckSquare2 size={16} className="text-indigo-400" />
        <span className="text-sm font-semibold text-zinc-300">TaskForcer</span>
      </div>

      {/* Window controls */}
      <div className="titlebar-no-drag flex items-center gap-1">
        <WindowButton
          onClick={() => ipc.invoke('window:minimize')}
          icon={<Minus size={12} />}
          title="Minimize"
          hoverClass="hover:bg-zinc-700"
        />
        <WindowButton
          onClick={() => {
            ipc.invoke('window:maximize')
            setIsMaximized(m => !m)
          }}
          icon={<Square size={10} />}
          title={isMaximized ? 'Restore' : 'Maximize'}
          hoverClass="hover:bg-zinc-700"
        />
        <WindowButton
          onClick={() => ipc.invoke('window:close')}
          icon={<X size={12} />}
          title="Close"
          hoverClass="hover:bg-red-600"
        />
      </div>
    </div>
  )
}

function WindowButton({
  onClick, icon, title, hoverClass,
}: {
  onClick: () => void
  icon: React.ReactNode
  title: string
  hoverClass: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 transition-all duration-100',
        hoverClass, 'hover:text-zinc-100 active:scale-90'
      )}
    >
      {icon}
    </button>
  )
}
