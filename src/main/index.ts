import { app, shell, BrowserWindow, ipcMain } from 'electron'
import * as fs from 'fs'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { registerAIIpcHandlers } from './ipc/AIIpcHandler'
import { InitiativeIpcHandler } from './ipc/InitiativeIpcHandler'
import { DocumentIpcHandler } from './ipc/DocumentIpcHandler'
import { AIGenerationService } from '../application/services/AIGenerationService'
import { InitiativeService } from '../application/services/InitiativeService'
import { DocumentService } from '../application/services/DocumentService'
import { CapabilityRegistry } from '../application/services/CapabilityRegistry'
import {
  ReadDocumentCapability,
  WriteDocumentCapability,
  CreateDocumentCapability,
  ListDocumentsCapability
} from '../application/capabilities/DocumentCapabilities'
import { OpenAIProvider } from '../infrastructure/ai/OpenAIProvider'
import { DatabaseManager } from '../infrastructure/database/DatabaseManager'
import { MigrationEngine } from '../infrastructure/database/MigrationEngine'
import { KyselyAdapter } from '../infrastructure/database/KyselyAdapter'
import { ConversationRepository } from '../infrastructure/database/repositories/ConversationRepository'
import { InitiativeRepository } from '../infrastructure/database/repositories/InitiativeRepository'
import { DocumentRepository } from '../infrastructure/database/repositories/DocumentRepository'
import { ArtifactRepository } from '../infrastructure/database/repositories/ArtifactRepository'
import { GraphRepository } from '../infrastructure/database/repositories/GraphRepository'
import { ArtifactEngine } from '../application/services/ArtifactEngine'
import { WorkflowEngine } from '../application/services/WorkflowEngine'
import { LocalEventBus } from '../infrastructure/events/LocalEventBus'
import { GraphService } from '../application/services/GraphService'
import { ValidationService } from '../application/services/ValidationService'
import { AIValidator } from '../application/services/validators/AIValidator'
import { ArtifactIntelligenceRepository } from '../infrastructure/database/repositories/ArtifactIntelligenceRepository'
import { ArtifactIpcHandler } from './ipc/ArtifactIpcHandler'
import { ValidationIpcHandler } from './ipc/ValidationIpcHandler'
import { migrations } from '../infrastructure/database/migrations'
import { ReviewArtifactCapability } from '../application/capabilities/ReviewArtifactCapability'
import { ContextBuilder } from '../application/services/agents/ContextBuilder'
import { AIPlanningStrategy } from '../application/services/agents/AIPlanningStrategy'
import { PlanningEngine } from '../application/services/agents/PlanningEngine'
import { LocalCapabilityExecutor } from '../infrastructure/agents/LocalCapabilityExecutor'
import { WorkflowExecutor } from '../application/services/agents/WorkflowExecutor'
import { EngineeringAgent } from '../application/services/agents/EngineeringAgent'
import { AgentIpcHandler } from './ipc/AgentIpcHandler'
import { RequirementsCapabilityPack } from '../application/capabilities/requirements/RequirementsCapabilityPack'
import { ArchitectureCapabilityPack } from '../application/capabilities/architecture/ArchitectureCapabilityPack'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
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
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  let initError: Error | null = null

  try {
    // Database Setup
    const dbPath = join(app.getPath('userData'), 'forge.db')
    const dbManager = new DatabaseManager(dbPath)
    dbManager.initialize()

    const migrationEngine = new MigrationEngine(dbManager.getConnection())
    migrationEngine.applyMigrations(migrations, app.getVersion())

    const kyselyAdapter = new KyselyAdapter(dbManager.getConnection())
    const conversationRepo = new ConversationRepository(kyselyAdapter)
    const initiativeRepo = new InitiativeRepository(kyselyAdapter)
    const documentRepo = new DocumentRepository(kyselyAdapter)
    const artifactRepo = new ArtifactRepository(kyselyAdapter)
    const graphRepo = new GraphRepository(kyselyAdapter)
    const intelligenceRepo = new ArtifactIntelligenceRepository(kyselyAdapter)

    // Domain Services
    const documentService = new DocumentService(documentRepo)
    const eventBus = new LocalEventBus()
    new WorkflowEngine(artifactRepo, initiativeRepo, eventBus)
    const artifactEngine = new ArtifactEngine(artifactRepo, eventBus)
    const graphService = new GraphService(graphRepo)
    const initiativeService = new InitiativeService(initiativeRepo, artifactEngine)

    // AI Setup
    const openAIProvider = new OpenAIProvider('sk-mock-key-for-now')
    const aiValidator = new AIValidator(openAIProvider)
    const validationService = new ValidationService(
      artifactRepo,
      intelligenceRepo,
      aiValidator,
      eventBus
    )

    // IPC Handlers
    const initiativeHandler = new InitiativeIpcHandler(initiativeService)
    initiativeHandler.register()

    const documentHandler = new DocumentIpcHandler(documentService)
    documentHandler.register()

    const artifactHandler = new ArtifactIpcHandler(artifactEngine, graphService)
    artifactHandler.register()

    const validationHandler = new ValidationIpcHandler(validationService)
    validationHandler.register()

    // AI Capabilities
    const capabilityRegistry = new CapabilityRegistry()
    capabilityRegistry.register(new ReadDocumentCapability(documentService))
    capabilityRegistry.register(new WriteDocumentCapability(documentService))
    capabilityRegistry.register(new CreateDocumentCapability(documentService))
    capabilityRegistry.register(new ListDocumentsCapability(documentService))
    capabilityRegistry.register(new ReviewArtifactCapability(validationService))

    // Requirements Engineering Capability Pack
    const reqPack = new RequirementsCapabilityPack(
      artifactEngine,
      graphService,
      openAIProvider,
      validationService
    )
    reqPack.register(capabilityRegistry)

    // Architecture Engineering Capability Pack
    const archPack = new ArchitectureCapabilityPack(artifactEngine, graphService, openAIProvider)
    archPack.register(capabilityRegistry)

    // AI Service Setup
    const aiService = new AIGenerationService(openAIProvider, conversationRepo, capabilityRegistry)
    registerAIIpcHandlers(aiService, conversationRepo)

    // Agent Orchestration Setup
    const contextBuilder = new ContextBuilder([]) // No providers yet, will add later
    const aiPlanningStrategy = new AIPlanningStrategy(openAIProvider, capabilityRegistry)
    const planningEngine = new PlanningEngine(aiPlanningStrategy)
    const localCapabilityExecutor = new LocalCapabilityExecutor(capabilityRegistry)
    const workflowExecutor = new WorkflowExecutor(localCapabilityExecutor)
    const engineeringAgent = new EngineeringAgent(
      contextBuilder,
      planningEngine,
      workflowExecutor,
      eventBus
    )

    const agentHandler = new AgentIpcHandler(engineeringAgent)
    agentHandler.register(ipcMain)
  } catch (error) {
    console.error('Failed to initialize Forge backend subsystems:', error)
    initError = error as Error
  }

  ipcMain.handle('system:getStatus', () => {
    if (initError) {
      return {
        success: false,
        error: {
          code: 'INIT_ERROR',
          message: initError.message,
          dbPath: join(app.getPath('userData'), 'forge.db')
        }
      }
    }
    return { success: true, data: undefined }
  })

  ipcMain.handle('system:revealDatabase', () => {
    const dbPath = join(app.getPath('userData'), 'forge.db')
    shell.showItemInFolder(dbPath)
  })

  ipcMain.handle('system:resetDatabase', () => {
    const dbPath = join(app.getPath('userData'), 'forge.db')
    try {
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
      if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal')
      if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm')
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
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
