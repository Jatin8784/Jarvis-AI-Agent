import React, { useState, useEffect } from 'react'

interface FileChange {
  id: string
  filePath: string
  timestamp: number
  type: 'create' | 'modify'
  previousContent: string | null
  description: string
}

export function RevertBar() {
  const [changes, setChanges] = useState<FileChange[]>([])
  const [reverting, setReverting] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Poll for file changes every 3 seconds (lightweight)
  useEffect(() => {
    const poll = async () => {
      try {
        const history = await (window as any).jarvis?.getFileChangeHistory?.()
        if (history && Array.isArray(history)) {
          setChanges(history)
        }
      } catch {
        // silently fail
      }
    }

    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleRevert = async (changeId: string) => {
    setReverting(changeId)
    try {
      const res = await (window as any).jarvis?.revertFileChange?.(changeId)
      if (res?.result) {
        setToast(res.result)
        // Refresh list
        const history = await (window as any).jarvis?.getFileChangeHistory?.()
        if (history) setChanges(history)
      }
    } catch (err: any) {
      setToast(`❌ Revert failed: ${err.message}`)
    } finally {
      setReverting(null)
      setTimeout(() => setToast(null), 4000)
    }
  }

  if (changes.length === 0 && !toast) return null

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 max-w-sm px-4 py-3 rounded-lg bg-jarvis-panel border border-jarvis-accent/30 shadow-glow-sm text-sm text-jarvis-text animate-in slide-in-from-right">
          {toast}
        </div>
      )}

      {/* Revert panel — small floating panel in top-right */}
      {changes.length > 0 && (
        <div className="fixed top-14 right-4 z-40 w-72 max-h-60 overflow-y-auto rounded-lg bg-jarvis-panel border border-jarvis-border shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-jarvis-border">
            <span className="text-xs font-display tracking-wider text-jarvis-accent">FILE CHANGES</span>
            <span className="text-xs text-jarvis-muted">{changes.length}</span>
          </div>
          <div className="divide-y divide-jarvis-border/50">
            {changes.slice(0, 10).map(change => {
              const fileName = change.filePath.split(/[/\\]/).pop() || change.filePath
              const timeAgo = getTimeAgo(change.timestamp)
              const canRevert = change.type === 'modify' ? change.previousContent !== null : true

              return (
                <div key={change.id} className="px-3 py-2 flex items-center gap-2 group hover:bg-jarvis-accent/5">
                  <span className="text-xs">
                    {change.type === 'create' ? '🆕' : '✏️'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-jarvis-text truncate" title={change.filePath}>
                      {fileName}
                    </div>
                    <div className="text-[10px] text-jarvis-muted">{timeAgo}</div>
                  </div>
                  {canRevert && (
                    <button
                      onClick={() => handleRevert(change.id)}
                      disabled={reverting === change.id}
                      className="px-2 py-0.5 text-[10px] rounded border border-jarvis-accent/30 text-jarvis-accent
                                 hover:bg-jarvis-accent/10 hover:border-jarvis-accent transition-all
                                 disabled:opacity-50 disabled:cursor-wait
                                 opacity-0 group-hover:opacity-100"
                      title="Revert this change"
                    >
                      {reverting === change.id ? '...' : 'Revert'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
