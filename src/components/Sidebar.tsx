import React, { useEffect, useState } from 'react'
import { useChatStore } from '../stores/chat.store'
import { useAuthStore } from '../stores/auth.store'
import { logout } from '../services/firebase'

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
  const deleteSession = useChatStore(s => s.deleteSession)
  const renameSession = useChatStore(s => s.renameSession)
  const [systemInfo, setSystemInfo] = useState<any>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    if (open && !systemInfo) {
      (window as any).jarvis?.getSystemInfo?.()?.then?.((info: any) => {
        setSystemInfo(info)
      })
    }
  }, [open])

  const startEditing = (sessionId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(sessionId)
    setEditTitle(title)
  }

  const confirmEdit = (sessionId: string) => {
    if (editTitle.trim()) {
      renameSession(sessionId, editTitle.trim())
    }
    setEditingId(null)
  }

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteSession(sessionId)
  }

  return (
    <>
      <div className={`
        flex-shrink-0 flex flex-col
        border-r border-jarvis-border bg-jarvis-panel
        transition-all duration-200 ease-out overflow-hidden
        ${open ? 'w-64' : 'w-0'}
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
              const isEditing = editingId === session.id
              return (
                <div
                  key={session.id}
                  onClick={() => { if (!isEditing) { switchSession(session.id); onClose() } }}
                  className={`relative px-3 py-2 rounded border cursor-pointer transition-colors group ${
                    isActive
                      ? 'border-jarvis-accent/40 bg-jarvis-accent/10'
                      : 'border-transparent hover:border-jarvis-border hover:bg-jarvis-bg'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') confirmEdit(session.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        autoFocus
                        className="flex-1 bg-jarvis-bg border border-jarvis-accent/40 rounded px-2 py-0.5 text-xs text-jarvis-text outline-none"
                      />
                      <button
                        onClick={() => confirmEdit(session.id)}
                        className="text-jarvis-accent text-xs px-1"
                        title="Save"
                      >✓</button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-jarvis-muted text-xs px-1"
                        title="Cancel"
                      >✗</button>
                    </div>
                  ) : (
                    <>
                      {isActive && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-jarvis-accent animate-pulse" />
                          <p className="text-jarvis-accent text-xs font-display tracking-wider">ACTIVE</p>
                        </div>
                      )}
                      <p className={`text-xs truncate pr-12 ${isActive ? 'text-jarvis-accent' : 'text-jarvis-text'} transition-colors`}>
                        {session.title}
                      </p>
                      <p className="text-jarvis-muted text-xs mt-0.5">
                        {new Date(session.lastMessageAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {/* Edit & Delete buttons */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <button
                          onClick={(e) => startEditing(session.id, session.title, e)}
                          className="p-1 rounded hover:bg-jarvis-accent/10 text-jarvis-muted hover:text-jarvis-accent transition-colors"
                          title="Rename"
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleDelete(session.id, e)}
                          className="p-1 rounded hover:bg-red-400/10 text-jarvis-muted hover:text-red-400 transition-colors"
                          title="Delete chat"
                        >
                          <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                            <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
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

        <div className="p-3 border-t border-jarvis-border space-y-2">
          {/* User info */}
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-6 h-6 rounded-full bg-jarvis-accent/20 border border-jarvis-accent/40 flex items-center justify-center">
              <span className="text-jarvis-accent text-[10px] font-display">
                {useAuthStore.getState().user?.displayName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-jarvis-text text-xs truncate">{useAuthStore.getState().user?.displayName || 'User'}</p>
              <p className="text-jarvis-muted text-[10px] truncate">{useAuthStore.getState().user?.email || ''}</p>
            </div>
          </div>

          <button
            onClick={async () => { await logout() }}
            className="w-full py-1.5 px-3 rounded border border-jarvis-border text-jarvis-muted text-xs
                       hover:border-jarvis-accent/40 hover:text-jarvis-accent transition-colors font-display tracking-wider"
          >
            LOGOUT
          </button>

          <button
            onClick={() => { clearMessages(); onClose() }}
            className="w-full py-1.5 px-3 rounded border border-red-900/40 text-red-400/70 text-xs
                       hover:border-red-500/60 hover:text-red-400 transition-colors font-display tracking-wider"
          >
            CLEAR ALL CHATS
          </button>
        </div>
      </div>
    </>
  )
}
