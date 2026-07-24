import React, { useMemo, useState } from 'react'
import { marked } from 'marked'
import type { Message, ToolCall } from '../stores/chat.store'

marked.setOptions({
  gfm: true,
  breaks: true,
})

interface MessageBubbleProps {
  message: Message
  onRegenerate?: (userMessage: string) => void
  onEditAndResend?: (newText: string) => void
  onImageClick?: (src: string, name: string) => void
}

// --- Attachment parsing from message content ---
interface ParsedAttachment {
  type: 'image' | 'file'
  name: string
  path: string
}

function parseAttachments(content: string): { text: string; attachments: ParsedAttachment[] } {
  const attachments: ParsedAttachment[] = []

  // Match image attachments: 🖼️ Attached image: Name\nPath: ...
  const imageRegex = /\n*🖼️ Attached image: (.+?)\n(?:Path: (.+?))?(?:\n[^\n]*)?/g
  // Match file attachments: 📎 Attached file: Name\nPath: ...\n...
  const fileRegex = /\n*📎 Attached file: (.+?)\n(?:Path: (.+?))?(?:\n[^\n]*)?/g
  // Match inline file blocks: 📎 **File: name**\n```...```
  const inlineFileRegex = /\n*📎 \*\*(?:File: )?[^*]+\*\*[^\n]*(?:\n```[\s\S]*?```)?/g
  // Match "Please read and analyze" lines
  const analyzeRegex = /\n*Please (?:read[/ ]analyze|read and analyze|look at)[^\n]*/gi

  let text = content

  // Extract images
  let match: RegExpExecArray | null
  while ((match = imageRegex.exec(content)) !== null) {
    attachments.push({ type: 'image', name: match[1], path: match[2] || '' })
  }

  // Extract files
  while ((match = fileRegex.exec(content)) !== null) {
    attachments.push({ type: 'file', name: match[1], path: match[2] || '' })
  }

  // Remove ALL attachment-related text from visible message
  text = text.replace(/\n*🖼️ Attached image:[^\n]*(?:\n[^\n�📎]*?)*/g, '')
  text = text.replace(/\n*📎 Attached file:[^\n]*(?:\nPath:[^\n]*)?(?:\n[^\n🖼📎]*?)*/g, '')
  text = text.replace(inlineFileRegex, '')
  text = text.replace(analyzeRegex, '')
  text = text.replace(/\n*Please look at the attached content\./g, '')
  text = text.replace(/\n*Please use read_file[^\n]*/g, '')
  text = text.trim()

  return { text, attachments }
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
  file_system: '📂',
  web_automation: '🌐',
  content_creator: '✍️',
  social_media: '📱',
  video_generator: '🎬',
}

const TOOL_LABELS: Record<string, string> = {
  web_search: 'Searching the web',
  execute_code: 'Executing code',
  read_file: 'Reading file',
  write_file: 'Writing file',
  list_directory: 'Browsing directory',
  take_screenshot: 'Taking screenshot',
  speak: 'Speaking',
  get_system_info: 'Getting system info',
  file_system: 'Accessing file system',
  web_automation: 'Browsing the web',
  content_creator: 'Creating content',
  social_media: 'Posting to social media',
  video_generator: 'Generating video',
}

