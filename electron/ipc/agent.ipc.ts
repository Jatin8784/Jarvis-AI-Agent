import { ipcMain, BrowserWindow } from 'electron'
import { runAgent } from '../../agent/orchestrator'
import { runAgentGroq } from '../../agent/groq.orchestrator'
import { runAgentClaude } from '../../agent/claude.orchestrator'
import { runAgentDeepSeek } from '../../agent/deepseek.orchestrator'
import { runAgentOllama } from '../../agent/ollama.orchestrator'
import { runAgentPuter } from '../../agent/puter.orchestrator'
import { runAgentMiniMax } from '../../agent/minimax.orchestrator'
import { transcribeAudio, detectWakeWord } from '../../agent/transcriber'
import { speak } from '../../agent/tools/voice'
import { getMessages, saveMessage, createSession, getSessions, updateSession, saveMessageAttachments, getMessageAttachments, updateMessageDisplayContent, clearAllData, deleteSessionData } from '../../db/sqlite'
import Store from 'electron-store'

const store = new Store()

// Fire-and-forget TTS so the chat IPC response doesn't block on speech playback.
// The user hears the reply while the UI has already rendered.
function speakInBackground(text: string) {
  if (!text || !text.trim()) return
  if (text.includes('⚠️ Error:')) return
  speak(text).catch(err => {
    console.error('TTS failed:', err)
  })
}

export function registerAgentIPC(win: BrowserWindow | null) {
  ipcMain.handle('agent:chat', async (event, { msg, history, sessionId }) => {
    const window = win || BrowserWindow.getFocusedWindow()

    try {
      const provider = (store.get('provider') as string) || 'groq'
      
      let fullResponse: string

      if (provider === 'puter') {
        console.log('🤖 Using Puter provider (FREE & Unlimited)')
        fullResponse = await runAgentPuter(
          msg,
          history || [],
          sessionId || 'default',
          (chunk: string) => {
            window?.webContents.send('agent:chunk', chunk)
          },
          (tool: string, args: any) => {
            window?.webContents.send('agent:tool-call', tool, args)
          }
        )
      } else if (provider === 'deepseek') {
        console.log('🤖 Using DeepSeek provider')
        fullResponse = await runAgentDeepSeek(
          msg,
          history || [],
          sessionId || 'default',
          (chunk: string) => {
            window?.webContents.send('agent:chunk', chunk)
          },
          (tool: string, args: any) => {
            window?.webContents.send('agent:tool-call', tool, args)
          }
        )
      } else if (provider === 'ollama') {
        console.log('🤖 Using Ollama Cloud provider')
        fullResponse = await runAgentOllama(
          msg,
          history || [],
          sessionId || 'default',
          (chunk: string) => {
            window?.webContents.send('agent:chunk', chunk)
          },
          (tool: string, args: any) => {
            window?.webContents.send('agent:tool-call', tool, args)
          }
        )
      } else if (provider === 'claude') {
        console.log('🤖 Using Claude provider')
        fullResponse = await runAgentClaude(
          msg,
          history || [],
          sessionId || 'default',
          (chunk: string) => {
            window?.webContents.send('agent:chunk', chunk)
          },
          (tool: string, args: any) => {
            window?.webContents.send('agent:tool-call', tool, args)
          }
        )
      } else if (provider === 'groq') {
        console.log('🤖 Using Groq provider')
        fullResponse = await runAgentGroq(
          msg,
          history || [],
          sessionId || 'default',
          (chunk: string) => {
            window?.webContents.send('agent:chunk', chunk)
          },
          (tool: string, args: any) => {
            window?.webContents.send('agent:tool-call', tool, args)
          }
        )
      } else if (provider === 'minimax') {
        console.log('🤖 Using MiniMax provider')
        fullResponse = await runAgentMiniMax(
          msg,
          history || [],
          sessionId || 'default',
          (chunk: string) => {
            window?.webContents.send('agent:chunk', chunk)
          },
          (tool: string, args: any) => {
            window?.webContents.send('agent:tool-call', tool, args)
          }
        )
      } else {
        console.log('🤖 Using Gemini provider')
        fullResponse = await runAgent(
          msg,
          history || [],
          sessionId || 'default',
          (chunk: string) => {
            window?.webContents.send('agent:chunk', chunk)
          },
          (tool: string, args: any) => {
            window?.webContents.send('agent:tool-call', tool, args)
          }
        )
      }

      // TTS for every provider (respects the 'voice' setting inside speak()).
      speakInBackground(fullResponse)

      return { success: true, text: fullResponse }
    } catch (err: any) {
      console.error('Agent error:', err)
      return { success: false, error: err.message || 'Unknown error' }
    }
  })

  ipcMain.handle('agent:transcribe', async (event, { audio, mimeType }) => {
    try {
      const transcript = await transcribeAudio(audio, mimeType)
      return { success: true, transcript }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('agent:wakeword', async (event, { audio, mimeType }) => {
    try {
      const detected = await detectWakeWord(audio, mimeType)
      return { success: true, detected }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:history', async (event, limit = 50, userId?: string) => {
    const messages = getMessages(limit, undefined, userId) as any[]
    if (messages.length === 0) return messages

    // Load attachments for all messages
    const messageIds = messages.map((m: any) => m.id)
    const attachments = getMessageAttachments(messageIds)

    // Merge attachments and displayContent into messages
    return messages.map((m: any) => ({
      ...m,
      displayContent: m.display_content || undefined,
      imageDataUrls: attachments[m.id]?.imageDataUrls || undefined,
      fileAttachments: attachments[m.id]?.fileAttachments || undefined,
    }))
  })

  ipcMain.handle('db:sessions', async (event, userId?: string) => {
    return getSessions(100, userId)
  })

  ipcMain.handle('db:session-create', async (event, { id, title, userId }) => {
    return createSession(id, title, userId)
  })

  ipcMain.handle('db:session-update', async (event, { id, title }) => {
    return updateSession(id, title)
  })

  ipcMain.handle('db:session-delete', async (event, sessionId: string) => {
    return deleteSessionData(sessionId)
  })

  ipcMain.handle('db:save-attachments', async (event, { sessionId, imageDataUrls, fileAttachments, displayContent, content, isAssistant }) => {
    try {
      // Save assistant message (Puter frontend case)
      if (isAssistant && content) {
        saveMessage('assistant', content, sessionId)
        return { success: true }
      }

      // If content provided, save the user message first (for Puter frontend provider)
      if (content && !isAssistant) {
        saveMessage('user', content, sessionId, 0, displayContent || undefined)
      }

      // Find the most recent user message in this session
      const messages = getMessages(20, sessionId) as any[]
      const msg = messages
        .filter((m: any) => m.role === 'user')
        .sort((a: any, b: any) => b.timestamp - a.timestamp)[0]

      if (msg) {
        // Save attachments
        if (imageDataUrls?.length || fileAttachments?.length) {
          saveMessageAttachments(msg.id, sessionId, imageDataUrls, fileAttachments)
        }

        // Update display_content if not already set
        if (displayContent !== undefined && !msg.display_content) {
          updateMessageDisplayContent(msg.id, displayContent || null)
        }

        return { success: true }
      }
      return { success: false, error: 'Message not found' }
    } catch (err: any) {
      console.error('Failed to save attachments:', err)
      return { success: false, error: err.message }
    }
  })

  ipcMain.handle('db:clear', async () => {
    clearAllData()
    return true
  })
}
