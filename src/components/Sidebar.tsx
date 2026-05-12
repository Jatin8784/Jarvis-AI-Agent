import React, { useEffect, useState } from 'react'
import { useChatStore } from '../stores/chat.store'

interface SidebarProps {
  open: boolean
  onClose: () => void
  onNewChat: () => void
}

export function Sidebar({ open, onClose, onNewChat }: SidebarProps) {
  const sessions = useChatStore(s => s.sessions)
  const currentSessionId = useChatStore(s => s.currentSessionId)
  const switchSession = useChatStore(s => s.switchSession)
  const clearMessages = useChatStore(s => s.clearMessages)
  const [systemInfo, setSystemInfo] = useState<any>(null)

  useEffect(() => {
    if (open && !systemInfo) {
      (window as any).jarvis?.getSystemInfo?.()?.then?.((info: any) => {
        setSystemInfo(info)
      })
    }
  }, [open])

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-10" onClick={onClose} />
      )}

      <div className={`
        absolute left-0 top-0 bottom-0 z-20 flex flex-col
        border-r border-jarvis-border bg-jarvis-panel
        transition-all duration-200 ease-out
        ${open ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'}
      `}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-jarvis-border">
          <span className="font-display text-jarvis-accent text-xs tracking-widest">HISTORY</span>
          <button onClick={onClose} className="text-jarvis-muted hover:text-jarvis-accent transition-colors text-lg">×</button>
        </div>

        <div className="p-3 border-b border-jarvis-border">
          <button
            onClick={() => { onNewChat(); onClose() }}
            className="w-full py-2 px-3 rounded border border-jarvis-accent/30 text-jarvis-accent text-xs font-display tracking-wider
                       hover:bg-jarvis-accent/10 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-base leading-none">+</span>
            NEW CHAT
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sessions.length === 0 ? (
            <p className="text-jarvis-muted text-xs text-center py-8">No chats yet</p>
          ) : (
            sessions.slice().reverse().map(session => {
              const isActive = session.id === currentSessionId
              return (
                <div
                  key={session.id}
                  onClick={() => { switchSession(session.id); onClose() }}
                  className={`px-3 py-2 rounded border cursor-pointer transition-colors ${
                    isActive
                      ? 'border-jarvis-accent/40 bg-jarvis-accent/10'
                      : 'border-transparent hover:border-jarvis-border hover:bg-jarvis-bg'
                  }`}
                >
                  {isActive && (
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-jarvis-accent animate-pulse" />
                      <p className="text-jarvis-accent text-xs font-display tracking-wider">ACTIVE</p>
                    </div>
                  )}
                  <p className={`text-xs truncate ${isActive ? 'text-jarvis-accent' : 'text-jarvis-text group-hover:text-jarvis-accent'} transition-colors`}>
                    {session.title}
                  </p>
                  <p className="text-jarvis-muted text-xs mt-0.5">
                    {new Date(session.lastMessageAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )
            })
          )}
        </div>

        {systemInfo && (
          <div className="p-3 border-t border-jarvis-border">
            <p className="text-jarvis-muted text-xs font-display tracking-wider mb-2">SYSTEM</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-jarvis-muted">OS</span>
                <span className="text-jarvis-text">{systemInfo.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-jarvis-muted">CPU</span>
                <span className="text-jarvis-text">{systemInfo.cpu?.cores}c</span>
              </div>
              <div className="flex justify-between">
                <span className="text-jarvis-muted">RAM</span>
                <span className="text-jarvis-text">{systemInfo.memory?.total}</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-jarvis-border">
          <button
            onClick={() => { clearMessages(); onClose() }}
            className="w-full py-1.5 px-3 rounded border border-red-900/40 text-red-400/70 text-xs
                       hover:border-red-500/60 hover:text-red-400 transition-colors font-display tracking-wider"
          >
            CLEAR CHAT
          </button>
        </div>
      </div>
    </>
  )
}
