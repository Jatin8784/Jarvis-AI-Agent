import React, { useMemo } from 'react'
import { marked } from 'marked'
import type { Message, ToolCall } from '../stores/chat.store'

marked.setOptions({
  gfm: true,
  breaks: true,
})

interface MessageBubbleProps {
  message: Message
}

const TOOL_ICONS: Record<string, string> = {
  web_search: '🔍',
  execute_code: '⚡',
  read_file: '📄',
  write_file: '💾',
  list_directory: '📁',
  take_screenshot: '📸',
  speak: '🔊',
  get_system_info: '💻',
}

function ToolBadge({ call }: { call: ToolCall }) {
  const icon = TOOL_ICONS[call.name] || '🔧'
  const label = call.name.replace(/_/g, ' ')
  const preview = call.args?.query || call.args?.path || call.args?.code?.slice(0, 40) || ''

  return (
    <div className="tool-ping flex items-start gap-2 px-3 py-2 rounded bg-jarvis-accent/5 border border-jarvis-accent/20 mb-2 text-xs">
      <span className="mt-0.5">{icon}</span>
      <div>
        <span className="text-jarvis-accent font-display uppercase tracking-wider text-xs">{label}</span>
        {preview && (
          <span className="text-jarvis-muted ml-2 font-mono">
            {preview.length > 50 ? preview.slice(0, 50) + '…' : preview}
          </span>
        )}
      </div>
    </div>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [copied, setCopied] = React.useState(false)

  const html = useMemo(() => {
    if (isUser) return null
    return marked.parse(message.content) as string
  }, [message.content, isUser])

  const timeStr = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleCopy = () => {
    const textToCopy = message.content
    
    // Debug logging
    console.log('📋 COPY BUTTON CLICKED')
    console.log('📋 Content to copy:', textToCopy)
    console.log('📋 Content length:', textToCopy.length)
    
    // Use fallback method for Electron
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          console.log('✅ Copied using clipboard API')
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch((err) => {
          console.warn('Clipboard API failed, using fallback:', err)
          copyFallback(textToCopy)
        })
      } else {
        copyFallback(textToCopy)
      }
    } catch (err) {
      console.error('❌ Copy failed:', err)
      copyFallback(textToCopy)
    }
  }
  
  const copyFallback = (text: string) => {
    // Fallback method using textarea
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    
    try {
      const success = document.execCommand('copy')
      console.log(success ? '✅ Copied using fallback method' : '❌ Fallback copy failed')
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      console.error('❌ Fallback copy error:', err)
    } finally {
      document.body.removeChild(textarea)
    }
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-jarvis-muted text-xs px-3 py-1 rounded border border-jarvis-border">
          {message.content}
        </span>
      </div>
    )
  }

  if (isUser) {
    return (
      <div className="message-in flex justify-end mb-4">
        <div className="max-w-[80%]">
          <div className="relative group">
            <div className="px-4 py-3 rounded"
                 style={{
                   background: 'rgba(0, 102, 255, 0.12)',
                   border: '1px solid rgba(0, 102, 255, 0.3)',
                 }}>
              <p className="text-jarvis-text text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
            
            {/* Copy button for user message */}
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-md bg-jarvis-bg/80 backdrop-blur-sm border border-jarvis-accent/30 hover:border-jarvis-accent hover:bg-jarvis-accent/10 shadow-lg flex items-center gap-1.5"
              title={copied ? "Copied!" : "Copy message"}
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent">
                    <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-xs text-jarvis-accent">Copied!</span>
                </>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent">
                  <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3 11V3C3 2.44772 3.44772 2 4 2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
          <div className="text-right mt-1 text-jarvis-muted text-xs">{timeStr}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="message-in flex gap-3 mb-6">
      <div className="flex-shrink-0 mt-1">
        <div className="w-7 h-7 rounded border border-jarvis-accent/40 flex items-center justify-center"
             style={{ background: 'rgba(0,212,255,0.06)' }}>
          <div className="w-2 h-2 rounded-full bg-jarvis-accent animate-pulse-slow" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-display text-jarvis-accent text-xs tracking-widest">JARVIS</span>
          <span className="text-jarvis-muted text-xs">{timeStr}</span>
        </div>

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-3">
            {message.toolCalls.map((call, i) => (
              <ToolBadge key={i} call={call} />
            ))}
          </div>
        )}

        {html ? (
          <div
            className={`prose-jarvis text-sm leading-relaxed text-jarvis-text ${message.isStreaming ? 'typing-cursor' : ''}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className={`prose-jarvis text-sm leading-relaxed text-jarvis-text ${message.isStreaming ? 'typing-cursor' : ''}`}>
            {message.content}
          </div>
        )}
        
        {/* Copy button at the bottom of response */}
        {!message.isStreaming && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-jarvis-bg/50 backdrop-blur-sm border border-jarvis-accent/30 hover:border-jarvis-accent hover:bg-jarvis-accent/10 transition-all shadow-md text-xs text-jarvis-accent"
              title={copied ? "Copied!" : "Copy response"}
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent">
                    <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M3 11V3C3 2.44772 3.44772 2 4 2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
