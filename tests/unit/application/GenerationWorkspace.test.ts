import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GenerationWorkspace } from '@application/services/GenerationWorkspace'
import { ArtifactRepository } from '@infrastructure/database/repositories/ArtifactRepository'
import { GraphService } from '@application/services/GraphService'
import { GenerationPlan } from '@domain/codegen/GenerationPlan'
import { Artifact } from '@domain/entities/Artifact'
import { ValidateAlignmentCapability } from '@application/capabilities/codegen/ValidateAlignmentCapability'
import { ArtifactEngine } from '@application/services/ArtifactEngine'
import * as fs from 'fs'
import * as path from 'path'

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn()
}))

describe('GenerationWorkspace & Codegen Capabilities', () => {
  let mockArtifactRepo: ArtifactRepository
  let mockGraphService: GraphService
  let mockArtifactEngine: ArtifactEngine
  let workspace: GenerationWorkspace

  beforeEach(() => {
    mockArtifactRepo = {
      create: vi.fn(),
      getById: vi.fn(),
      listByInitiative: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn()
    } as unknown as ArtifactRepository

    mockGraphService = {
      createRelationship: vi.fn(),
      getInitiativeGraph: vi.fn()
    } as unknown as GraphService

    mockArtifactEngine = {
      listArtifacts: vi.fn()
    } as unknown as ArtifactEngine

    workspace = new GenerationWorkspace(mockArtifactRepo, mockGraphService, '/mock/workspace')
  })

  it('should materialize virtual files and create artifact/graph entries', async () => {
    const plan: GenerationPlan = {
      initiativeId: 'init_123',
      virtualFiles: [
        {
          path: 'src/index.ts',
          content: 'console.log("hello")',
          type: 'code',
          derivedFromArtifactId: 'arch_component_999'
        }
      ]
    }

    vi.mocked(fs.existsSync).mockReturnValue(false)

    const result = await workspace.execute(plan)

    expect(result.filesGeneratedCount).toBe(1)
    const expectedSubpath = path.join('src', 'index.ts')
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining(expectedSubpath),
      'console.log("hello")',
      'utf-8'
    )
    expect(mockArtifactRepo.create).toHaveBeenCalled()
    expect(mockGraphService.createRelationship).toHaveBeenCalledWith(
      'arch_component_999',
      expect.any(String),
      'ImplementsComponent'
    )
  })

  it('should validate alignment and report missing implementation artifacts', async () => {
    const validator = new ValidateAlignmentCapability(
      mockArtifactEngine,
      mockGraphService,
      workspace,
      '/mock/workspace'
    )

    // Set up mock artifacts in database
    const compArtifact = new Artifact(
      'arch_component_999',
      'init_123',
      'ComponentDesign',
      'User Component',
      'User Component Content',
      'Approved',
      1,
      new Date(),
      new Date()
    )
    vi.mocked(mockArtifactEngine.listArtifacts).mockResolvedValue([compArtifact])
    vi.mocked(mockGraphService.getInitiativeGraph).mockResolvedValue([]) // No relationships = missing implementation
    vi.spyOn(workspace, 'getManifest').mockReturnValue({ files: [] }) // Empty manifest (no missing file warnings)

    const result = await validator.execute({}, { initiativeId: 'init_123' })

    expect(result.success).toBe(true)
    expect(result.findings).toBeDefined()
    expect(result.findings?.length).toBe(1)
    expect(result.findings?.[0].category).toBe('Completeness')
    expect(result.findings?.[0].message).toContain('No generated database schema or code implementations')
  })
})
