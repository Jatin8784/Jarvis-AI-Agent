import React, { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { ModelSelector } from './ModelSelector'
import { ImagePreview } from './ImagePreview'

// Debug marker so we can verify the running renderer is the new code.
console.log('[InputBar] module loaded — build tag: attachments-v2')

interface InputBarProps {
  onSend: (msg: string, meta?: { displayContent?: string; imageDataUrls?: Array<{ name: string; dataUrl: string }>; fileAttachments?: Array<{ name: string; path: string; text?: string }> }) => void
  disabled: boolean
  activeTool: string | null
  onStop?: () => void
  editingText?: string
  onEditingTextConsumed?: () => void
}

type AttachmentKind = 'image' | 'file' | 'pasted-text'
type AttachmentStatus = 'loading' | 'ready' | 'error'

interface Attachment {
  id: string
  name: string
  size: number
  kind: AttachmentKind
  status: AttachmentStatus
  // Image data URL (only for kind === 'image' once loaded)
  preview?: string
  // For pasted-text attachments and small readable text files
  text?: string
  // Full file system path (Electron gives this on File objects)
  path?: string
  // Original File reference (undefined for pasted-text)
  file?: File
  // Error message when status === 'error'
  error?: string
}

const SUGGESTIONS = [
  'Search the web for latest AI news',
  'Read my Desktop folder',
  'What are my system specs?',
  'Write a Python script to rename files',
  'Explain quantum computing',
]

// Anything pasted longer than this becomes a "PASTED" attachment card
// instead of being inserted into the textarea.
const PASTE_AS_FILE_THRESHOLD = 500

const uid = () => `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const isImageFile = (file: File) => file.type.startsWith('image/')

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
    reader.readAsText(file)
  })

const humanSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function InputBar({ onSend, disabled, activeTool, onStop, editingText, onEditingTextConsumed }: InputBarProps) {
  const [value, setValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [value])

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus()
  }, [disabled])

  // When editingText is provided, populate the textarea
  useEffect(() => {
    if (editingText) {
      setValue(editingText)
      onEditingTextConsumed?.()
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [editingText, onEditingTextConsumed])

  const patchAttachment = (id: string, patch: Partial<Attachment>) => {
    setAttachments(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)))
  }

  const ingestFiles = async (files: File[]) => {
    if (files.length === 0) return

    // Seed each file as a loading attachment so the UI shows spinners immediately.
    const seeded: Attachment[] = files.map(file => ({
      id: uid(),
      name: file.name,
      size: file.size,
      kind: isImageFile(file) ? 'image' : 'file',
      status: 'loading',
      path: (file as any).path || undefined,
      file,
    }))
    setAttachments(prev => [...prev, ...seeded])

    // Load previews / read small text files in parallel.
    await Promise.all(
      seeded.map(async att => {
        try {
          if (att.kind === 'image' && att.file) {
            const dataUrl = await readFileAsDataURL(att.file)
            patchAttachment(att.id, { status: 'ready', preview: dataUrl })
          } else if (att.file) {
            // Universal approach: try to read ANY file as text if it's small enough.
            // Only fall back to a plain chip if it's clearly binary.
            const smallEnough = att.size <= 500 * 1024 // 500 KB

            if (smallEnough) {
              try {
                const text = await readFileAsText(att.file)
                // Check if binary: if >1% null bytes, treat as binary
                const nullCount = (text.match(/\0/g) || []).length
                if (nullCount < text.length * 0.01 && text.length > 0) {
                  patchAttachment(att.id, { status: 'ready', text })
                } else {
                  patchAttachment(att.id, { status: 'ready' })
                }
              } catch {
                patchAttachment(att.id, { status: 'ready' })
              }
            } else {
              patchAttachment(att.id, { status: 'ready' })
            }
          } else {
            patchAttachment(att.id, { status: 'ready' })
          }
        } catch (err: any) {
          patchAttachment(att.id, { status: 'error', error: err?.message || 'Failed to read' })
        }
      })
    )
  }

  const addPastedText = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    const lineCount = trimmed.split(/\r?\n/).length
    const preview = trimmed.split(/\r?\n/).slice(0, 6).join('\n')

    const att: Attachment = {
      id: uid(),
      name: `Pasted-${new Date().toISOString().slice(11, 19)}.txt`,
      size: new Blob([text]).size,
      kind: 'pasted-text',
      status: 'loading',
      text,
      preview,
    }
    setAttachments(prev => [...prev, att])

    // Short synthetic "processing" delay so the loader is actually visible
    // for tiny pastes — matches the feel of Claude/ChatGPT.
    window.setTimeout(() => {
      patchAttachment(att.id, { status: 'ready' })
    }, 350)

    // Also mention line count in name for easier scanning
    patchAttachment(att.id, { name: `Pasted ${lineCount} line${lineCount > 1 ? 's' : ''}.txt` })
  }

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const clip = e.clipboardData
    if (!clip) return

    // Check for pasted images from clipboard
    const imageItems = Array.from(clip.items || []).filter(
      item => item.kind === 'file' && item.type.startsWith('image/')
    )

    if (imageItems.length > 0) {
      e.preventDefault()
      const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[]
      ingestFiles(files)
      return
    }

    const pastedText = clip.getData('text')
    if (pastedText && pastedText.length > PASTE_AS_FILE_THRESHOLD) {
      e.preventDefault()
      addPastedText(pastedText)
    }
    // Otherwise let the browser handle the paste normally.
  }

  const buildOutgoingMessage = (userText: string): string => {
    if (attachments.length === 0) return userText

    let out = userText || 'Please look at the attached content.'
    for (const att of attachments) {
      if (att.kind === 'pasted-text') {
        out += `\n\n📎 **${att.name}** (pasted content)\n\`\`\`\n${att.text?.substring(0, 20000) || ''}${(att.text?.length || 0) > 20000 ? '\n... (truncated)' : ''}\n\`\`\``
      } else if (att.kind === 'image') {
        if (att.path) {
          out += `\n\n🖼️ Attached image: ${att.name}\nPath: ${att.path}\nPlease read/analyze this image using the read_file tool.`
        } else {
          out += `\n\n🖼️ Attached image: ${att.name} (${humanSize(att.size)}) — no local path available.`
        }
      } else {
        // file
        if (att.path) {
          out += `\n\n📎 Attached file: ${att.name}\nPath: ${att.path}\n\nPlease read and analyze this file using the read_file tool.`
        } else if (att.text) {
          out += `\n\n📎 **File: ${att.name}**\n\`\`\`\n${att.text.substring(0, 5000)}${att.text.length > 5000 ? '\n... (truncated)' : ''}\n\`\`\``
        } else {
          out += `\n\n📎 **File: ${att.name}** (${humanSize(att.size)}) — please use read_file to read this file.`
        }
      }
    }
    return out
  }

  const handleSend = () => {
    const msg = value.trim()
    if (disabled) return
    if (!msg && attachments.length === 0) return

    // Block send if any attachment is still loading — user should see the loader finish first
    if (attachments.some(a => a.status === 'loading')) return

    // Build the full message for the AI (includes paths, instructions)
    const outgoing = buildOutgoingMessage(msg)

    // The display content is just what the user typed (no path garbage)
    const displayContent = msg || (attachments.length > 0 ? '' : undefined)

    // Collect image data URLs for inline rendering in chat
    const imageDataUrls = attachments
      .filter(a => a.kind === 'image' && a.preview)
      .map(a => ({ name: a.name, dataUrl: a.preview! }))

    // Collect file attachments for preview cards in chat
    const fileAttachments = attachments
      .filter(a => a.kind === 'file' || a.kind === 'pasted-text')
      .map(a => ({ name: a.name, path: a.path || '', text: a.text?.slice(0, 500) || undefined }))

    onSend(outgoing, {
      displayContent,
      imageDataUrls: imageDataUrls.length > 0 ? imageDataUrls : undefined,
      fileAttachments: fileAttachments.length > 0 ? fileAttachments : undefined,
    })

    console.log('[InputBar] SEND — imageDataUrls:', imageDataUrls.length, 'files:', fileAttachments.length, 'display:', displayContent?.slice(0, 50))

    setAttachments([])
    setValue('')
    setShowSuggestions(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    console.log('[InputBar] files selected:', files.length, files.map(f => f.name))
    ingestFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled) handleSend()
    }
  }

  const toggleVoice = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamRef.current = stream

        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data)
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
          const reader = new FileReader()
          reader.readAsDataURL(audioBlob)
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1]
            setIsTranscribing(true)
            try {
              const result = await (window as any).jarvis.transcribe(base64Audio, mediaRecorder.mimeType)
              if (result.success && result.transcript) {
                setValue(prev => {
                  const newText = result.transcript.trim()
                  return prev ? `${prev} ${newText}` : newText
                })
              } else if (result.error) {
                console.error('Transcription error:', result.error)
              }
            } catch (err) {
              console.error('Failed to transcribe:', err)
            } finally {
              setIsTranscribing(false)
            }
          }

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
          }
        }

        setIsRecording(true)
        mediaRecorder.start()
      } catch (err: any) {
        console.error('Microphone access error:', err)
        if (err.name === 'NotAllowedError') {
          alert('Microphone access denied. Please allow microphone access in your browser settings.')
        } else if (err.name === 'NotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.')
        } else {
          alert('Could not access microphone: ' + err.message)
        }
        setIsRecording(false)
      }
    }
  }

  const toolLabel = activeTool?.replace(/_/g, ' ') || ''
  const anyLoading = attachments.some(a => a.status === 'loading')

  return (
    <div className="border-t border-jarvis-border bg-jarvis-panel px-4 py-3">
      {activeTool && (
        <div className="mb-2 flex items-center gap-2 text-xs text-jarvis-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-jarvis-accent animate-pulse" />
          <span className="font-display tracking-wider">EXECUTING {toolLabel.toUpperCase()}</span>
          <span className="flex gap-0.5 ml-1">
            {[0,1,2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full bg-jarvis-accent/60"
                    style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </span>
        </div>
      )}

      {showSuggestions && !value && (
        <div className="mb-2 flex flex-wrap gap-1">
          {SUGGESTIONS.map((s, i) => (
            <button key={i}
              onClick={() => { setValue(s); setShowSuggestions(false) }}
              className="text-xs px-2 py-1 rounded border border-jarvis-border text-jarvis-muted hover:border-jarvis-accent/40 hover:text-jarvis-accent transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map(att => (
            <AttachmentChip
              key={att.id}
              attachment={att}
              onRemove={() => removeAttachment(att.id)}
              onImageClick={(src, name) => setPreviewImage({ src, name })}
            />
          ))}
        </div>
      )}

      {/* Hidden file input */}
      {/* Accept ALL file types — user should be able to attach anything */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex items-end gap-2">
        <button
          onClick={() => setShowSuggestions(s => !s)}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded border border-jarvis-border hover:border-jarvis-accent/40 transition-colors text-jarvis-muted hover:text-jarvis-accent mb-0.5"
          title="Suggestions"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 11V8M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        <button
          onClick={openFilePicker}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded border border-jarvis-border hover:border-jarvis-accent/40 transition-colors text-jarvis-muted hover:text-jarvis-accent mb-0.5"
          title="Attach files (images, documents)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M14 9.5V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3C2 2.44772 2.44772 2 3 2H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2L8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 2H14V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="flex-shrink-0 mb-0.5">
          <ModelSelector />
        </div>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKey}
            onPaste={handlePaste}
            placeholder={isTranscribing ? 'Transcribing audio...' : disabled ? 'JARVIS is thinking…' : 'Ask anything… (Enter to send, Shift+Enter for newline)'}
            disabled={isTranscribing}
            rows={1}
            className="w-full bg-jarvis-bg border border-jarvis-border rounded px-4 py-2.5 text-jarvis-text text-sm
                       placeholder:text-jarvis-muted resize-none outline-none transition-all
                       focus:border-jarvis-accent/50 focus:shadow-glow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Share Tech Mono, monospace', lineHeight: '1.5' }}
          />
        </div>

        <button
          onClick={toggleVoice}
          disabled={isTranscribing}
          className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded border transition-colors mb-0.5
            ${isRecording
              ? 'border-red-500/60 text-red-400 bg-red-500/10 animate-pulse'
              : isTranscribing
                ? 'border-jarvis-accent/40 text-jarvis-accent bg-jarvis-accent/10'
                : 'border-jarvis-border text-jarvis-muted hover:border-jarvis-accent/40 hover:text-jarvis-accent'
            } ${isTranscribing ? 'cursor-wait' : ''}`}
          title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Start voice input'}
        >
          {isTranscribing ? (
            <div className="w-4 h-4 border-2 border-jarvis-accent border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 7c0 3.314 2.686 6 6 6s6-2.686 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
        </button>

        <button
          onClick={handleSend}
          disabled={disabled || anyLoading || (!value.trim() && attachments.length === 0)}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded border border-jarvis-accent/40
                     text-jarvis-accent hover:bg-jarvis-accent/10 disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all hover:shadow-glow-sm mb-0.5"
          title={disabled ? 'Wait for JARVIS to finish' : anyLoading ? 'Attachments still loading…' : 'Send (Enter)'}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {disabled && onStop && (
          <button
            onClick={onStop}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded border border-red-500/40
                       text-red-400 hover:bg-red-500/10 transition-all hover:shadow-glow-sm mb-0.5"
            title="Stop AI response"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mt-1.5 px-1">
        <span className="text-jarvis-muted text-xs">
          {attachments.length > 0
            ? `${attachments.length} attachment${attachments.length > 1 ? 's' : ''} • ${value.length} chars${anyLoading ? ' • loading…' : ''}`
            : value.length > 0
              ? `${value.length} chars`
              : 'Ctrl+Shift+J to toggle window'}
        </span>
        <span className="text-jarvis-muted text-xs">Powered by AI</span>
      </div>

      {/* Image lightbox preview */}
      {previewImage && (
        <ImagePreview
          src={previewImage.src}
          name={previewImage.name}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  )
}

// ---------- attachment chip ---------------------------------------------------

interface AttachmentChipProps {
  attachment: Attachment
  onRemove: () => void
  onImageClick?: (src: string, name: string) => void
}

function AttachmentChip({ attachment: att, onRemove, onImageClick }: AttachmentChipProps) {
  const loading = att.status === 'loading'
  const errored = att.status === 'error'

  // Image thumbnail chip
  if (att.kind === 'image') {
    return (
      <div
        className="relative rounded-lg overflow-hidden border border-jarvis-border bg-jarvis-bg group cursor-pointer hover:border-jarvis-accent/50 transition-colors"
        style={{ width: '140px' }}
        title={`${att.name} (${humanSize(att.size)}) — click to preview`}
        onClick={() => att.preview && onImageClick?.(att.preview, att.name)}
      >
        {att.preview ? (
          <img src={att.preview} alt={att.name} className="w-full h-20 object-cover" />
        ) : (
          <div className="w-full h-20 flex items-center justify-center text-jarvis-muted bg-jarvis-panel">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="6" cy="7" r="1.2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M14 10l-3-3-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        )}

        {/* Filename bar at bottom */}
        <div className="px-2 py-1.5 bg-jarvis-panel border-t border-jarvis-border">
          <p className="text-[10px] text-jarvis-text truncate">{att.name}</p>
        </div>

        {loading && <LoaderOverlay />}
        {errored && <ErrorOverlay title={att.error || 'Failed to read image'} />}

        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-jarvis-bg/90 border border-jarvis-border
                     text-jarvis-muted hover:text-red-400 hover:border-red-400/60 flex items-center justify-center
                     opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    )
  }

  // Pasted-text card OR text-file with content read into memory: Claude-style preview card.
  if (att.kind === 'pasted-text' || (att.kind === 'file' && att.text)) {
    const isPasted = att.kind === 'pasted-text'
    const previewText =
      att.preview ||
      att.text?.split(/\r?\n/).slice(0, 6).join('\n') ||
      att.text?.slice(0, 200) ||
      ''
    const label = isPasted ? 'PASTED' : (att.name.split('.').pop()?.toUpperCase() || 'TEXT')
    return (
      <div
        className="relative w-40 rounded border border-jarvis-border bg-jarvis-bg overflow-hidden group"
        title={att.name}
      >
        <div className="px-2 py-1.5 h-16 overflow-hidden text-[10px] leading-snug text-jarvis-muted whitespace-pre-wrap font-mono">
          {previewText}
        </div>
        <div className="px-2 py-1 border-t border-jarvis-border flex items-center justify-between bg-jarvis-panel gap-2">
          <span className="text-[9px] font-display tracking-wider text-jarvis-accent shrink-0">{label}</span>
          <span className="text-[9px] text-jarvis-muted truncate flex-1 text-right" title={att.name}>
            {isPasted ? humanSize(att.size) : att.name}
          </span>
        </div>

        {loading && <LoaderOverlay />}

        <button
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-jarvis-panel border border-jarvis-border
                     text-jarvis-muted hover:text-red-400 hover:border-red-400/60 flex items-center justify-center
                     opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    )
  }

  // Regular file chip (with spinner while loading)
  return (
    <div
      className="relative flex items-center gap-2 px-3 py-1.5 rounded bg-jarvis-accent/10 border border-jarvis-accent/30 text-xs group"
      title={`${att.name} (${humanSize(att.size)})`}
    >
      {loading ? (
        <div className="w-3 h-3 border-2 border-jarvis-accent border-t-transparent rounded-full animate-spin" />
      ) : errored ? (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-red-400">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 5v4M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent">
          <path d="M9 2H4C3.44772 2 3 2.44772 3 3V13C3 13.5523 3.44772 14 4 14H12C12.5523 14 13 13.5523 13 13V6L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 2V6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      <span className="text-jarvis-text max-w-[180px] truncate">{att.name}</span>
      <span className="text-jarvis-muted">({humanSize(att.size)})</span>
      <button
        onClick={onRemove}
        className="ml-1 text-jarvis-muted hover:text-red-400 transition-colors"
        title="Remove file"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

function LoaderOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-jarvis-bg/70 backdrop-blur-[1px]">
      <div className="w-5 h-5 border-2 border-jarvis-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ErrorOverlay({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-red-900/40" title={title}>
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="text-red-300">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M8 5v4M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  )
}
