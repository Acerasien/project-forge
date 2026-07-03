import * as fs from 'fs'
import { join, dirname } from 'path'
import { GenerationPlan } from '../../domain/codegen/GenerationPlan'
import { ArtifactRepository } from '../../infrastructure/database/repositories/ArtifactRepository'
import { GraphService } from './GraphService'
import { Artifact, ArtifactType } from '../../domain/entities/Artifact'
import { randomUUID } from 'crypto'

export class GenerationWorkspace {
  constructor(
    private readonly artifactRepo: ArtifactRepository,
    private readonly graphService: GraphService,
    private readonly workspacePath: string
  ) {}

  async execute(
    plan: GenerationPlan
  ): Promise<{ manifestPath: string; filesGeneratedCount: number }> {
    const outputDir = join(this.workspacePath, 'generated')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const generatedFilesMetadata: Array<{
      path: string
      type: string
      derivedFromArtifactId?: string
      artifactId: string
    }> = []

    for (const file of plan.virtualFiles) {
      const absolutePath = join(outputDir, file.path)
      const parentDir = dirname(absolutePath)

      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true })
      }

      // 1. Materialize file physically to the workspace
      fs.writeFileSync(absolutePath, file.content, 'utf-8')

      // 2. Create standard Artifact entry in the SQLite DB
      const artifactId = randomUUID()
      const artifactType: ArtifactType = file.type === 'schema' ? 'Schema' : 'Codebase'
      const artifact = new Artifact(
        artifactId,
        plan.initiativeId,
        artifactType,
        file.path,
        file.content,
        'Approved',
        1,
        new Date(),
        new Date()
      )

      await this.artifactRepo.create(artifact)

      // 3. Register traceability in the engineering graph
      if (file.derivedFromArtifactId) {
        const relationType = file.type === 'schema' ? 'DefinesSchema' : 'ImplementsComponent'
        try {
          await this.graphService.createRelationship(
            file.derivedFromArtifactId,
            artifactId,
            relationType
          )
        } catch (err) {
          console.error(`Failed to register graph relationship for ${file.path}:`, err)
        }
      }

      generatedFilesMetadata.push({
        path: file.path,
        type: file.type,
        derivedFromArtifactId: file.derivedFromArtifactId,
        artifactId
      })
    }

    // 4. Update the manifest record
    const manifest = {
      initiativeId: plan.initiativeId,
      generatedAt: new Date().toISOString(),
      files: generatedFilesMetadata
    }

    const manifestPath = join(outputDir, '.forge-manifest.json')
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8')

    return {
      manifestPath,
      filesGeneratedCount: plan.virtualFiles.length
    }
  }

  getManifest(): Record<string, unknown> | null {
    const manifestPath = join(this.workspacePath, 'generated', '.forge-manifest.json')
    if (!fs.existsSync(manifestPath)) return null
    try {
      return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>
    } catch {
      return null
    }
  }
}
