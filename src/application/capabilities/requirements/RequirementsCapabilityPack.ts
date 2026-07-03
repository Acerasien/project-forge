import { CapabilityRegistry } from '../../services/CapabilityRegistry'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { ValidationService } from '../../services/ValidationService'

import { GenerateRequirementsCapability } from './GenerateRequirementsCapability'
import { GenerateUserStoriesCapability } from './GenerateUserStoriesCapability'
import { ProduceImplementationPlanCapability } from './ProduceImplementationPlanCapability'
import { ReviewRequirementsCapability } from './ReviewRequirementsCapability'

export class RequirementsCapabilityPack {
  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly graphService: GraphService,
    private readonly aiProvider: IAIProvider,
    private readonly validationService: ValidationService
  ) {}

  register(registry: CapabilityRegistry): void {
    registry.register(
      new GenerateRequirementsCapability(this.artifactEngine, this.graphService, this.aiProvider)
    )
    registry.register(
      new GenerateUserStoriesCapability(this.artifactEngine, this.graphService, this.aiProvider)
    )
    registry.register(
      new ProduceImplementationPlanCapability(
        this.artifactEngine,
        this.graphService,
        this.aiProvider
      )
    )
    registry.register(
      new ReviewRequirementsCapability(this.artifactEngine, this.aiProvider, this.validationService)
    )
  }
}
