import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { BuildArchitectureContext } from './BuildArchitectureContext'
import { randomUUID } from 'crypto'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { Finding, FindingSeverity, FindingCategory } from '../../../domain/entities/Finding'

export class ValidateArchitectureCapability implements ICapability {
  name = 'ValidateArchitecture'
  description =
    'Validates the architecture package for consistency, completeness, and circular dependencies.'
  parameters = {
    type: 'object',
    properties: {}
  }

  constructor(
    private readonly aiProvider: IAIProvider,
    private readonly contextBuilder: BuildArchitectureContext
  ) {}

  async execute(_args: unknown, context: { initiativeId: string }): Promise<CapabilityResult> {
    const archContext = await this.contextBuilder.build(context.initiativeId)

    if (!archContext.existingArchitecture) {
      return { success: false, summary: 'No architecture package exists to validate.' }
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        `You are an expert architecture reviewer.
Review the provided context for:
1. Missing traceability (e.g. components that don't satisfy any requirement)
2. Circular dependencies
3. Inconsistent architectural layers
Output a JSON array of findings. Each finding must match:
{ "severity": "Critical"|"High"|"Medium"|"Low"|"Info", "category": "Traceability"|"Dependency"|"Completeness"|"Consistency", "artifactId": string, "message": string, "recommendation": string }`,
        new Date()
      ),
      new Message(
        randomUUID(),
        '',
        'user',
        `${this.contextBuilder.formatForPrompt(archContext)}\n\nProvide findings in valid JSON array.`,
        new Date()
      )
    ]

    const stream = this.aiProvider.generateStream(messages)
    let generatedContent = ''
    for await (const chunk of stream) {
      if (chunk.type === 'text') generatedContent += chunk.content
    }

    let findings: Finding[] = []
    try {
      // Find json block
      const match = generatedContent.match(/\[.*\]/s)
      if (match) {
        const rawFindings = JSON.parse(match[0])
        findings = rawFindings.map((f: Record<string, unknown>) => new Finding(
          f.severity as FindingSeverity,
          f.category as FindingCategory,
          f.artifactId as string,
          f.message as string,
          f.recommendation as string,
          this.name
        ))
      }
    } catch {
      // If parsing fails, create a generic finding
      findings = [
        new Finding(
          'Medium',
          'Consistency',
          archContext.existingArchitecture.id,
          'Failed to parse structured validation results.',
          'Review the raw validation output manually.',
          this.name
        )
      ]
    }

    return {
      success: true,
      summary: `Architecture validation complete. Found ${findings.length} issues.`,
      findings,
      data: { rawReport: generatedContent }
    }
  }
}
