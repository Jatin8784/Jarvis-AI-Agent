import { ipcMain } from 'electron'
import store from '../../agent/store'
import os from 'os'
import { dispatchTool } from '../../agent/tools/dispatcher'

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

  ipcMain.handle('settings:get', () => {
    return {
      provider: store.get('provider', 'groq'),
      geminiKey: store.get('geminiKey', process.env.GEMINI_API_KEY || ''),
      groqKey: store.get('groqKey', process.env.GROQ_API_KEY || ''),
      claudeKey: store.get('claudeKey', process.env.CLAUDE_API_KEY || ''),
      deepseekKey: store.get('deepseekKey', process.env.DEEPSEEK_API_KEY || ''),
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
}
