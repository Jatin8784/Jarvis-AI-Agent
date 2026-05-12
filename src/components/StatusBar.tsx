import React from 'react'

interface StatusBarProps {
  isLoading: boolean
  messageCount: number
  activeTool: string | null
}

export function StatusBar({ isLoading, messageCount, activeTool }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1 border-t border-jarvis-border bg-jarvis-panel/50"
         style={{ height: '24px' }}>
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-jarvis-warn animate-pulse' : 'bg-jarvis-success'}`} />
          <span className="text-jarvis-muted font-display tracking-wider text-xs">
            {isLoading ? (activeTool ? activeTool.replace(/_/g, ' ').toUpperCase() : 'PROCESSING') : 'READY'}
          </span>
        </div>
        <span className="text-jarvis-muted">|</span>
        <span className="text-jarvis-muted">{messageCount} messages</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-jarvis-muted">
        <span>Gemini 1.5 Flash</span>
        <span>|</span>
        <span>JARVIS v1.0</span>
      </div>
    </div>
  )
}
