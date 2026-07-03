import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { randomUUID } from 'crypto'
import { GenerationWorkspace } from '../../services/GenerationWorkspace'
import { GenerationPlan, VirtualFile } from '../../../domain/codegen/GenerationPlan'

export class GenerateCodebaseCapability implements ICapability {
  name = 'generate_codebase'
  description =
    'Scaffolds physical codebase directory structures and TypeScript boilerplate files from architecture and schemas.'
  parameters = {
    type: 'object',
    properties: {},
    required: []
  }

  constructor(
    private readonly artifactEngine: ArtifactEngine,
    private readonly aiProvider: IAIProvider,
    private readonly generationWorkspace: GenerationWorkspace
  ) {}

  async execute(_args: unknown, context: { initiativeId: string }): Promise<CapabilityResult> {
    const artifacts = await this.artifactEngine.listArtifacts(context.initiativeId)

    // Find Component Design or System Architecture
    const componentDesign = artifacts.find(
      (a) =>
        a.type === 'ComponentDesign' || a.type === 'SystemArchitecture' || a.type === 'Architecture'
    )
    // Find generated Schema
    const schema = artifacts.find((a) => a.type === 'Schema')

    if (!componentDesign || !componentDesign.content) {
      return {
        success: false,
        summary:
          'No approved Architecture or Component Design artifact found. Code generation requires upstream design definitions.'
      }
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        `You are an expert software engineer. Scaffolds clean, layered TypeScript codebase skeleton files based on the component design and relational database schema.
You must output a valid JSON object matching the following structure:
{
  "files": [
    {
      "path": "string (e.g. 'src/domain/User.ts')",
      "content": "string (full TypeScript class, type or interface definition)",
      "description": "string"
    },
    {
      "path": "string (e.g. 'src/infrastructure/UserRepository.ts')",
      "content": "string (repository implementation boilerplate)",
      "description": "string"
    }
  ]
}
Return ONLY the raw JSON object inside JSON markdown blocks. Do not add conversational text.`,
        new Date()
      ),
      new Message(
        randomUUID(),
        '',
        'user',
        `Component Design:\n\n${componentDesign.content}\n\nDatabase Schema:\n\n${schema ? schema.content : 'None configured.'}`,
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

    let parsedJson: { files: Array<{ path: string; content: string; description?: string }> }
    try {
      const cleanJson = generatedContent
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim()
      parsedJson = JSON.parse(cleanJson)
    } catch {
      return {
        success: false,
        summary: 'Failed to generate structured JSON codebase files from AI provider.',
        executionMetadata: { rawResponse: generatedContent }
      }
    }

    const virtualFiles: VirtualFile[] = parsedJson.files.map((f) => ({
      path: f.path,
      content: f.content,
      type: 'code',
      description: f.description || 'Codebase file',
      derivedFromArtifactId: componentDesign.id
    }))

    const plan: GenerationPlan = {
      initiativeId: context.initiativeId,
      virtualFiles
    }

    // Materialize using the GenerationWorkspace service
    const results = await this.generationWorkspace.execute(plan)

    return {
      success: true,
      summary: `Successfully generated physical codebase with ${results.filesGeneratedCount} skeleton files. Manifest saved to ${results.manifestPath}`
    }
  }
}
