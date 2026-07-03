import { Artifact } from '../entities/Artifact'
import { Finding } from '../entities/Finding'
import { ArtifactRelationship } from '../entities/ArtifactRelationship'

export interface CapabilityResult<T = unknown> {
  success: boolean
  summary: string
  createdArtifacts?: Artifact[]
  updatedArtifacts?: Artifact[]
  deletedArtifacts?: Artifact[]
  graphEdgesCreated?: ArtifactRelationship[]
  graphEdgesRemoved?: ArtifactRelationship[]
  findings?: Finding[]
  warnings?: string[]
  metrics?: Record<string, number>
  executionMetadata?: Record<string, unknown>
  data?: T
}

export interface ICapability {
  name: string
  description: string
  parameters: Record<string, unknown> // JSON Schema representing the arguments
  execute(args: unknown, context: { initiativeId: string }): Promise<CapabilityResult>
}
