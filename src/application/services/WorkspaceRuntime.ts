import { DatabaseManager } from '../../infrastructure/database/DatabaseManager'
import { MigrationEngine } from '../../infrastructure/database/MigrationEngine'
import { KyselyAdapter } from '../../infrastructure/database/KyselyAdapter'
import { ConversationRepository } from '../../infrastructure/database/repositories/ConversationRepository'
import { InitiativeRepository } from '../../infrastructure/database/repositories/InitiativeRepository'
import { DocumentRepository } from '../../infrastructure/database/repositories/DocumentRepository'
import { ArtifactRepository } from '../../infrastructure/database/repositories/ArtifactRepository'
import { GraphRepository } from '../../infrastructure/database/repositories/GraphRepository'
import { ArtifactIntelligenceRepository } from '../../infrastructure/database/repositories/ArtifactIntelligenceRepository'

import { DocumentService } from './DocumentService'
import { WorkflowEngine } from './WorkflowEngine'
import { ArtifactEngine } from './ArtifactEngine'
import { GraphService } from './GraphService'
import { InitiativeService } from './InitiativeService'
import { ValidationService } from './ValidationService'
import { AIGenerationService } from './AIGenerationService'
import { EngineeringAgent } from './agents/EngineeringAgent'

import { LocalEventBus } from '../../infrastructure/events/LocalEventBus'
import { AIProviderFactory } from '../../infrastructure/ai/AIProviderFactory'
import { IAIProvider } from '../../domain/ai/IAIProvider'
import { OpenAIProvider } from '../../infrastructure/ai/OpenAIProvider'
import { AIValidator } from './validators/AIValidator'
import { ContextBuilder } from './agents/ContextBuilder'
import { AIPlanningStrategy } from './agents/AIPlanningStrategy'
import { PlanningEngine } from './agents/PlanningEngine'
import { LocalCapabilityExecutor } from '../../infrastructure/agents/LocalCapabilityExecutor'
import { WorkflowExecutor } from './agents/WorkflowExecutor'
import { CapabilityRegistry } from './CapabilityRegistry'
import {
  ReadDocumentCapability,
  WriteDocumentCapability,
  CreateDocumentCapability,
  ListDocumentsCapability
} from '../capabilities/DocumentCapabilities'
import { ReviewArtifactCapability } from '../capabilities/ReviewArtifactCapability'
import { RequirementsCapabilityPack } from '../capabilities/requirements/RequirementsCapabilityPack'
import { ArchitectureCapabilityPack } from '../capabilities/architecture/ArchitectureCapabilityPack'

import { AIProfile } from '../../shared/types/settings'
import { migrations } from '../../infrastructure/database/migrations'
import { join } from 'path'
import * as fs from 'fs'

export class WorkspaceRuntime {
  private dbManager: DatabaseManager | null = null
  private aiProvider: IAIProvider | null = null

  // Repository instances
  private conversationRepo: ConversationRepository | null = null
  private initiativeRepo: InitiativeRepository | null = null
  private documentRepo: DocumentRepository | null = null
  private artifactRepo: ArtifactRepository | null = null
  private graphRepo: GraphRepository | null = null
  private intelligenceRepo: ArtifactIntelligenceRepository | null = null

  // Services
  private documentService: DocumentService | null = null
  private artifactEngine: ArtifactEngine | null = null
  private graphService: GraphService | null = null
  private initiativeService: InitiativeService | null = null
  private validationService: ValidationService | null = null
  private aiGenerationService: AIGenerationService | null = null
  private engineeringAgent: EngineeringAgent | null = null

  private activeWorkspacePath: string | null = null

  constructor(private readonly appVersion: string) {}

  isActive(): boolean {
    return this.dbManager !== null
  }

  getWorkspacePath(): string | null {
    return this.activeWorkspacePath
  }

  getDatabasePath(): string | null {
    if (!this.activeWorkspacePath) return null
    return join(this.activeWorkspacePath, '.forge', 'forge.db')
  }

  // Getters for services with setup check
  getInitiativeService(): InitiativeService {
    this.ensureInitialized()
    return this.initiativeService!
  }

  getArtifactEngine(): ArtifactEngine {
    this.ensureInitialized()
    return this.artifactEngine!
  }

  getGraphService(): GraphService {
    this.ensureInitialized()
    return this.graphService!
  }

  getDocumentService(): DocumentService {
    this.ensureInitialized()
    return this.documentService!
  }

  getValidationService(): ValidationService {
    this.ensureInitialized()
    return this.validationService!
  }

  getAIGenerationService(): AIGenerationService {
    this.ensureInitialized()
    return this.aiGenerationService!
  }

  getConversationRepository(): ConversationRepository {
    this.ensureInitialized()
    return this.conversationRepo!
  }

  getEngineeringAgent(): EngineeringAgent {
    this.ensureInitialized()
    return this.engineeringAgent!
  }

  private ensureInitialized(): void {
    if (!this.isActive()) {
      throw new Error('WORKSPACE_NOT_INITIALIZED: Workspace has not been loaded yet.')
    }
  }

