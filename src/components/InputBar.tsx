import React, { useState, useRef, useEffect, KeyboardEvent } from 'react'

interface InputBarProps {
  onSend: (msg: string) => void
  disabled: boolean
  activeTool: string | null
  onStop?: () => void
}

const SUGGESTIONS = [
  'Search the web for latest AI news',
  'Read my Desktop folder',
  'What are my system specs?',
  'Write a Python script to rename files',
  'Explain quantum computing',
]

export function InputBar({ onSend, disabled, activeTool, onStop }: InputBarProps) {
  const [value, setValue] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
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

  const handleSend = async () => {
    const msg = value.trim()
    // Prevent sending if disabled OR if no content
    if (disabled || (!msg && attachedFiles.length === 0)) return
    
    // Handle attached files
    if (attachedFiles.length > 0) {
      let fullMessage = msg || "Can you read this file?"
      
      for (const file of attachedFiles) {
        try {
          // In Electron, File objects have a 'path' property with the full file path
          const filePath = (file as any).path
          
          if (filePath) {
            // We have the full path - tell JARVIS to read it
            fullMessage += `\n\n📎 Attached file: ${file.name}\nPath: ${filePath}\n\nPlease read and analyze this file using the read_file tool.`
          } else {
            // Fallback: try to read the file content directly
            const ext = file.name.split('.').pop()?.toLowerCase()
            
            if (['txt', 'md', 'json', 'csv', 'js', 'ts', 'py', 'html', 'css'].includes(ext || '')) {
              const text = await file.text()
              fullMessage += `\n\n📎 **File: ${file.name}**\n\`\`\`\n${text.substring(0, 5000)}${text.length > 5000 ? '\n... (truncated)' : ''}\n\`\`\``
            } else {
              fullMessage += `\n\n📎 **File: ${file.name}** (${(file.size / 1024).toFixed(1)} KB) - Please use read_file tool to read this file.`
            }
          }
        } catch (err) {
          console.error('Error processing file:', err)
          fullMessage += `\n\n📎 **File: ${file.name}** - Error: ${err}`
        }
      }
      
      onSend(fullMessage)
      setAttachedFiles([])
    } else {
      onSend(msg)
    }
    
    setValue('')
    setShowSuggestions(false)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachedFiles(prev => [...prev, ...files])
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Only send if not disabled
      if (!disabled) {
        handleSend()
      }
    }
  }

  const toggleVoice = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false)
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
          
          // Convert to base64
          const reader = new FileReader()
          reader.readAsDataURL(audioBlob)
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1]
            
            setIsTranscribing(true)
            try {
              const result = await (window as any).jarvis.transcribe(base64Audio, mediaRecorder.mimeType)
              if (result.success && result.transcript) {
                setValue(prev => prev ? `${prev} ${result.transcript}` : result.transcript)
              } else if (result.error) {
                console.error('Transcription error:', result.error)
              }
            } catch (err) {
              console.error('Failed to transcribe:', err)
            } finally {
              setIsTranscribing(false)
            }
          }

          // Stop all tracks
          stream.getTracks().forEach(track => track.stop())
        }

        setIsRecording(true)
        mediaRecorder.start()
        
      } catch (err: any) {
        console.error('Microphone access error:', err)
        alert('Could not access microphone. Please check permissions.')
        setIsRecording(false)
      }
    }
  }

  const toolLabel = activeTool?.replace(/_/g, ' ') || ''

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

      {/* Attached files display */}
      {attachedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded bg-jarvis-accent/10 border border-jarvis-accent/30 text-xs">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-jarvis-accent">
                <path d="M9 2H4C3.44772 2 3 2.44772 3 3V13C3 13.5523 3.44772 14 4 14H12C12.5523 14 13 13.5523 13 13V6L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 2V6H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-jarvis-text">{file.name}</span>
              <span className="text-jarvis-muted">({(file.size / 1024).toFixed(1)} KB)</span>
              <button
                onClick={() => removeFile(i)}
                className="ml-1 text-jarvis-muted hover:text-red-400 transition-colors"
                title="Remove file"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.json,.csv,.xlsx,.md,.js,.ts,.py,.html,.css"
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

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={isTranscribing ? 'Transcribing audio...' : disabled ? 'JARVIS is thinking… (you can type, but wait to send)' : 'Ask anything… (Enter to send, Shift+Enter for newline)'}
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
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded border border-jarvis-accent/40
                     text-jarvis-accent hover:bg-jarvis-accent/10 disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all hover:shadow-glow-sm mb-0.5"
          title={disabled ? "Wait for JARVIS to finish" : "Send (Enter)"}
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
          {attachedFiles.length > 0 
            ? `${attachedFiles.length} file${attachedFiles.length > 1 ? 's' : ''} attached • ${value.length} chars`
            : value.length > 0 
              ? `${value.length} chars` 
              : 'Ctrl+Shift+J to toggle window'}
        </span>
        <span className="text-jarvis-muted text-xs">
          Powered by AI
        </span>
      </div>
    </div>
  )
}
