import { CapabilityRegistry } from '../../services/CapabilityRegistry'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { BuildArchitectureContext } from './BuildArchitectureContext'
import { GenerateArchitectureCapability } from './GenerateArchitectureCapability'
import { GenerateADRCapability } from './GenerateADRCapability'
import { GenerateComponentDesignCapability } from './GenerateComponentDesignCapability'
import { GenerateDeploymentDesignCapability } from './GenerateDeploymentDesignCapability'
import { ValidateArchitectureCapability } from './ValidateArchitectureCapability'

export class ArchitectureCapabilityPack {
  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly graphService: GraphService,
    private readonly aiProvider: IAIProvider
  ) {}

  register(registry: CapabilityRegistry): void {
    const contextBuilder = new BuildArchitectureContext(this.artifactEngine, this.graphService)

    registry.register(
      new GenerateArchitectureCapability(
        this.artifactEngine,
        this.graphService,
        this.aiProvider,
        contextBuilder
      )
    )
    registry.register(
      new GenerateADRCapability(
        this.artifactEngine,
        this.graphService,
        this.aiProvider,
        contextBuilder
      )
    )
    registry.register(
      new GenerateComponentDesignCapability(
        this.artifactEngine,
        this.graphService,
        this.aiProvider,
        contextBuilder
      )
    )
    registry.register(
      new GenerateDeploymentDesignCapability(
        this.artifactEngine,
        this.graphService,
        this.aiProvider,
        contextBuilder
      )
    )
    registry.register(new ValidateArchitectureCapability(this.aiProvider, contextBuilder))
  }
}
