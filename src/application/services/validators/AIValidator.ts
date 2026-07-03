import { ArtifactValidator } from './ArtifactValidator'
import { Artifact } from '../../../domain/entities/Artifact'
import { ArtifactIntelligence } from '../../../domain/entities/ArtifactIntelligence'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { randomUUID } from 'crypto'

export class AIValidator implements ArtifactValidator {
  readonly name = 'AIValidator'

  constructor(private readonly aiProvider: IAIProvider) {}

  async validate(artifact: Artifact): Promise<ArtifactIntelligence> {
    const prompt = `
      Please review the following software engineering artifact.
      Artifact Type: ${artifact.type}
      Artifact Title: ${artifact.title}
      Content:
      ${artifact.content || ''}
      
      Respond in JSON format with the following keys:
      - completeness_score (integer 0-100)
      - ai_confidence (integer 0-100)
      - critique_summary (string, max 3 sentences)
      - detected_risks (string, list of risks or 'None')
      - assumptions (string, list of assumptions or 'None')
      - suggested_improvements (string, list of improvements or 'None')
    `

    const messages = [
      new Message(
        randomUUID(),
        'sys',
        'system',
        'You are an expert software architect and engineering reviewer. Respond only with valid JSON.',
        new Date()
      ),
      new Message(randomUUID(), 'sys', 'user', prompt, new Date())
    ]

    const stream = this.aiProvider.generateStream(messages, { temperature: 0.2 })
    let responseText = ''

    for await (const event of stream) {
      if (event.type === 'text') {
        responseText += event.content
      }
    }

    let result: any = {}
    try {
      const jsonStr = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
      result = JSON.parse(jsonStr)
    } catch (e) {
      console.error('Failed to parse AI review JSON', e)
      result = {
        critique_summary: 'Failed to generate review.'
      }
    }

    const now = new Date()
    return new ArtifactIntelligence(
      randomUUID(),
      artifact.id,
      result.completeness_score ?? null,
      result.ai_confidence ?? null,
      result.critique_summary ?? null,
      result.detected_risks ?? null,
      result.assumptions ?? null,
      result.suggested_improvements ?? null,
      'AI', // Default validation model string
      false, // isStale
      now,
      now,
      now
    )
  }
}
