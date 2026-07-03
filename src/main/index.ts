import { app, shell, BrowserWindow, ipcMain } from 'electron'
import * as fs from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { SettingsManager } from '../application/services/SettingsManager'
import { WorkspaceRuntime } from '../application/services/WorkspaceRuntime'
import { SettingsIpcHandler } from './ipc/SettingsIpcHandler'
import { InitiativeIpcHandler } from './ipc/InitiativeIpcHandler'
import { DocumentIpcHandler } from './ipc/DocumentIpcHandler'
import { ArtifactIpcHandler } from './ipc/ArtifactIpcHandler'
import { ValidationIpcHandler } from './ipc/ValidationIpcHandler'
import { registerAIIpcHandlers } from './ipc/AIIpcHandler'
import { AgentIpcHandler } from './ipc/AgentIpcHandler'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  let initError: Error | null = null

  // Settings & Runtime Setup
  const settingsFilePath = join(app.getPath('userData'), 'settings.json')
  const settingsManager = new SettingsManager(settingsFilePath)
  const workspaceRuntime = new WorkspaceRuntime(app.getVersion())

  // Load and boot initial workspace if configured
  try {
    const settings = settingsManager.getSettings()
    if (settings.workspacePath) {
      const activeProfile = settingsManager.getActiveProfile()
      await workspaceRuntime.initialize(settings.workspacePath, activeProfile)
    }
  } catch (error) {
    console.error('Failed to initialize initial workspace:', error)
    initError = error as Error
  }

  // Register Settings Handlers
  const settingsHandler = new SettingsIpcHandler(settingsManager, workspaceRuntime)
  settingsHandler.register()

  // Register other IPC Handlers using WorkspaceRuntime container
  const initiativeHandler = new InitiativeIpcHandler(workspaceRuntime)
  initiativeHandler.register()

  const documentHandler = new DocumentIpcHandler(workspaceRuntime)
  documentHandler.register()

  const artifactHandler = new ArtifactIpcHandler(workspaceRuntime)
  artifactHandler.register()

  const validationHandler = new ValidationIpcHandler(workspaceRuntime)
  validationHandler.register()

  registerAIIpcHandlers(workspaceRuntime)

  const agentHandler = new AgentIpcHandler(workspaceRuntime)
  agentHandler.register(ipcMain)

  // System general IPC routes
  ipcMain.handle('system:getStatus', () => {
    if (initError) {
      return {
        success: false,
        error: {
          code: 'INIT_ERROR',
          message: initError.message,
          dbPath: workspaceRuntime.getDatabasePath() || undefined
        }
      }
    }
    return {
      success: true,
      data: {
        isSetup: settingsManager.getSettings().workspacePath !== null
      }
    }
  })

  ipcMain.handle('system:revealDatabase', () => {
    const dbPath = workspaceRuntime.getDatabasePath()
    if (dbPath && fs.existsSync(dbPath)) {
      shell.showItemInFolder(dbPath)
    }
  })

  ipcMain.handle('system:resetDatabase', () => {
    const dbPath = workspaceRuntime.getDatabasePath()
    if (!dbPath) {
      return { success: false, error: { code: 'NO_WORKSPACE', message: 'No active workspace.' } }
    }
    try {
      // Close SQLite runtime before deleting files
      const oldWorkspacePath = workspaceRuntime.getWorkspacePath()
      const oldProfile = settingsManager.getActiveProfile()

      workspaceRuntime.dispose()

      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal')
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm')

      // Re-initialize empty workspace
      if (oldWorkspacePath) {
        workspaceRuntime.initialize(oldWorkspacePath, oldProfile)
      }
      return { success: true }
    } catch (err: unknown) {
      return {
        success: false,
        error: { code: 'RESET_FAILED', message: err instanceof Error ? err.message : String(err) }
      }
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
