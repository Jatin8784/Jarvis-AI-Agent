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
  // Inline image data URLs attached to this message (for rendering thumbnails in chat)
  imageDataUrls?: Array<{ name: string; dataUrl: string }>
  // File attachment previews (text content for preview cards)
  fileAttachments?: Array<{ name: string; path: string; text?: string }>
  // The display-only text (what user typed, without attachment instructions)
  // If set, the chat bubble shows this instead of content
  displayContent?: string
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
  deleteSession: (sessionId: string) => void
  renameSession: (sessionId: string, title: string) => void
  getHistory: () => Array<{ role: string; content: string }>
  getCurrentMessages: () => Message[]
  deleteMessagesFrom: (messageId: string) => void
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
      // Get current user ID from auth store
      const { useAuthStore } = await import('./auth.store')
      const userId = useAuthStore.getState().user?.uid || ''

      const sessions = await (window as any).jarvis?.getSessions(userId)
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
        const history = await (window as any).jarvis?.getHistory(500, userId) // Get history for this user
        
        if (history) {
          const mappedMessages: Message[] = history.map((m: any) => ({
            id: `msg-${m.id}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            sessionId: m.session_id,
            displayContent: m.displayContent || undefined,
            imageDataUrls: m.imageDataUrls || undefined,
            fileAttachments: m.fileAttachments || undefined,
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
        // Save session to DB with user ID
        const userId = (window as any).__jarvisUserId || ''
        ;(window as any).jarvis?.createSession?.(newSession.id, newSession.title, userId)
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
  
  clearMessages: () => {
    // Clear DB
    ;(window as any).jarvis?.clearHistory?.()
    // Clear in-memory state
    set({ messages: [], sessions: [], currentSessionId: `session-${Date.now()}` })
  },
  
  createNewSession: () => {
    const newSessionId = `session-${Date.now()}`
    set({ currentSessionId: newSessionId })
  },
  
  switchSession: (sessionId) => {
    set({ currentSessionId: sessionId })
  },

  deleteSession: (sessionId) => {
    const state = get()
    // Remove session and its messages from memory
    const newSessions = state.sessions.filter(s => s.id !== sessionId)
    const newMessages = state.messages.filter(m => m.sessionId !== sessionId)
    // Always create a new chat when deleting current session
    let newCurrentId = state.currentSessionId
    if (sessionId === state.currentSessionId) {
      newCurrentId = `session-${Date.now()}`
    }
    set({ sessions: newSessions, messages: newMessages, currentSessionId: newCurrentId })
    // Delete from DB
    ;(window as any).jarvis?.deleteSession?.(sessionId)
  },

  renameSession: (sessionId, title) => {
    set(s => ({
      sessions: s.sessions.map(sess =>
        sess.id === sessionId ? { ...sess, title } : sess
      )
    }))
    // Update in DB
    ;(window as any).jarvis?.updateSession?.(sessionId, title)
  },

  deleteMessagesFrom: (messageId) => {
    const currentSessionId = get().currentSessionId
    const sessionMessages = get().messages.filter(m => m.sessionId === currentSessionId)
    const idx = sessionMessages.findIndex(m => m.id === messageId)
    if (idx === -1) return

    // Get IDs of messages to remove (this message and all after it in this session)
    const idsToRemove = new Set(sessionMessages.slice(idx).map(m => m.id))
    set(s => ({
      messages: s.messages.filter(m => !idsToRemove.has(m.id))
    }))
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
