import { app, BrowserWindow, ipcMain, globalShortcut, shell, Tray, Menu, nativeImage } from 'electron'
import { join, resolve } from 'path'
import { existsSync, mkdirSync } from 'fs'
import dotenv from 'dotenv'
import store from '../agent/store'

dotenv.config({ path: resolve(process.cwd(), '.env') })

// Enable speech recognition and other features
app.commandLine.appendSwitch('enable-speech-dispatcher')
app.commandLine.appendSwitch('enable-features', 'SpeechRecognition')

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set — add it to your .env file')
}

import { initDB } from '../db/sqlite'
import { registerAgentIPC } from './ipc/agent.ipc'
import { registerToolsIPC } from './ipc/tools.ipc'

const dataDir = join(app.getPath('userData'), 'jarvis-data')
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

let mainWindow: BrowserWindow | null = null
let isQuitting = false
let tray: Tray | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#050810',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Allow Web Speech API
    },
    icon: join(__dirname, '../../resources/icon.png'),
  })

  // Grant microphone permission
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true) // Allow microphone access
    } else {
      callback(false)
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => { mainWindow = null })
  
  // Prevent window from closing, just hide it instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
      return false
    }
  })
}

app.whenReady().then(async () => {
  await initDB(dataDir)
  registerAgentIPC(mainWindow)
  registerToolsIPC()
  createWindow()

  // Create system tray icon
  createTray()

  // Run on startup configuration
  const runOnStartup = store.get('runOnStartup', true)
  app.setLoginItemSettings({
    openAtLogin: runOnStartup as boolean,
    path: app.getPath('exe'),
  })

  // Global hotkey: Ctrl+Shift+J to toggle JARVIS
  globalShortcut.register('CommandOrControl+Shift+J', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else if (mainWindow) mainWindow.show()
  })
})

function createTray() {
  // Create a simple tray icon (you can replace with a proper icon file)
  const icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAFJSURBVDiNpZK9SgNBFIW/2U02m2yCBEGwsBELwUKwEQsRbHwBX8AXsLKxs7WxEQsLC0EQbPQFfAELCwsLC0Gw0EKwEAQLC0Gw2GQ3OxZZs5vdZBM8cJm5c+/5uXPvwD+jqgRYBhaAGWAcGAFSwBPwANwCN8A1cKWq3l8FVDUBrAJrwCwQ/+FyD7gAzoAzVX3/LqCqCWAdWAcmgRhgAx7QBjzgFbgEzlX1rR+gqgZYAdaBKSAKRIAo0AJc4By4UtVWX4CqJoE1YB2YBiJAGGgCDnABXKpqsx+gD7ACLP8AWMAFcKmqjX6APsAKsAJM9QFagANcqGq9H6APsAwsAZNABAgDTaAOXKtqrR+gD7AELAKTQBgIA02gBlyr6nM/QB9gEVgAJoAQEAIaQA24UdVqP0AfYAGYByJACKgDNeBWVSv9AH2AeWAOiAJ1oArcqWq5H/AJsEbmQy5i5+8AAAAASUVORK5CYII=')
  
  tray = new Tray(icon)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show JARVIS',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: 'Hide JARVIS',
      click: () => {
        mainWindow?.hide()
      }
    },
    { type: 'separator' },
    {
      label: 'Quit JARVIS',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])
  
  tray.setToolTip('JARVIS AI Assistant')
  tray.setContextMenu(contextMenu)
  
  // Click tray icon to show/hide
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

app.on('window-all-closed', () => {
  // Don't quit on window close - keep running in background
  // Only quit on explicit quit (Cmd+Q on Mac, or system tray quit)
  if (process.platform === 'darwin' && !isQuitting) {
    // On Mac, keep app running
    return
  }
  if (!isQuitting) {
    // On Windows/Linux, keep running in background
    return
  }
  app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('before-quit', () => {
  isQuitting = true
})

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize()
})
ipcMain.on('window:close', () => {
  // Hide instead of close to keep running in background
  mainWindow?.hide()
})
ipcMain.on('window:quit', () => {
  // Actually quit the app
  isQuitting = true
  app.quit()
})
ipcMain.on('window:show', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})
