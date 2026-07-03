import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { BuildArchitectureContext } from './BuildArchitectureContext'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { Artifact } from '../../../domain/entities/Artifact'
import { ArtifactRelationship } from '../../../domain/entities/ArtifactRelationship'
import { randomUUID } from 'crypto'

export class GenerateDeploymentDesignCapability implements ICapability {
  name = 'GenerateDeploymentDesign'
  description = 'Generates deployment architecture design.'
  parameters = {
    type: 'object',
    properties: {}
  }

  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly graphService: GraphService,
    private readonly aiProvider: IAIProvider,
    private readonly contextBuilder: BuildArchitectureContext
  ) {}

  async execute(_args: unknown, context: { initiativeId: string }): Promise<CapabilityResult> {
    const archContext = await this.contextBuilder.build(context.initiativeId)
    const architecturePackage = archContext.existingArchitecture

    if (!architecturePackage) {
      return {
        success: false,
        summary: 'Architecture package must exist before creating Deployment Designs.'
      }
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        'You are an infrastructure architect. Produce a Deployment Architecture document (network boundaries, regions, managed services, containers).',
        new Date()
      ),
      new Message(
        randomUUID(),
        '',
        'user',
        `${this.contextBuilder.formatForPrompt(archContext)}\n\nGenerate Deployment Architecture.`,
        new Date()
      )
    ]

    const stream = this.aiProvider.generateStream(messages)
    let generatedContent = ''
    for await (const chunk of stream) {
      if (chunk.type === 'text') generatedContent += chunk.content
    }
    const capabilityVersion = '1.0.0'
    const generationSessionId = randomUUID()

    const createdArtifacts: Artifact[] = []
    const updatedArtifacts: Artifact[] = []
    const graphEdgesCreated: ArtifactRelationship[] = []

    let deploymentDesign = archContext.existingDeploymentArchitecture
    if (!deploymentDesign) {
      deploymentDesign = await this.artifactEngine.createArtifact(
        context.initiativeId,
        'DeploymentArchitecture',
        'Deployment Architecture',
        {
          generatedByCapabilityId: this.name,
          generatedByCapabilityVersion: capabilityVersion,
          generationSessionId
        }
      )
      createdArtifacts.push(deploymentDesign)
      const edge = await this.graphService.createRelationship(
        architecturePackage.id,
        deploymentDesign.id,
        'DerivedFrom'
      )
      graphEdgesCreated.push(edge)
    } else {
      updatedArtifacts.push(deploymentDesign)
    }

    await this.artifactEngine.updateContent(deploymentDesign.id, generatedContent)

    return {
      success: true,
      summary: `Successfully generated Deployment Design (ID: ${deploymentDesign.id})`,
      createdArtifacts,
      updatedArtifacts,
      graphEdgesCreated,
      executionMetadata: { generationSessionId }
    }
  }
}
