import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('jarvis', {
  // Window controls
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  show:     () => ipcRenderer.send('window:show'),
  close:    () => ipcRenderer.send('window:close'),

  // Chat
  sendMessage: (msg: string, history: any[], sessionId: string) =>
    ipcRenderer.invoke('agent:chat', { msg, history, sessionId }),

  onChunk: (cb: (text: string) => void) => {
    const handler = (_: any, text: string) => cb(text)
    ipcRenderer.on('agent:chunk', handler)
    return () => ipcRenderer.removeListener('agent:chunk', handler)
  },

  onToolCall: (cb: (tool: string, args: any) => void) => {
    const handler = (_: any, tool: string, args: any) => cb(tool, args)
    ipcRenderer.on('agent:tool-call', handler)
    return () => ipcRenderer.removeListener('agent:tool-call', handler)
  },

  // History
  getHistory:   (limit?: number) => ipcRenderer.invoke('db:history', limit),
  clearHistory: () => ipcRenderer.invoke('db:clear'),
  createSession: (id: string, title: string) => ipcRenderer.invoke('db:session-create', { id, title }),
  updateSession: (id: string, title: string) => ipcRenderer.invoke('db:session-update', { id, title }),
  getSession:   (id: string) => ipcRenderer.invoke('db:session', id),
  getSessions:  () => ipcRenderer.invoke('db:sessions'),

  // Voice
  startRecording: () => ipcRenderer.invoke('voice:start'),
  stopRecording:  () => ipcRenderer.invoke('voice:stop'),
  transcribe: (audio: string, mimeType: string) => ipcRenderer.invoke('agent:transcribe', { audio, mimeType }),
  checkWakeWord: (audio: string, mimeType: string) => ipcRenderer.invoke('agent:wakeword', { audio, mimeType }),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s: any) => ipcRenderer.invoke('settings:set', s),

  // System
  getSystemInfo: () => ipcRenderer.invoke('system:info'),

  // Tools (for Puter.js frontend execution)
  executeTool: (toolName: string, args: any) => 
    ipcRenderer.invoke('tools:execute', { toolName, args }).then(res => {
      if (res.success) return res.result
      throw new Error(res.error)
    }),
})

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
})