  async initialize(workspacePath: string, profile: AIProfile | null): Promise<void> {
    if (this.isActive()) {
      await this.dispose()
    }

    this.activeWorkspacePath = workspacePath

    // Ensure the workspace directory exists
    if (!fs.existsSync(workspacePath)) {
      fs.mkdirSync(workspacePath, { recursive: true })
    }

    // Ensure the internal .forge directory exists
    const forgeDir = join(workspacePath, '.forge')
    if (!fs.existsSync(forgeDir)) {
      fs.mkdirSync(forgeDir, { recursive: true })
    }

    // SQLite setup
    const dbPath = join(forgeDir, 'forge.db')
    this.dbManager = new DatabaseManager(dbPath)
    this.dbManager.initialize()

    // Database migrations
    const migrationEngine = new MigrationEngine(this.dbManager.getConnection())
    migrationEngine.applyMigrations(migrations, this.appVersion)

    // Repositories
    const kyselyAdapter = new KyselyAdapter(this.dbManager.getConnection())
    this.conversationRepo = new ConversationRepository(kyselyAdapter)
    this.initiativeRepo = new InitiativeRepository(kyselyAdapter)
    this.documentRepo = new DocumentRepository(kyselyAdapter)
    this.artifactRepo = new ArtifactRepository(kyselyAdapter)
    this.graphRepo = new GraphRepository(kyselyAdapter)
    this.intelligenceRepo = new ArtifactIntelligenceRepository(kyselyAdapter)

    // AI Provider
    if (profile) {
      this.aiProvider = AIProviderFactory.create(profile)
    } else {
      // Sensible fallback mock provider to prevent boot errors when AI is not configured
      this.aiProvider = new OpenAIProvider('mock-key')
    }

    // Domain Services & Bus
    const eventBus = new LocalEventBus()
    this.documentService = new DocumentService(this.documentRepo)
    new WorkflowEngine(this.artifactRepo!, this.initiativeRepo!, eventBus)
    this.artifactEngine = new ArtifactEngine(this.artifactRepo!, eventBus)
    this.graphService = new GraphService(this.graphRepo)
    this.initiativeService = new InitiativeService(this.initiativeRepo, this.artifactEngine)

    const aiValidator = new AIValidator(this.aiProvider)
    this.validationService = new ValidationService(
      this.artifactRepo,
      this.intelligenceRepo,
      aiValidator,
      eventBus
    )

    // Capability Pack registrations
    const capabilityRegistry = new CapabilityRegistry()
    capabilityRegistry.register(new ReadDocumentCapability(this.documentService))
    capabilityRegistry.register(new WriteDocumentCapability(this.documentService))
    capabilityRegistry.register(new CreateDocumentCapability(this.documentService))
    capabilityRegistry.register(new ListDocumentsCapability(this.documentService))
    capabilityRegistry.register(new ReviewArtifactCapability(this.validationService))

    const reqPack = new RequirementsCapabilityPack(
      this.artifactEngine,
      this.graphService,
      this.aiProvider,
      this.validationService
    )
    reqPack.register(capabilityRegistry)

    const archPack = new ArchitectureCapabilityPack(
      this.artifactEngine,
      this.graphService,
      this.aiProvider
    )
    archPack.register(capabilityRegistry)

    // AI Generations
    this.aiGenerationService = new AIGenerationService(
      this.aiProvider,
      this.conversationRepo,
      capabilityRegistry
    )

    // Orchestrator Setup
    const contextBuilder = new ContextBuilder([])
    const aiPlanningStrategy = new AIPlanningStrategy(this.aiProvider, capabilityRegistry)
    const planningEngine = new PlanningEngine(aiPlanningStrategy)
    const localCapabilityExecutor = new LocalCapabilityExecutor(capabilityRegistry)
    const workflowExecutor = new WorkflowExecutor(localCapabilityExecutor)
    this.engineeringAgent = new EngineeringAgent(
      contextBuilder,
      planningEngine,
      workflowExecutor,
      eventBus
    )
  }

  async switchWorkspace(newPath: string, profile: AIProfile | null): Promise<void> {
    await this.initialize(newPath, profile)
  }

  async dispose(): Promise<void> {
    // 1. Cancel active AI generations
    if (this.aiGenerationService) {
      try {
        this.aiGenerationService.cancelAll()
      } catch (err) {
        console.error('Error canceling active AI generations:', err)
      }
    }

    // 2. Clear runtime references
    this.aiProvider = null
    this.conversationRepo = null
    this.initiativeRepo = null
    this.documentRepo = null
    this.artifactRepo = null
    this.graphRepo = null
    this.intelligenceRepo = null

    this.documentService = null
    this.artifactEngine = null
    this.graphService = null
    this.initiativeService = null
    this.validationService = null
    this.aiGenerationService = null
    this.engineeringAgent = null

    this.activeWorkspacePath = null

    // 3. Close database connection
    if (this.dbManager) {
      try {
        this.dbManager.close()
      } catch (err) {
        console.error('Error closing database connection:', err)
      }
      this.dbManager = null
    }
  }
}
