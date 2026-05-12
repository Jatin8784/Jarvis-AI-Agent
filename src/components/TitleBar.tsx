import React, { useState, useEffect } from 'react'

interface TitleBarProps {
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

export function TitleBar({ onToggleSidebar, sidebarOpen }: TitleBarProps) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeStr = time.toLocaleTimeString('en-US', { hour12: false })
  const dateStr = time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()

  return (
    <div className="drag-region flex items-center justify-between px-4 py-2 border-b border-jarvis-border bg-jarvis-panel"
         style={{ height: '42px', minHeight: '42px' }}>

      <div className="flex items-center gap-3 no-drag">
        <button
          onClick={onToggleSidebar}
          className="flex flex-col gap-1 p-1.5 rounded hover:bg-jarvis-border transition-colors"
          title="Toggle history"
        >
          <span className={`block h-px bg-jarvis-accent transition-all ${sidebarOpen ? 'w-4' : 'w-4'}`} />
          <span className={`block h-px bg-jarvis-accent transition-all ${sidebarOpen ? 'w-2' : 'w-3'}`} />
          <span className={`block h-px bg-jarvis-accent transition-all ${sidebarOpen ? 'w-3' : 'w-4'}`} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-jarvis-accent animate-pulse-slow" />
          <span className="font-display text-jarvis-accent text-sm font-bold tracking-widest glow-text">
            JARVIS
          </span>
          <span className="text-jarvis-muted text-xs tracking-wider">v1.0</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-center hidden sm:block">
          <div className="text-jarvis-accent font-display text-sm tracking-widest">{timeStr}</div>
          <div className="text-jarvis-muted text-xs tracking-wider">{dateStr}</div>
        </div>

        <div className="no-drag flex items-center gap-1">
          <button
            onClick={() => (window as any).jarvis?.minimize()}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-jarvis-border transition-colors group"
            title="Minimize"
          >
            <span className="block w-3 h-px bg-jarvis-muted group-hover:bg-jarvis-accent transition-colors" />
          </button>
          <button
            onClick={() => (window as any).jarvis?.maximize()}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-jarvis-border transition-colors group"
            title="Maximize"
          >
            <span className="block w-3 h-3 border border-jarvis-muted group-hover:border-jarvis-accent transition-colors" style={{borderRadius: '1px'}} />
          </button>
          <button
            onClick={() => (window as any).jarvis?.close()}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-900/30 transition-colors group"
            title="Close"
          >
            <span className="text-jarvis-muted group-hover:text-red-400 text-lg leading-none transition-colors">×</span>
          </button>
        </div>
      </div>
    </div>
  )
}
