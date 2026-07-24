import { ipcMain } from 'electron'
import store from '../../agent/store'
import os from 'os'
import { dispatchTool } from '../../agent/tools/dispatcher'
import { getFileChangeHistory, revertFileChange } from '../../agent/tools/file-system'
import { sendEmailOTP, verifyEmailOTP } from '../services/email-otp'

export function registerToolsIPC() {
  // Tool execution handler for frontend Puter.js
  ipcMain.handle('tools:execute', async (event, { toolName, args }) => {
    try {
      console.log(`🔧 Executing tool: ${toolName}`, args)
      const result = await dispatchTool(toolName, args)
      return { success: true, result }
    } catch (err: any) {
      console.error(`❌ Tool ${toolName} failed:`, err)
      return { success: false, error: err.message }
    }
  })

  // --- File Revert IPC ---
  ipcMain.handle('file:getChangeHistory', () => {
    return getFileChangeHistory()
  })

  ipcMain.handle('file:revert', (_, changeId: string) => {
    const result = revertFileChange(changeId)
    return { result }
  })

  ipcMain.handle('settings:get', () => {
    return {
      provider: store.get('provider', 'groq'),
      geminiKey: store.get('geminiKey', process.env.GEMINI_API_KEY || ''),
      groqKey: store.get('groqKey', process.env.GROQ_API_KEY || ''),
      claudeKey: store.get('claudeKey', process.env.CLAUDE_API_KEY || ''),
      deepseekKey: store.get('deepseekKey', process.env.DEEPSEEK_API_KEY || ''),
      minimaxKey: store.get('minimaxKey', process.env.MINIMAX_API_KEY || ''),
      ollamaKey: store.get('ollamaKey', process.env.OLLAMA_API_KEY || ''),
      ollamaBaseUrl: store.get('ollamaBaseUrl', process.env.OLLAMA_BASE_URL || 'https://ollama.com/v1'),
      puterToken: store.get('puterToken', ''),
      model: store.get('model', 'llama-3.3-70b-versatile'),
      voice: store.get('voice', true),
      theme: store.get('theme', 'jarvis'),
      systemPrompt: store.get('systemPrompt', ''),
      runOnStartup: store.get('runOnStartup', true),
      wakeWord: store.get('wakeWord', true),
    }
  })

  ipcMain.handle('settings:set', (_, settings) => {
    Object.entries(settings).forEach(([k, v]) => store.set(k, v))
    
    // Update login item settings if runOnStartup changed
    if (settings.runOnStartup !== undefined) {
      const { app } = require('electron')
      app.setLoginItemSettings({
        openAtLogin: settings.runOnStartup,
        path: app.getPath('exe'),
      })
    }
    
    return true
  })

  ipcMain.handle('system:info', () => {
    return {
      platform: process.platform,
      arch: process.arch,
      cpus: os.cpus().length,
      memory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      hostname: os.hostname(),
      node: process.version,
    }
  })

  ipcMain.handle('voice:start', async () => {
    return { started: true }
  })

  ipcMain.handle('voice:stop', async () => {
    return { transcript: '' }
  })

  // --- Email OTP ---
  ipcMain.handle('otp:send-email', async (_, email: string) => {
    console.log('📧 OTP request received for:', email)
    return await sendEmailOTP(email)
  })

  ipcMain.handle('otp:verify-email', async (_, { email, code }: { email: string; code: string }) => {
    console.log('🔑 OTP verify request for:', email)
    return verifyEmailOTP(email, code)
  })
}
