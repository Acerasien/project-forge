import { Artifact } from '../../../domain/entities/Artifact'
import { ArtifactIntelligence } from '../../../domain/entities/ArtifactIntelligence'

export interface ArtifactValidator {
  readonly name: string
  validate(artifact: Artifact): Promise<ArtifactIntelligence>
}
