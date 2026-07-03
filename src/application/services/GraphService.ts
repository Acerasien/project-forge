import { ArtifactRelationship, RelationshipType } from '../../domain/entities/ArtifactRelationship'
import { IGraphRepository } from '../../infrastructure/database/repositories/GraphRepository'
import { randomUUID } from 'crypto'

export class GraphService {
  constructor(private readonly repository: IGraphRepository) {}

  async createRelationship(
    sourceId: string,
    targetId: string,
    type: RelationshipType
  ): Promise<ArtifactRelationship> {
    // Basic cycle detection could be implemented here
    // For now, we assume DAG validation happens here or before calling this.
    await this.ensureNoCycles(sourceId, targetId)

    const relationship = new ArtifactRelationship(
      randomUUID(),
      sourceId,
      targetId,
      type,
      new Date()
    )

    await this.repository.createRelationship(relationship)
    return relationship
  }

  async removeRelationship(id: string): Promise<void> {
    await this.repository.deleteRelationship(id)
  }

  async getRelationshipsBySource(sourceId: string): Promise<ArtifactRelationship[]> {
    return this.repository.getRelationshipsBySource(sourceId)
  }

  async getRelationshipsByTarget(targetId: string): Promise<ArtifactRelationship[]> {
    return this.repository.getRelationshipsByTarget(targetId)
  }

  async getInitiativeGraph(initiativeId: string): Promise<ArtifactRelationship[]> {
    return this.repository.getAllRelationshipsInInitiative(initiativeId)
  }

  private async ensureNoCycles(newSourceId: string, newTargetId: string): Promise<void> {
    // Prevent self-loop
    if (newSourceId === newTargetId) {
      throw new Error('Graph cycle detected: self-loop')
    }

    // A cycle exists if newTargetId can reach newSourceId.
    // Let's do a simple BFS.
    const visited = new Set<string>()
    const queue = [newTargetId]

    while (queue.length > 0) {
      const current = queue.shift()!
      if (current === newSourceId) {
        throw new Error('Graph cycle detected: DAG invariant violation')
      }

      if (!visited.has(current)) {
        visited.add(current)
        const outEdges = await this.repository.getRelationshipsBySource(current)
        for (const edge of outEdges) {
          if (!visited.has(edge.targetId)) {
            queue.push(edge.targetId)
          }
        }
      }
    }
  }
}
