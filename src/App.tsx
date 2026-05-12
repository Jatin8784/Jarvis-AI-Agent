import React, { useEffect, useCallback, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { ChatWindow } from './components/ChatWindow'
import { InputBar } from './components/InputBar'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { SettingsPanel } from './components/SettingsPanel'
import { WakeWordListener } from './components/WakeWordListener'
import { useChatStore } from './stores/chat.store'
import { callPuterAI, buildSystemPrompt } from './services/puter.service'

export default function App() {
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
    initialize,
  } = useChatStore()

  const messages = getCurrentMessages()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [currentAssistantId, setCurrentAssistantId] = useState<string | null>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

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

  const sendMessage = useCallback(async (text: string) => {
    if (isLoading) return

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
    addMessage({ role: 'user', content: text })

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

        // Call Puter AI with simple format
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
          }
        )

        updateMessage(assistantId, { isStreaming: false })
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
  }, [isLoading, addMessage, updateMessage, setLoading, setActiveTool, getHistory, appendChunk])

  const handleNewChat = () => {
    createNewSession()
  }

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

      <div className="flex flex-1 overflow-hidden relative">
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

          <ChatWindow />

          <InputBar
            onSend={sendMessage}
            disabled={isLoading}
            activeTool={activeTool}
            onStop={handleStop}
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
    </div>
  )
}
