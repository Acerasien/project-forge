import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { Artifact } from '../../../domain/entities/Artifact'
import { ArtifactRelationship } from '../../../domain/entities/ArtifactRelationship'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { randomUUID } from 'crypto'

export class ProduceImplementationPlanCapability implements ICapability {
  name = 'produce_implementation_plan'
  description =
    'Reads Requirements (and Architecture if available) to produce a step-by-step Implementation Plan.'
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
    const requirements = artifacts.find((a) => a.type === 'Requirements')
    const architecture = artifacts.find((a) => a.type === 'Architecture')

    if (!requirements || !requirements.content) {
      return { success: false, summary: 'Missing or empty Requirements artifact.' }
    }

    let prompt = `Requirements Content:\n\n${requirements.content}`
    if (architecture && architecture.content) {
      prompt += `\n\nArchitecture Content:\n\n${architecture.content}`
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        'You are a Senior Engineering Manager. Create a detailed, actionable, step-by-step Implementation Plan in Markdown based on the provided inputs.',
        new Date()
      ),
      new Message(randomUUID(), '', 'user', prompt, new Date())
    ]

    const stream = this.aiProvider.generateStream(messages)
    let generatedContent = ''

    for await (const event of stream) {
      if (event.type === 'text') {
        generatedContent += event.content
      }
    }

    let planArtifact = artifacts.find((a) => a.type === 'ImplementationPlan')
    const createdArtifacts: Artifact[] = []
    const updatedArtifacts: Artifact[] = []
    const graphEdgesCreated: ArtifactRelationship[] = []

    if (!planArtifact) {
      planArtifact = await this.artifactEngine.createArtifact(
        context.initiativeId,
        'ImplementationPlan',
        'Implementation Plan'
      )
      createdArtifacts.push(planArtifact)
      const edge1 = await this.graphService.createRelationship(
        requirements.id,
        planArtifact.id,
        'DerivedFrom'
      )
      graphEdgesCreated.push(edge1)
      if (architecture) {
        const edge2 = await this.graphService.createRelationship(
          architecture.id,
          planArtifact.id,
          'InformedBy'
        )
        graphEdgesCreated.push(edge2)
      }
    } else if (planArtifact) {
      updatedArtifacts.push(planArtifact)
    }

    if (planArtifact) {
      await this.artifactEngine.updateContent(planArtifact.id, generatedContent)
    }

    return {
      success: true,
      summary: `Successfully generated Implementation Plan artifact (ID: ${planArtifact?.id}).`,
      createdArtifacts,
      updatedArtifacts,
      graphEdgesCreated
    }
  }
}
