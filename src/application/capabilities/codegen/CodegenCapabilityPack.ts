import { CapabilityRegistry } from '../../services/CapabilityRegistry'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { GenerationWorkspace } from '../../services/GenerationWorkspace'

import { GenerateSchemaCapability } from './GenerateSchemaCapability'
import { GenerateCodebaseCapability } from './GenerateCodebaseCapability'
import { ValidateAlignmentCapability } from './ValidateAlignmentCapability'

export class CodegenCapabilityPack {
  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly graphService: GraphService,
    private readonly aiProvider: IAIProvider,
    private readonly generationWorkspace: GenerationWorkspace,
    private readonly workspacePath: string
  ) {}

  register(registry: CapabilityRegistry): void {
    registry.register(
      new GenerateSchemaCapability(this.artifactEngine, this.aiProvider, this.generationWorkspace)
    )
    registry.register(
      new GenerateCodebaseCapability(this.artifactEngine, this.aiProvider, this.generationWorkspace)
    )
    registry.register(
      new ValidateAlignmentCapability(
        this.artifactEngine,
        this.graphService,
        this.generationWorkspace,
        this.workspacePath
      )
    )
  }
}
