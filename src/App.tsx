import React, { useEffect, useCallback, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { ChatWindow } from './components/ChatWindow'
import { InputBar } from './components/InputBar'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { SettingsPanel } from './components/SettingsPanel'
import { WakeWordListener } from './components/WakeWordListener'
import { RevertBar } from './components/RevertBar'
import { ImagePreview } from './components/ImagePreview'
import { AuthScreen } from './components/AuthScreen'
import { useChatStore } from './stores/chat.store'
import { useAuthStore } from './stores/auth.store'
import { onAuthChange } from './services/firebase'
import { callPuterAI, buildSystemPrompt } from './services/puter.service'

export default function App() {
  const { user, loading: authLoading, setUser } = useAuthStore()

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser)
      // Set global user ID for chat store to use
      ;(window as any).__jarvisUserId = firebaseUser?.uid || ''
    })
    return () => unsubscribe()
  }, [setUser])

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-jarvis-bg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-jarvis-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-jarvis-muted text-xs font-display tracking-wider">INITIALIZING...</p>
        </div>
      </div>
    )
  }

  // Show auth screen if not logged in
  if (!user) {
    return <AuthScreen />
  }

  return <MainApp />
}

function MainApp() {
  const { user } = useAuthStore()
  const {
    isLoading,
    activeTool,
    sidebarOpen,
    shouldStop,
    addMessage,
    appendChunk,
    updateMessage,
    setLoading,
    setActiveTool,
    setSidebarOpen,
    setShouldStop,
    createNewSession,
    getCurrentMessages,
    getHistory,
    deleteMessagesFrom,
    initialize,
  } = useChatStore()

  const messages = getCurrentMessages()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [previewImage, setPreviewImage] = useState<{ src: string; name: string } | null>(null)

  useEffect(() => {
    if (user?.uid) {
      ;(window as any).__jarvisUserId = user.uid
      initialize()
    }
  }, [initialize, user])

  useEffect(() => {
    const removeChunk = (window as any).jarvis?.onChunk?.((chunk: string) => {
      // Check if user clicked stop
      if (useChatStore.getState().shouldStop) {
        console.log('🛑 Stop detected in chunk listener')
        return
      }
      
      if (currentAssistantId) {
        appendChunk(currentAssistantId, chunk)
      }
    })

    const removeTool = (window as any).jarvis?.onToolCall?.((tool: string, args: any) => {
      setActiveTool(tool)
      if (currentAssistantId) {
        useChatStore.setState(s => ({
          messages: s.messages.map(m =>
            m.id === currentAssistantId
              ? { ...m, toolCalls: [...(m.toolCalls || []), { name: tool, args, timestamp: Date.now() }] }
              : m
          )
        }))
      }
    })

    return () => {
      removeChunk?.()
      removeTool?.()
    }
  }, [currentAssistantId, appendChunk, setActiveTool])

  const processMessage = useCallback(async (text: string, meta?: { displayContent?: string; imageDataUrls?: Array<{ name: string; dataUrl: string }>; fileAttachments?: Array<{ name: string; path: string; text?: string }> }) => {
    // Reset stop flag
    setShouldStop(false)

    // Detect sensitive information
    const sensitivePatterns = [
      { pattern: /(?:api[_-]?key|apikey|api_secret|secret[_-]?key)[\s:=]+['"]*([a-zA-Z0-9_\-]{20,})['"]*/, name: 'API Key' },
      { pattern: /(?:password|passwd|pwd)[\s:=]+['"]*([^\s'"]+)['"]*/, name: 'Password' },
      { pattern: /(?:token|auth[_-]?token|access[_-]?token)[\s:=]+['"]*([a-zA-Z0-9_\-\.]{20,})['"]*/, name: 'Token' },
      { pattern: /sk-[a-zA-Z0-9]{20,}/, name: 'OpenAI API Key' },
      { pattern: /AIza[a-zA-Z0-9_\-]{35}/, name: 'Google API Key' },
      { pattern: /gsk_[a-zA-Z0-9]{20,}/, name: 'Groq API Key' },
      { pattern: /sk-ant-[a-zA-Z0-9\-_]{20,}/, name: 'Anthropic API Key' },
      { pattern: /[a-f0-9]{64}/, name: 'SerpAPI Key (64-char hex)' },
      { pattern: /serpapi[_-]?key[\s:=]+['"]*([a-zA-Z0-9]{32,})['"]*/, name: 'SerpAPI Key' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/, name: 'GitHub Token' },
      { pattern: /xox[baprs]-[a-zA-Z0-9\-]{10,}/, name: 'Slack Token' },
      { pattern: /-----BEGIN (?:RSA |)PRIVATE KEY-----/, name: 'Private Key' },
      { pattern: /\.env|environment variables/i, name: '.env file content' },
      { pattern: /mongodb\+srv:\/\/[^\s]+/, name: 'MongoDB Connection String' },
      { pattern: /postgres:\/\/[^\s]+/, name: 'PostgreSQL Connection String' },
      { pattern: /mysql:\/\/[^\s]+/, name: 'MySQL Connection String' },
    ]

    let detectedSensitive = []
    for (const { pattern, name } of sensitivePatterns) {
      if (pattern.test(text)) {
        detectedSensitive.push(name)
      }
    }

    // Show warning if sensitive data detected
    if (detectedSensitive.length > 0) {
      const confirmed = confirm(
        `⚠️ SECURITY WARNING\n\n` +
        `Detected sensitive information: ${detectedSensitive.join(', ')}\n\n` +
        `Sharing API keys, passwords, or tokens can compromise your security!\n\n` +
        `• Your data may be logged or stored\n` +
        `• Keys could be exposed to unauthorized access\n` +
        `• Consider using environment variables instead\n\n` +
        `Do you want to continue sending this message?`
      )
      
      if (!confirmed) {
        return // User cancelled
      }
    }

    const sessionId = useChatStore.getState().currentSessionId
    console.log('[App] processMessage — meta:', { hasImages: !!meta?.imageDataUrls?.length, hasFiles: !!meta?.fileAttachments?.length, hasDisplay: !!meta?.displayContent })
    addMessage({
      role: 'user',
      content: text,
      displayContent: meta?.displayContent,
      imageDataUrls: meta?.imageDataUrls,
      fileAttachments: meta?.fileAttachments,
    })

    // Persist attachments and displayContent to disk/DB so they survive restart
    // Delay to ensure backend orchestrator has saved the message first
    const currentSessionId = useChatStore.getState().currentSessionId
    setTimeout(() => {
      ;(window as any).jarvis?.saveAttachments?.({
        sessionId: currentSessionId,
        imageDataUrls: meta?.imageDataUrls,
        fileAttachments: meta?.fileAttachments,
        displayContent: meta?.displayContent,
        content: text, // pass content so it can save if backend hasn't yet (Puter case)
      })
    }, 3000)

    const assistantId = addMessage({
      role: 'assistant',
      content: '',
      isStreaming: true,
      toolCalls: [],
    })
    setCurrentAssistantId(assistantId)
    setLoading(true)
    setActiveTool(null)

    try {
      // Check if using Puter.js provider
      const settings = await (window as any).jarvis?.getSettings()
      const provider = settings?.provider || 'deepseek'

      if (provider === 'puter') {
        // Use Puter.js directly in frontend
        console.log('🤖 Using Puter.js (frontend)')
        
        const history = getHistory().slice(0, -1)
        const systemPrompt = buildSystemPrompt(settings?.systemPrompt || '')
        const model = settings?.model || 'gpt-5.4'

        // Call Puter AI with vision support
        await callPuterAI(
          text,
          history,
          systemPrompt,
          model,
          (chunk: string) => {
            // Check if user clicked stop
            if (useChatStore.getState().shouldStop) {
              console.log('🛑 Stop detected, halting response')
              return
            }
            appendChunk(assistantId, chunk)
          },
          (toolName: string, args: any) => {
            setActiveTool(toolName)
            useChatStore.setState(s => ({
              messages: s.messages.map(m =>
                m.id === assistantId
                  ? { ...m, toolCalls: [...(m.toolCalls || []), { name: toolName, args, timestamp: Date.now() }] }
                  : m
              )
            }))
          },
          meta?.imageDataUrls
        )

        updateMessage(assistantId, { isStreaming: false })

        // Puter runs in frontend — save both messages to DB manually
        const finalAssistantContent = useChatStore.getState().messages.find(m => m.id === assistantId)?.content || ''
        ;(window as any).jarvis?.saveAttachments?.({
          sessionId: useChatStore.getState().currentSessionId,
          content: finalAssistantContent,
          isAssistant: true,
        })
      } else {
        // Use backend providers (DeepSeek, Groq, Claude, Gemini)
        const history = getHistory().slice(0, -1)
        const result = await (window as any).jarvis?.sendMessage(text, history, sessionId)

        if (result?.error) {
          updateMessage(assistantId, {
            content: `⚠️ Error: ${result.error}`,
            isStreaming: false,
          })
        } else {
          updateMessage(assistantId, { isStreaming: false })
        }
      }
    } catch (err: any) {
      updateMessage(assistantId, {
        content: `⚠️ Error: ${err.message}`,
        isStreaming: false,
      })
    } finally {
      setLoading(false)
      setActiveTool(null)
      setCurrentAssistantId(null)
    }
  }, [addMessage, updateMessage, setLoading, setActiveTool, getHistory, appendChunk, setShouldStop])

  // The public sendMessage: either processes immediately or blocks
  const sendMessage = useCallback(async (text: string, meta?: { displayContent?: string; imageDataUrls?: Array<{ name: string; dataUrl: string }>; fileAttachments?: Array<{ name: string; path: string; text?: string }> }) => {
    if (useChatStore.getState().isLoading) return
    await processMessage(text, meta)
  }, [processMessage])

  const handleNewChat = () => {
    createNewSession()
  }

  // Regenerate: delete the assistant message, find the preceding user message, resend it
  const handleRegenerate = useCallback((assistantMsgId: string) => {
    if (isLoading) return
    const msgs = getCurrentMessages()
    const idx = msgs.findIndex(m => m.id === assistantMsgId)
    if (idx === -1) return

    // Find the preceding user message
    let userMsg: string | null = null
    for (let i = idx - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        userMsg = msgs[i].content
        break
      }
    }
    if (!userMsg) return

    // Delete the assistant message (and anything after it)
    deleteMessagesFrom(assistantMsgId)

    // Resend
    setTimeout(() => sendMessage(userMsg!), 50)
  }, [isLoading, getCurrentMessages, deleteMessagesFrom, sendMessage])

  // Edit & Resend: put the message content into the input bar for editing
  const handleEditAndResend = useCallback((userMsgId: string, newText: string) => {
    if (isLoading) return
    // Delete from this message onward
    deleteMessagesFrom(userMsgId)
    // Put text into input bar
    setEditingText(newText)
  }, [isLoading, deleteMessagesFrom])

  const handleStop = () => {
    console.log('🛑 Stop button clicked')
    setShouldStop(true)
    setLoading(false)
    setActiveTool(null)
    
    // Update the current streaming message
    if (currentAssistantId) {
      updateMessage(currentAssistantId, { 
        isStreaming: false,
        content: getCurrentMessages().find(m => m.id === currentAssistantId)?.content + '\n\n⚠️ **Stopped by user**'
      })
      setCurrentAssistantId(null)
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-jarvis-bg relative">
      <div className="scan-line" />

      <TitleBar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNewChat={handleNewChat}
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-jarvis-border/50">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-jarvis-accent/60" />
              <span className="text-jarvis-muted text-xs font-display tracking-widest">
                NEURAL INTERFACE
              </span>
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-jarvis-muted hover:text-jarvis-accent transition-colors text-xs font-display tracking-wider flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
                      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              SETTINGS
            </button>
          </div>

          <ChatWindow
            onRegenerate={handleRegenerate}
            onEditAndResend={handleEditAndResend}
            onImageClick={(src, name) => setPreviewImage({ src, name })}
          />

          <InputBar
            onSend={sendMessage}
            disabled={isLoading}
            activeTool={activeTool}
            onStop={handleStop}
            editingText={editingText}
            onEditingTextConsumed={() => setEditingText('')}
          />
        </div>
      </div>

      <StatusBar
        isLoading={isLoading}
        messageCount={messages.length}
        activeTool={activeTool}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <WakeWordListener />
      <RevertBar />
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
