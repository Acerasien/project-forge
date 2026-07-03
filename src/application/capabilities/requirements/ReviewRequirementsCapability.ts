import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { ValidationService } from '../../services/ValidationService'
import { ArtifactIntelligence } from '../../../domain/entities/ArtifactIntelligence'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { randomUUID } from 'crypto'

export class ReviewRequirementsCapability implements ICapability {
  name = 'review_requirements'
  description =
    'Performs a comprehensive engineering review on the Requirements artifact (checks ambiguity, conflict, missing criteria, traceability).'
  parameters = {
    type: 'object',
    properties: {},
    required: []
  }

  constructor(
    private artifactEngine: ArtifactEngine,
    private aiProvider: IAIProvider,
    private validationService: ValidationService
  ) {}

  async execute(_args: unknown, context: { initiativeId: string }): Promise<CapabilityResult> {
    const artifacts = await this.artifactEngine.listArtifacts(context.initiativeId)
    const requirements = artifacts.find((a) => a.type === 'Requirements')

    if (!requirements || !requirements.content) {
      return { success: false, summary: 'No Requirements artifact found to review.' }
    }

    // We do a custom deep review using AI directly, and store it via ValidationService
    // or just return the output. The user requested this to evaluate:
    // ambiguity, conflicting requirements, duplicate requirements, missing requirements,
    // inconsistent terminology, missing acceptance criteria, unverifiable requirements, traceability gaps.

    const systemPrompt = `You are a Principal Software Engineer performing a rigorous Requirements Engineering assessment.
Evaluate the provided requirements document for:
- Ambiguity
- Conflicting requirements
- Duplicate requirements
- Missing requirements (edge cases, security, non-functional)
- Inconsistent terminology
- Missing acceptance criteria
- Unverifiable requirements
- Traceability gaps

Provide a structured Markdown report with your findings. Rate the completeness on a scale of 1-100.`

    const messages = [
      new Message(randomUUID(), '', 'system', systemPrompt, new Date()),
      new Message(randomUUID(), '', 'user', `Requirements:\n\n${requirements.content}`, new Date())
    ]

    const stream = this.aiProvider.generateStream(messages)
    let generatedContent = ''

    for await (const event of stream) {
      if (event.type === 'text') {
        generatedContent += event.content
      }
    }

    // Naive extraction of score
    const scoreMatch =
      generatedContent.match(/(\d{1,3})\/100/i) || generatedContent.match(/score:\s*(\d{1,3})/i)
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 50

    const intelligence = new ArtifactIntelligence(
      randomUUID(),
      requirements.id,
      score,
      0.9,
      generatedContent,
      'N/A',
      'N/A',
      'N/A',
      'gpt-4',
      false,
      new Date(),
      new Date(),
      new Date()
    )

    await this.validationService.saveIntelligence(intelligence)

    return {
      success: true,
      summary: `Requirements Review complete. Score: ${score}/100.\n\n${generatedContent}`,
      data: { report: generatedContent }
    }
  }
}
