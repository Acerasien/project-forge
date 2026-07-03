import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { GraphService } from '../../services/GraphService'
import { BuildArchitectureContext } from './BuildArchitectureContext'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { randomUUID } from 'crypto'

export class GenerateComponentDesignCapability implements ICapability {
  name = 'GenerateComponentDesign'
  description = 'Generates component design from the system architecture.'
  parameters = {
    type: 'object',
    properties: {
      componentName: { type: 'string', description: 'Name of the component to design' }
    },
    required: ['componentName']
  }

  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly graphService: GraphService,
    private readonly aiProvider: IAIProvider,
    private readonly contextBuilder: BuildArchitectureContext
  ) {}

  async execute(
    args: { componentName: string },
    context: { initiativeId: string }
  ): Promise<CapabilityResult> {
    const archContext = await this.contextBuilder.build(context.initiativeId)
    const architecturePackage = archContext.existingArchitecture

    if (!architecturePackage) {
      return {
        success: false,
        summary: 'Architecture package must exist before creating Component Designs.'
      }
    }

    if (architecturePackage.status !== 'Approved') {
      // Following user feedback: "Approval Enforcement: Attempt ComponentDesign generation from an unapproved Architecture Package. The EngineeringAgent should reject the request."
      return {
        success: false,
        summary: 'Architecture package must be Approved before creating Component Designs.'
      }
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        'You are a senior software engineer. Produce a detailed Component Design (responsibilities, interfaces, failure modes) for the specified component, aligned with the system architecture.',
        new Date()
      ),
      new Message(
        randomUUID(),
        '',
        'user',
        `${this.contextBuilder.formatForPrompt(archContext)}\n\nDesign Component: ${args.componentName}`,
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

    const componentDesign = await this.artifactEngine.createArtifact(
      context.initiativeId,
      'ComponentDesign',
      `Component Design: ${args.componentName}`,
      {
        generatedByCapabilityId: this.name,
        generatedByCapabilityVersion: capabilityVersion,
        generationSessionId
      }
    )

    await this.artifactEngine.updateContent(componentDesign.id, generatedContent)
    const edge = await this.graphService.createRelationship(
      architecturePackage.id,
      componentDesign.id,
      'DerivedFrom'
    )

    return {
      success: true,
      summary: `Successfully generated Component Design (ID: ${componentDesign.id}) for ${args.componentName}`,
      createdArtifacts: [componentDesign],
      graphEdgesCreated: [edge],
      executionMetadata: { generationSessionId }
    }
  }
}
