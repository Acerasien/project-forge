import { IPlanningStrategy } from './IPlanningStrategy'
import { EngineeringContext } from './ContextBuilder'
import { ExecutionPlan, ExecutionStep } from '../../../domain/ai/ExecutionPlan'
import { IAIProvider } from '../../../domain/ai/IAIProvider'
import { Message } from '../../../domain/ai/Message'
import { CapabilityRegistry } from '../CapabilityRegistry'
import { v4 as uuidv4 } from 'uuid'

export class AIPlanningStrategy implements IPlanningStrategy {
  constructor(
    private readonly aiProvider: IAIProvider,
    private readonly capabilityRegistry: CapabilityRegistry
  ) {}

  async createPlan(
    workflowId: string,
    goal: string,
    context: EngineeringContext
  ): Promise<ExecutionPlan> {
    const tools = this.capabilityRegistry.getAll()
    const systemPrompt = `You are a Planning Engine. Create a discrete execution plan to achieve the user's goal.
You have the following tools available: ${tools.map((t) => t.name).join(', ')}.
Context: ${JSON.stringify(context.data, null, 2)}

Output ONLY a JSON object representing the plan. The format must be:
{
  "steps": [
    {
      "id": "step-1",
      "capabilityName": "name_of_tool",
      "arguments": { "arg": "value" },
      "dependencies": [],
      "description": "Why we are doing this step"
    }
  ]
}`

    const messages = [
      new Message(uuidv4(), workflowId, 'system', systemPrompt, new Date()),
      new Message(uuidv4(), workflowId, 'user', goal, new Date())
    ]

    const abortController = new AbortController()
    const stream = this.aiProvider.generateStream(
      messages,
      { model: 'claude-3-5-sonnet-20240620' },
      abortController.signal
    )

    let jsonResponse = ''
    for await (const chunk of stream) {
      if (chunk.type === 'text') {
        jsonResponse += chunk.content
      }
    }

    try {
      const parsed = JSON.parse(jsonResponse.replace(/```json/g, '').replace(/```/g, ''))
      const steps: ExecutionStep[] = (parsed.steps || []).map(
        (s: {
          id: string
          capabilityName: string
          arguments?: Record<string, unknown>
          dependencies?: string[]
          description?: string
        }) => ({
          id: s.id,
          capabilityName: s.capabilityName,
          arguments: s.arguments || {},
          dependencies: s.dependencies || [],
          description: s.description || ''
        })
      )
      return new ExecutionPlan(workflowId, steps, goal, new Date())
    } catch (e: unknown) {
      throw new Error(
        `Failed to parse AI plan output: ${e instanceof Error ? e.message : String(e)}`
      )
    }
  }
}
