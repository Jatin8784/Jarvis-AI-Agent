interface JarvisAPI {
  minimize: () => void
  maximize: () => void
  show: () => void
  close: () => void
  sendMessage: (msg: string, history: any[], sessionId: string) => Promise<{ success: boolean; text?: string; error?: string }>
  onChunk: (cb: (text: string) => void) => () => void
  onToolCall: (cb: (tool: string, args: any) => void) => () => void
  getHistory: (limit?: number) => Promise<any[]>
  clearHistory: () => Promise<boolean>
  createSession: (id: string, title: string) => Promise<void>
  updateSession: (id: string, title: string) => Promise<void>
  getSessions: () => Promise<any[]>
  startRecording: () => Promise<void>
  stopRecording: () => Promise<{ transcript: string }>
  transcribe: (audio: string, mimeType: string) => Promise<{ success: boolean; transcript?: string; error?: string }>
  checkWakeWord: (audio: string, mimeType: string) => Promise<{ success: boolean; detected?: boolean; error?: string }>
  getSettings: () => Promise<any>
  setSettings: (s: any) => Promise<boolean>
  getSystemInfo: () => Promise<any>
}

interface ElectronAPI {
  platform: string
}

declare global {
  interface Window {
    jarvis: JarvisAPI
    electron: ElectronAPI
  }
}

export {}
