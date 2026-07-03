import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { BuildArchitectureContext } from './BuildArchitectureContext'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { Artifact } from '../../../domain/entities/Artifact'
import { ArtifactRelationship } from '../../../domain/entities/ArtifactRelationship'
import { randomUUID } from 'crypto'

export class GenerateArchitectureCapability implements ICapability {
  name = 'GenerateArchitecture'
  description = 'Generates or updates the System Architecture based on requirements and plans.'
  parameters = {
    type: 'object',
    properties: {
      instructions: { type: 'string', description: 'Optional specific architectural instructions.' }
    }
  }

  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly graphService: GraphService,
    private readonly aiProvider: IAIProvider,
    private readonly contextBuilder: BuildArchitectureContext
  ) {}

  async execute(
    args: { instructions?: string },
    context: { initiativeId: string }
  ): Promise<CapabilityResult> {
    const archContext = await this.contextBuilder.build(context.initiativeId)

    if (!archContext.requirements && !archContext.implementationPlan) {
      return {
        success: false,
        summary: 'No upstream requirements or plans available to generate architecture.'
      }
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        'You are an expert software architect. Given the context, produce a comprehensive System Architecture document (markdown). Focus on bounded contexts, component interaction, and high-level structure.',
        new Date()
      ),
      new Message(
        randomUUID(),
        '',
        'user',
        `${this.contextBuilder.formatForPrompt(archContext)}\n\nInstructions: ${args.instructions || 'Generate the initial system architecture.'}`,
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

    let architecturePackage = archContext.existingArchitecture
    if (!architecturePackage) {
      architecturePackage = await this.artifactEngine.createArtifact(
        context.initiativeId,
        'Architecture',
        'Architecture Package',
        {
          generatedByCapabilityId: this.name,
          generatedByCapabilityVersion: capabilityVersion,
          generationSessionId
        }
      )
      createdArtifacts.push(architecturePackage)

      if (archContext.requirements) {
        const edge = await this.graphService.createRelationship(
          archContext.requirements.id,
          architecturePackage.id,
          'DerivedFrom'
        )
        graphEdgesCreated.push(edge)
      }
    } else {
      updatedArtifacts.push(architecturePackage)
    }

    let sysArch = (await this.artifactEngine.listArtifacts(context.initiativeId)).find(
      (a) => a.type === 'SystemArchitecture'
    )
    if (!sysArch) {
      sysArch = await this.artifactEngine.createArtifact(
        context.initiativeId,
        'SystemArchitecture',
        'System Architecture',
        {
          generatedByCapabilityId: this.name,
          generatedByCapabilityVersion: capabilityVersion,
          generationSessionId
        }
      )
      createdArtifacts.push(sysArch)
      const edge = await this.graphService.createRelationship(
        architecturePackage.id,
        sysArch.id,
        'DerivedFrom'
      )
      graphEdgesCreated.push(edge)
    } else {
      updatedArtifacts.push(sysArch)
    }

    await this.artifactEngine.updateContent(sysArch.id, generatedContent)

    return {
      success: true,
      summary: `Successfully generated System Architecture (ID: ${sysArch.id}).`,
      createdArtifacts,
      updatedArtifacts,
      graphEdgesCreated,
      executionMetadata: { generationSessionId }
    }
  }
}
