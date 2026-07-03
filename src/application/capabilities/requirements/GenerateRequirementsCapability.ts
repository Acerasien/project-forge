import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { Artifact } from '../../../domain/entities/Artifact'
import { ArtifactRelationship } from '../../../domain/entities/ArtifactRelationship'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { randomUUID } from 'crypto'

export class GenerateRequirementsCapability implements ICapability {
  name = 'generate_requirements'
  description = 'Reads the Vision artifact and generates comprehensive technical Requirements.'
  parameters = {
    type: 'object',
    properties: {},
    required: []
  }

  constructor(
    private artifactEngine: ArtifactEngine,
    private graphService: GraphService,
    private aiProvider: IAIProvider
  ) {}

  async execute(_args: unknown, context: { initiativeId: string }): Promise<CapabilityResult> {
    const artifacts = await this.artifactEngine.listArtifacts(context.initiativeId)
    const vision = artifacts.find((a) => a.type === 'Vision')

    if (!vision) {
      return {
        success: false,
        summary: 'No Vision artifact found. Requirements generation requires an upstream Vision.'
      }
    }

    if (!vision.content) {
      return { success: false, summary: 'Vision artifact is empty.' }
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        'You are an expert Requirements Engineer. Translate the provided product Vision into a structured Requirements Document (Markdown). Include functional, non-functional requirements, and constraints.',
        new Date()
      ),
      new Message(randomUUID(), '', 'user', `Vision Content:\n\n${vision.content}`, new Date())
    ]

    const stream = this.aiProvider.generateStream(messages)
    let generatedContent = ''

    for await (const event of stream) {
      if (event.type === 'text') {
        generatedContent += event.content
      }
    }

    let reqArtifact = artifacts.find((a) => a.type === 'Requirements')
    const createdArtifacts: Artifact[] = []
    const updatedArtifacts: Artifact[] = []
    const graphEdgesCreated: ArtifactRelationship[] = []

    if (!reqArtifact) {
      reqArtifact = await this.artifactEngine.createArtifact(
        context.initiativeId,
        'Requirements',
        'Requirements Specification'
      )
      createdArtifacts.push(reqArtifact)
      // Create graph relationship
      const edge = await this.graphService.createRelationship(
        vision.id,
        reqArtifact.id,
        'DerivedFrom'
      )
      graphEdgesCreated.push(edge)
    } else if (reqArtifact) {
      updatedArtifacts.push(reqArtifact)
    }

    if (reqArtifact) {
      await this.artifactEngine.updateContent(reqArtifact.id, generatedContent)
    }

    return {
      success: true,
      summary: `Successfully generated Requirements artifact (ID: ${reqArtifact?.id}) from Vision.`,
      createdArtifacts,
      updatedArtifacts,
      graphEdgesCreated
    }
  }
}
