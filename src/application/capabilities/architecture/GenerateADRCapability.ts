import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { BuildArchitectureContext } from './BuildArchitectureContext'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { randomUUID } from 'crypto'

export class GenerateADRCapability implements ICapability {
  name = 'GenerateADR'
  description = 'Generates an Architecture Decision Record (ADR).'
  parameters = {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Title of the ADR' },
      decisionContext: {
        type: 'string',
        description: 'Context and constraints around the decision'
      }
    },
    required: ['title', 'decisionContext']
  }

  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly graphService: GraphService,
    private readonly aiProvider: IAIProvider,
    private readonly contextBuilder: BuildArchitectureContext
  ) {}

  async execute(
    args: { title: string; decisionContext: string },
    context: { initiativeId: string }
  ): Promise<CapabilityResult> {
    const archContext = await this.contextBuilder.build(context.initiativeId)
    const architecturePackage = archContext.existingArchitecture

    if (!architecturePackage) {
      return { success: false, summary: 'Architecture package must exist before creating ADRs.' }
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        'You are a principal software architect. Produce an Architecture Decision Record (ADR) using the standard MADR format (Context, Decision, Consequences).',
        new Date()
      ),
      new Message(
        randomUUID(),
        '',
        'user',
        `${this.contextBuilder.formatForPrompt(archContext)}\n\nADR Request:\nTitle: ${args.title}\nContext: ${args.decisionContext}`,
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

    const adr = await this.artifactEngine.createArtifact(context.initiativeId, 'ADR', args.title, {
      generatedByCapabilityId: this.name,
      generatedByCapabilityVersion: capabilityVersion,
      generationSessionId
    })

    await this.artifactEngine.updateContent(adr.id, generatedContent)
    const edge = await this.graphService.createRelationship(
      architecturePackage.id,
      adr.id,
      'DerivedFrom'
    )

    return {
      success: true,
      summary: `Successfully generated ADR (ID: ${adr.id}): ${args.title}`,
      createdArtifacts: [adr],
      graphEdgesCreated: [edge],
      executionMetadata: { generationSessionId }
    }
  }
}
