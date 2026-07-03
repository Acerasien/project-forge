import { ICapability, CapabilityResult } from '../../../domain/ai/ICapability'
import { ArtifactEngine } from '../../services/ArtifactEngine'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { randomUUID } from 'crypto'
import { GenerationWorkspace } from '../../services/GenerationWorkspace'
import { GenerationPlan, VirtualFile } from '../../../domain/codegen/GenerationPlan'

export class GenerateSchemaCapability implements ICapability {
  name = 'generate_schema'
  description = 'Reads the Component Design or Architecture and generates the database schema (SQL + Kysely).'
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
    
    // Find Component Design or System Architecture or general Architecture
    const componentDesign = artifacts.find(
      (a) => a.type === 'ComponentDesign' || a.type === 'SystemArchitecture' || a.type === 'Architecture'
    )

    if (!componentDesign || !componentDesign.content) {
      return {
        success: false,
        summary: 'No approved Architecture or Component Design artifact found. Schema generation requires upstream design definitions.'
      }
    }

    const messages = [
      new Message(
        randomUUID(),
        '',
        'system',
        `You are an expert database administrator. Translate the provided architectural component design into a relational database schema.
You must output a valid JSON object matching the following structure:
{
  "files": [
    {
      "path": "schema.sql",
      "content": "-- RAW CREATE TABLE queries and SQL definitions"
    },
    {
      "path": "schema.ts",
      "content": "// Kysely TypeScript interfaces representing the schema"
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
        `Architectural Component Design:\n\n${componentDesign.content}`,
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
      // Strip any markdown codeblock backticks if present
      const cleanJson = generatedContent.replace(/```json/g, '').replace(/```/g, '').trim()
      parsedJson = JSON.parse(cleanJson)
    } catch (err) {
      return {
        success: false,
        summary: 'Failed to generate structured JSON schema files from AI provider.',
        executionMetadata: { rawResponse: generatedContent }
      }
    }

    const virtualFiles: VirtualFile[] = parsedJson.files.map((f) => ({
      path: f.path,
      content: f.content,
      type: 'schema',
      description: f.description || 'Database schema definition',
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
      summary: `Successfully generated database schema with ${results.filesGeneratedCount} files. Manifest saved to ${results.manifestPath}`
    }
  }
}