// ChatGPT-style thinking/tool-call line during streaming
function ThinkingToolLine({ call, isActive }: { call: ToolCall; isActive: boolean }) {
  const icon = TOOL_ICONS[call.name] || '🔧'
  const label = TOOL_LABELS[call.name] || call.name.replace(/_/g, ' ')
  const detail = call.args?.query || call.args?.path || call.args?.code?.slice(0, 50) || ''

  return (
    <div className="flex items-center gap-2.5 py-1.5">
      {isActive ? (
        <div className="w-4 h-4 flex items-center justify-center">
          <div className="w-3.5 h-3.5 border-2 border-jarvis-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="w-4 h-4 flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent">
            <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}
      <span className="text-sm text-jarvis-muted">
        <span>{icon}</span>
        {' '}
        <span className={isActive ? 'text-jarvis-text' : 'text-jarvis-muted'}>
          {label}
        </span>
        {detail && (
          <span className="text-jarvis-muted/70 ml-1.5 font-mono text-xs">
            {detail.length > 60 ? detail.slice(0, 60) + '…' : detail}
          </span>
        )}
      </span>
    </div>
  )
}

// Collapsed tool summary (after streaming is done)
function ToolSummary({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expanded, setExpanded] = useState(false)

  if (toolCalls.length === 0) return null

  // Group tool calls for a concise summary
  const summary = toolCalls.map(tc => {
    const icon = TOOL_ICONS[tc.name] || '🔧'
    const label = TOOL_LABELS[tc.name] || tc.name.replace(/_/g, ' ')
    return { icon, label, detail: tc.args?.query || tc.args?.path || '' }
  })

  return (
    <div className="mb-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-jarvis-muted hover:text-jarvis-accent transition-colors group"
      >
        <svg
          width="12" height="12" viewBox="0 0 16 16" fill="none"
          className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
        >
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-display tracking-wider">
          {toolCalls.length === 1
            ? `Used ${summary[0].icon} ${summary[0].label.toLowerCase()}`
            : `Used ${toolCalls.length} tools`
          }
        </span>
      </button>

      {expanded && (
        <div className="mt-2 ml-5 pl-3 border-l border-jarvis-border space-y-1">
          {summary.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-0.5">
              <span>{s.icon}</span>
              <span className="text-jarvis-text">{s.label}</span>
              {s.detail && (
                <span className="text-jarvis-muted font-mono">
                  {s.detail.length > 40 ? s.detail.slice(0, 40) + '…' : s.detail}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function MessageBubble({ message, onRegenerate, onEditAndResend, onImageClick }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [copied, setCopied] = React.useState(false)

  // Parse attachments from user messages (fallback for old messages without displayContent)
  const parsed = useMemo(() => {
    if (!isUser) return null
    if (message.displayContent !== undefined) return null // new messages don't need parsing
    return parseAttachments(message.content)
  }, [message.content, isUser, message.displayContent])

  // The text to show in the user bubble
  const visibleText = isUser
    ? (message.displayContent !== undefined ? message.displayContent : (parsed?.text || message.content))
    : message.content

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

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }).catch(() => {
          copyFallback(textToCopy)
        })
      } else {
        copyFallback(textToCopy)
      }
    } catch {
      copyFallback(textToCopy)
    }
  }

  const copyFallback = (text: string) => {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()

    try {
      const success = document.execCommand('copy')
      if (success) {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // silent
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
              {/* Render attachment cards */}
              {/* Images from stored data URLs */}
              {message.imageDataUrls && message.imageDataUrls.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-2">
                  {message.imageDataUrls.map((img, i) => (
                    <div
                      key={i}
                      className="relative rounded-lg overflow-hidden border border-white/20 bg-black/30 cursor-pointer hover:border-jarvis-accent/50 transition-colors"
                      style={{ width: '120px' }}
                      onClick={() => onImageClick?.(img.dataUrl, img.name)}
                    >
                      <img src={img.dataUrl} alt={img.name} className="w-full h-16 object-cover" />
                      <div className="px-1.5 py-0.5 bg-black/60">
                        <p className="text-[8px] text-white truncate">{img.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* File attachments with preview */}
              {message.fileAttachments && message.fileAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {message.fileAttachments.map((file, i) => {
                    const ext = file.name.split('.').pop()?.toLowerCase() || ''
                    return (
                      <div key={i} className="w-44 rounded-lg border border-white/15 bg-white/5 overflow-hidden">
                        {file.text ? (
                          <div className="px-2 py-1.5 h-14 overflow-hidden text-[9px] leading-snug text-jarvis-muted/80 whitespace-pre-wrap font-mono">
                            {file.text.split('\n').slice(0, 5).join('\n')}
                          </div>
                        ) : (
                          <div className="px-2 py-3 flex items-center justify-center">
                            <span className="text-lg">
                              {ext === 'dart' ? '🎯' : ext === 'py' ? '🐍' : ext === 'js' || ext === 'ts' ? '📜' : '📄'}
                            </span>
                          </div>
                        )}
                        <div className="px-2 py-1 border-t border-white/10 bg-black/20 flex items-center gap-1.5">
                          <span className="text-[9px] text-jarvis-accent font-display tracking-wider uppercase">{ext || 'FILE'}</span>
                          <span className="text-[9px] text-jarvis-muted truncate flex-1 text-right">{file.name}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Fallback: render parsed attachments if no stored data (old messages) */}
              {!message.imageDataUrls?.length && !message.fileAttachments?.length && parsed && parsed.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {parsed.attachments.map((att, i) => (
                    <AttachmentCard key={i} attachment={att} />
                  ))}
                </div>
              )}

              {/* Render text content */}
              {visibleText ? (
                <p className="text-jarvis-text text-sm leading-relaxed whitespace-pre-wrap">
                  {visibleText}
                </p>
              ) : null}
            </div>

            {/* Action buttons for user message */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
              {/* Edit button — puts content into input bar */}
              {onEditAndResend && (
                <button
                  onClick={() => onEditAndResend(message.content)}
                  className="p-1.5 rounded-md bg-jarvis-bg/80 backdrop-blur-sm border border-jarvis-accent/30 hover:border-jarvis-accent hover:bg-jarvis-accent/10 shadow-lg"
                  title="Edit in input"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent">
                    <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
              {/* Copy button */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md bg-jarvis-bg/80 backdrop-blur-sm border border-jarvis-accent/30 hover:border-jarvis-accent hover:bg-jarvis-accent/10 shadow-lg"
                title={copied ? "Copied!" : "Copy message"}
              >
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent">
                    <path d="M13.5 4L6 11.5L2.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent">
                    <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3 11V3C3 2.44772 3.44772 2 4 2H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="text-right mt-1 text-jarvis-muted text-xs">{timeStr}</div>
        </div>
      </div>
    )
  }

  // ---- Assistant message ----
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0
  const isStreaming = message.isStreaming
  const hasContent = message.content.trim().length > 0

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

        {/* --- Thinking / Tool Calls Section --- */}
        {hasToolCalls && isStreaming && (
          <div className="mb-3 py-2 px-3 rounded-lg bg-jarvis-panel/60 border border-jarvis-border">
            {message.toolCalls!.map((call, i) => {
              const isLast = i === message.toolCalls!.length - 1
              // The last tool is "active" (spinning) while still streaming and no content yet
              const isActive = isLast && !hasContent
              return <ThinkingToolLine key={i} call={call} isActive={isActive} />
            })}
          </div>
        )}

        {/* Collapsed summary after streaming is done */}
        {hasToolCalls && !isStreaming && (
          <ToolSummary toolCalls={message.toolCalls!} />
        )}

        {/* "Thinking..." state: streaming but no tool calls yet and no content */}
        {isStreaming && !hasToolCalls && !hasContent && (
          <div className="mb-3 flex items-center gap-2.5 py-2 px-3 rounded-lg bg-jarvis-panel/60 border border-jarvis-border">
            <div className="w-3.5 h-3.5 border-2 border-jarvis-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-jarvis-text">Thinking…</span>
          </div>
        )}

        {/* The actual response content */}
        {hasContent && html ? (
          <div
            className={`prose-jarvis text-sm leading-relaxed text-jarvis-text ${isStreaming ? 'typing-cursor' : ''}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : hasContent ? (
          <div className={`prose-jarvis text-sm leading-relaxed text-jarvis-text ${isStreaming ? 'typing-cursor' : ''}`}>
            {message.content}
          </div>
        ) : null}

        {/* Action buttons at the bottom of response */}
        {!isStreaming && hasContent && (
          <div className="flex items-center gap-2 mt-3">
            {/* Copy */}
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

            {/* Regenerate */}
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(message.content)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-jarvis-bg/50 backdrop-blur-sm border border-jarvis-accent/30 hover:border-jarvis-accent hover:bg-jarvis-accent/10 transition-all shadow-md text-xs text-jarvis-accent"
                title="Regenerate response"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8a6 6 0 0111.5-2.3M14 8a6 6 0 01-11.5 2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Attachment card for user messages ---
function AttachmentCard({ attachment, dataUrl }: { attachment: ParsedAttachment; dataUrl?: string }) {
  const fileName = attachment.name
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  if (attachment.type === 'image') {
    // Use the stored data URL for rendering (CSP-safe, no file:// needed)
    return (
      <div className="relative w-16 h-16 rounded overflow-hidden border border-white/20 bg-black/30">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-jarvis-muted">
              <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="6" cy="7" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M14 10l-3-3-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 text-[8px] text-white truncate text-center">
          {fileName}
        </div>
      </div>
    )
  }

  // File card
  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-white/5 border border-white/15 text-xs max-w-[200px]">
      <span className="text-sm flex-shrink-0">
        {ext === 'dart' ? '🎯' : ext === 'py' ? '🐍' : ext === 'js' || ext === 'ts' ? '📜' : '📄'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-jarvis-text text-xs truncate" title={attachment.path}>{fileName}</div>
        <div className="text-[10px] text-jarvis-muted truncate">{attachment.path}</div>
      </div>
    </div>
  )
}
