import React from 'react'

interface StatusBarProps {
  isLoading: boolean
  messageCount: number
  activeTool: string | null
  queueCount?: number
}

export function StatusBar({ isLoading, messageCount, activeTool, queueCount = 0 }: StatusBarProps) {
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
        {queueCount > 0 && (
          <>
            <span className="text-jarvis-muted">|</span>
            <span className="text-jarvis-accent text-xs flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {queueCount} queued
            </span>
          </>
        )}
        <span className="text-jarvis-muted">|</span>
        <span className="text-jarvis-muted">{messageCount} messages</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-jarvis-muted">
        <span>AI Assistant</span>
        <span>|</span>
        <span>JARVIS v1.0</span>
      </div>
    </div>
  )
}
