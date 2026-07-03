import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { Artifact } from '../../../domain/entities/Artifact'
import { ArtifactRelationship } from '../../../domain/entities/ArtifactRelationship'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { randomUUID } from 'crypto'

export class GenerateUserStoriesCapability implements ICapability {
  name = 'generate_user_stories'
  description =
    'Reads the Requirements artifact and generates a structured list of User Stories and Acceptance Criteria.'
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

    if (!requirements) {
      return {
        success: false,
        summary:
          'No Requirements artifact found. Generating user stories requires approved Requirements.'
      }
    }

    if (!requirements.content) {
      return { success: false, summary: 'Requirements artifact is empty.' }
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        'You are an agile Product Owner. Translate the provided Requirements into a structured Markdown document containing User Stories and precise Acceptance Criteria.',
        new Date()
      ),
      new Message(
        randomUUID(),
        '',
        'user',
        `Requirements Content:\n\n${requirements.content}`,
        new Date()
      )
    ]

    const stream = this.aiProvider.generateStream(messages)
    let generatedContent = ''

    for await (const event of stream) {
      if (event.type === 'text') {
        generatedContent += event.content
      }
    }

    let usArtifact = artifacts.find((a) => a.type === 'UserStories')
    const createdArtifacts: Artifact[] = []
    const updatedArtifacts: Artifact[] = []
    const graphEdgesCreated: ArtifactRelationship[] = []

    if (!usArtifact) {
      usArtifact = await this.artifactEngine.createArtifact(
        context.initiativeId,
        'UserStories',
        'User Stories'
      )
      createdArtifacts.push(usArtifact)
      const edge = await this.graphService.createRelationship(
        requirements.id,
        usArtifact.id,
        'DerivedFrom'
      )
      graphEdgesCreated.push(edge)
    } else if (usArtifact) {
      updatedArtifacts.push(usArtifact)
    }

    if (usArtifact) {
      await this.artifactEngine.updateContent(usArtifact.id, generatedContent)
    }

    return {
      success: true,
      summary: `Successfully generated User Stories artifact (ID: ${usArtifact?.id}) from Requirements.`,
      createdArtifacts,
      updatedArtifacts,
      graphEdgesCreated
    }
  }
}
