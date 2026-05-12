import React, { useEffect, useRef, useLayoutEffect, useState } from 'react'
import { useChatStore } from '../stores/chat.store'
import { MessageBubble } from './MessageBubble'

const WELCOME_LINES = [
  '> JARVIS AI initialized.',
  '> All systems online.',
  '> Tools: web_search, execute_code, file_system, voice, system_info',
  '> How can I assist you today?',
]

export function ChatWindow() {
  const getCurrentMessages = useChatStore(s => s.getCurrentMessages)
  const messages = getCurrentMessages()
  const isLoading = useChatStore(s => s.isLoading)
  const currentSessionId = useChatStore(s => s.currentSessionId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevSessionId = useRef(currentSessionId)
  const hasScrolledToBottom = useRef(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const prevMessagesLength = useRef(messages.length)
  const lastScrollTop = useRef(0)

  // Check if user has scrolled up
  const handleScroll = () => {
    if (!containerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    
    // Store current scroll position
    lastScrollTop.current = scrollTop
    
    setShowScrollButton(!isNearBottom && messages.length > 0)
  }

  // Scroll to bottom function
  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Immediately scroll to bottom when session changes or on initial load
  useLayoutEffect(() => {
    if (currentSessionId !== prevSessionId.current) {
      // Session changed - reset flag and scroll instantly
      hasScrolledToBottom.current = false
      prevSessionId.current = currentSessionId
      prevMessagesLength.current = 0
    }
    
    // Scroll to bottom immediately before paint
    if (containerRef.current && messages.length > 0) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
      hasScrolledToBottom.current = true
    }
  }, [currentSessionId, messages.length])

  // Scroll to bottom when new messages arrive or content updates (streaming)
  useEffect(() => {
    if (!containerRef.current) return
    
    const hasNewMessage = messages.length > prevMessagesLength.current
    const lastMessage = messages[messages.length - 1]
    
    // Check if user is near bottom
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    const isNearBottom = distanceFromBottom < 200
    
    // Always scroll to bottom when:
    // 1. A new message is added (user sent message or AI started responding)
    // 2. Content is being streamed and we're already near the bottom
    if (hasNewMessage) {
      // New message - always scroll immediately
      console.log('📜 New message detected, scrolling to bottom')
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      }, 50)
    } else if (lastMessage?.isStreaming && isNearBottom) {
      // Streaming update - auto-scroll if near bottom
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      }, 50)
    }
    
    // Update previous length
    prevMessagesLength.current = messages.length
  }, [messages])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4" onScroll={handleScroll}>
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center py-12">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full border border-jarvis-accent/30 flex items-center justify-center mx-auto mb-4"
                 style={{ boxShadow: '0 0 30px rgba(0,212,255,0.15)' }}>
              <div className="w-8 h-8 rounded-full border border-jarvis-accent/60 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-jarvis-accent animate-pulse-slow" />
              </div>
            </div>
            <h1 className="font-display text-jarvis-accent text-2xl tracking-widest glow-text mb-1">JARVIS</h1>
            <p className="text-jarvis-muted text-xs tracking-wider">JUST A RATHER VERY INTELLIGENT SYSTEM</p>
          </div>

          <div className="w-full max-w-lg text-left">
            <div className="rounded border border-jarvis-border bg-jarvis-panel/50 p-4 font-mono text-xs space-y-1">
              {WELCOME_LINES.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-jarvis-accent/60">{String(i + 1).padStart(2, '0')}</span>
                  <span className={i === WELCOME_LINES.length - 1 ? 'text-jarvis-accent' : 'text-jarvis-muted'}>
                    {line}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 w-full max-w-lg">
            {[
              ['Search the web', 'web_search'],
              ['Run some code', 'execute_code'],
              ['Read a file', 'read_file'],
              ['System info', 'get_system_info'],
            ].map(([label]) => (
              <div key={label}
                className="px-3 py-2 rounded border border-jarvis-border text-jarvis-muted text-xs text-center
                           hover:border-jarvis-accent/30 hover:text-jarvis-accent transition-colors cursor-default">
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
        <div className="flex gap-3 mb-4">
          <div className="w-7 h-7 rounded border border-jarvis-accent/40 flex items-center justify-center mt-1"
               style={{ background: 'rgba(0,212,255,0.06)' }}>
            <div className="w-2 h-2 rounded-full bg-jarvis-accent animate-pulse" />
          </div>
          <div className="flex items-center gap-1.5 mt-2.5">
            {[0, 1, 2].map(i => (
              <span key={i}
                className="w-1.5 h-1.5 rounded-full bg-jarvis-accent/60"
                style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-24 w-12 h-12 rounded-full bg-jarvis-accent/90 hover:bg-jarvis-accent backdrop-blur-sm border border-jarvis-accent shadow-lg hover:shadow-glow transition-opacity flex items-center justify-center z-10 animate-scale-in-centered"
          style={{ left: '50%', transform: 'translateX(-50%)' }}
          title="Scroll to bottom"
        >
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="text-jarvis-bg">
            <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}
