import { create } from 'zustand'

export type Role = 'user' | 'assistant' | 'system'

export interface ToolCall {
  name: string
  args: any
  timestamp: number
}

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: number
  isStreaming?: boolean
  toolCalls?: ToolCall[]
  sessionId: string
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  lastMessageAt: number
}

interface ChatStore {
  messages: Message[]
  sessions: ChatSession[]
  currentSessionId: string
  isLoading: boolean
  activeTool: string | null
  sidebarOpen: boolean
  shouldStop: boolean

  addMessage: (msg: Omit<Message, 'id' | 'timestamp' | 'sessionId'>) => string
  updateMessage: (id: string, patch: Partial<Message>) => void
  appendChunk: (id: string, chunk: string) => void
  setLoading: (v: boolean) => void
  setActiveTool: (tool: string | null) => void
  setSidebarOpen: (v: boolean) => void
  setShouldStop: (v: boolean) => void
  clearMessages: () => void
  createNewSession: () => void
  switchSession: (sessionId: string) => void
  getHistory: () => Array<{ role: string; content: string }>
  getCurrentMessages: () => Message[]
  initialize: () => Promise<void>
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  sessions: [],
  currentSessionId: `session-${Date.now()}`,
  isLoading: false,
  activeTool: null,
  sidebarOpen: false,
  shouldStop: false,

  initialize: async () => {
    try {
      const sessions = await (window as any).jarvis?.getSessions()
      if (sessions && sessions.length > 0) {
        // Sort sessions by updated_at descending
        const sortedSessions = [...sessions].sort((a, b) => b.updated_at - a.updated_at)
        
        // Map DB session fields to store fields
        const mappedSessions: ChatSession[] = sortedSessions.map((s: any) => ({
          id: s.id,
          title: s.title || 'Untitled Chat',
          createdAt: s.created_at,
          lastMessageAt: s.updated_at
        }))

        // Load messages for ALL sessions to populate the store's messages array
        const history = await (window as any).jarvis?.getHistory(500) // Get more history to cover multiple sessions
        
        if (history) {
          const mappedMessages: Message[] = history.map((m: any) => ({
            id: `msg-${m.id}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            sessionId: m.session_id
          }))

          // Sort messages by timestamp ascending for correct display
          mappedMessages.sort((a, b) => a.timestamp - b.timestamp)

          set({ 
            sessions: mappedSessions, 
            messages: mappedMessages,
            currentSessionId: mappedSessions[0].id 
          })
        } else {
          set({ sessions: mappedSessions, currentSessionId: mappedSessions[0].id })
        }
      } else {
        // No sessions found, create a default one
        const defaultSessionId = `session-${Date.now()}`
        set({ currentSessionId: defaultSessionId })
      }
    } catch (err) {
      console.error('Failed to initialize chat store:', err)
    }
  },

  addMessage: (msg) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const currentSessionId = get().currentSessionId
    const newMessage = { ...msg, id, timestamp: Date.now(), sessionId: currentSessionId }
    
    console.log('💾 Adding message to store:', {
      id,
      role: msg.role,
      contentLength: msg.content.length,
      contentPreview: msg.content.substring(0, 100),
      sessionId: currentSessionId
    })
    
    set(s => {
      const existingSession = s.sessions.find(sess => sess.id === currentSessionId)
      let sessions = s.sessions

      if (!existingSession) {
        const newSession = { 
          id: currentSessionId, 
          title: msg.role === 'user' ? msg.content.slice(0, 50) : 'New Chat', 
          createdAt: Date.now(), 
          lastMessageAt: Date.now() 
        }
        sessions = [newSession, ...s.sessions]
        // Save session to DB
        ;(window as any).jarvis?.createSession?.(newSession.id, newSession.title)
      } else {
        sessions = s.sessions.map(sess => 
          sess.id === currentSessionId 
            ? { ...sess, lastMessageAt: Date.now(), title: sess.title === 'New Chat' && msg.role === 'user' ? msg.content.slice(0, 50) : sess.title }
            : sess
        )
        // Update session in DB
        const updatedSession = sessions.find(sess => sess.id === currentSessionId)
        if (updatedSession) {
          ;(window as any).jarvis?.updateSession?.(updatedSession.id, updatedSession.title)
        }
      }
      
      return {
        messages: [...s.messages, newMessage],
        sessions
      }
    })
    return id
  },

  updateMessage: (id, patch) => {
    set(s => ({
      messages: s.messages.map(m => m.id === id ? { ...m, ...patch } : m)
    }))
  },

  appendChunk: (id, chunk) => {
    console.log('📝 Appending chunk to message:', id, 'chunk length:', chunk.length)
    set(s => ({
      messages: s.messages.map(m =>
        m.id === id ? { ...m, content: m.content + chunk } : m
      )
    }))
  },

  setLoading: (v) => set({ isLoading: v }),
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setShouldStop: (v) => set({ shouldStop: v }),
  
  clearMessages: () => set({ messages: [], sessions: [], currentSessionId: `session-${Date.now()}` }),
  
  createNewSession: () => {
    const newSessionId = `session-${Date.now()}`
    set({ currentSessionId: newSessionId })
  },
  
  switchSession: (sessionId) => {
    set({ currentSessionId: sessionId })
  },

  getCurrentMessages: () => {
    const currentSessionId = get().currentSessionId
    return get().messages.filter(m => m.sessionId === currentSessionId)
  },

  getHistory: () => {
    const currentSessionId = get().currentSessionId
    return get().messages
      .filter(m => m.sessionId === currentSessionId && m.role !== 'system' && !m.isStreaming)
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-20)
  },
}))
