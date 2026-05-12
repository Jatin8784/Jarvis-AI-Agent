import { ipcMain, BrowserWindow } from 'electron'
import { runAgent } from '../../agent/orchestrator'
import { runAgentGroq } from '../../agent/groq.orchestrator'
import { runAgentClaude } from '../../agent/claude.orchestrator'
import { runAgentDeepSeek } from '../../agent/deepseek.orchestrator'
import { runAgentPuter } from '../../agent/puter.orchestrator'
import { transcribeAudio, detectWakeWord } from '../../agent/transcriber'
import { getMessages, saveMessage, createSession, getSessions, updateSession } from '../../db/sqlite'
import Store from 'electron-store'

const store = new Store()

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

  ipcMain.handle('db:history', async (event, limit = 50) => {
    return getMessages(limit)
  })

  ipcMain.handle('db:sessions', async () => {
    return getSessions(100)
  })

  ipcMain.handle('db:session-create', async (event, { id, title }) => {
    return createSession(id, title)
  })

  ipcMain.handle('db:session-update', async (event, { id, title }) => {
    return updateSession(id, title)
  })

  ipcMain.handle('db:clear', async () => {
    return true
  })
}
