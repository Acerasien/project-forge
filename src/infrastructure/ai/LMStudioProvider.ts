import { OpenAIProvider } from './OpenAIProvider'

export class LMStudioProvider extends OpenAIProvider {
  readonly name = 'LM Studio'
  readonly supportsStreaming = true
  readonly supportsToolCalling = true
  readonly supportsVision = true
  readonly supportsReasoning = false

  private rawEndpoint: string

  constructor(endpoint?: string) {
    const rootEndpoint = endpoint || 'http://localhost:1234'
    super('lm-studio', `${rootEndpoint}/v1`)
    this.rawEndpoint = rootEndpoint
  }

  override async testConnection(): Promise<{
    success: boolean
    latencyMs: number
    error?: string
  }> {
    const start = Date.now()
    try {
      const res = await fetch(`${this.rawEndpoint}/v1/models`)
      if (!res.ok) {
        throw new Error(`LM Studio returned status ${res.status}`)
      }
      return {
        success: true,
        latencyMs: Date.now() - start
      }
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  override async fetchAvailableModels(): Promise<string[]> {
    try {
      const res = await fetch(`${this.rawEndpoint}/v1/models`)
      if (!res.ok) {
        throw new Error(`LM Studio models endpoint error: ${res.statusText}`)
      }
      const data = (await res.json()) as { data: Array<{ id: string }> }
      return data.data.map((m) => m.id).sort()
    } catch (error) {
      console.error('Failed to list local LM Studio models:', error)
      return ['local-model'] // generic fallback
    }
  }
}
