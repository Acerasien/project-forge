import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { Finding } from '../../../domain/entities/Finding'
import { GenerationWorkspace } from '../../services/GenerationWorkspace'
import { join } from 'path'
import * as fs from 'fs'

export class ValidateAlignmentCapability implements ICapability {
  name = 'validate_alignment'
  description = 'Audits the physical workspace directory and engineering graph for structural alignment between design and code.'
  parameters = {
    type: 'object',
    properties: {},
    required: []
  }

  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly graphService: GraphService,
    private readonly generationWorkspace: GenerationWorkspace,
    private readonly workspacePath: string
  ) {}

  async execute(_args: unknown, context: { initiativeId: string }): Promise<CapabilityResult> {
    const findings: Finding[] = []

    // 1. Load manifest
    const manifest = this.generationWorkspace.getManifest()
    
    // 2. Load all artifacts in initiative
    const artifacts = await this.artifactEngine.listArtifacts(context.initiativeId)
    
    // 3. Load entire initiative graph
    const relationships = await this.graphService.getInitiativeGraph(context.initiativeId)

    // Find all structural design components
    const componentDesigns = artifacts.filter(
      (a) => a.type === 'ComponentDesign' || a.type === 'SystemArchitecture' || a.type === 'Architecture'
    )

    // Check 1: Audit if any approved design component is NOT traced to any code or schema
    for (const comp of componentDesigns) {
      const hasImplementation = relationships.some(
        (r) => r.sourceId === comp.id && (r.type === 'DefinesSchema' || r.type === 'ImplementsComponent')
      )

      if (!hasImplementation) {
        findings.push(
          new Finding(
            'Medium',
            'Completeness',
            comp.id,
            `No generated database schema or code implementations trace back to architectural component: "${comp.title}".`,
            'Run the Database Schema Designer or Code Boilerplate Generator capability to scaffold implementation assets.',
            this.name
          )
        )
      }
    }

    // Check 2: Audit manifest file path integrity (if manifest exists)
    if (manifest && Array.isArray(manifest.files)) {
      const outputDir = join(this.workspacePath, 'generated')
      for (const file of manifest.files) {
        const physicalPath = join(outputDir, file.path)
        if (!fs.existsSync(physicalPath)) {
          findings.push(
            new Finding(
              'High',
              'Consistency',
              file.artifactId,
              `Materialized file "${file.path}" is registered in the manifest and database but is missing physically from the workspace directory.`,
              'Re-run code generation to materialize missing physical files.',
              this.name
            )
          )
        }
      }
    } else if (componentDesigns.length > 0 && !manifest) {
      // If we have architectural components but no manifest at all, report a general warning
      const targetId = componentDesigns[0].id
      findings.push(
        new Finding(
          'Low',
          'Traceability',
          targetId,
          'No code generation manifest found in this workspace.',
          'Execute code or schema generation to create a manifest tracker.',
          this.name
        )
      )
    }

    return {
      success: true,
      summary: `Alignment audit complete. Found ${findings.length} findings.`,
      findings
    }
  }
}
