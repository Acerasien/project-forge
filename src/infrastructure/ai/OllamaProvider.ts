import { OpenAIProvider } from './OpenAIProvider'

export class OllamaProvider extends OpenAIProvider {
  readonly name = 'Ollama'
  readonly supportsStreaming = true
  readonly supportsToolCalling = true // Ollama support function calling on newer llama3 models
  readonly supportsVision = true
  readonly supportsReasoning = false

  private rawEndpoint: string

  constructor(endpoint?: string) {
    const rootEndpoint = endpoint || 'http://localhost:11434'
    // Ollama's OpenAI-compatible API resides at /v1
    super('ollama', `${rootEndpoint}/v1`)
    this.rawEndpoint = rootEndpoint
  }

  override async testConnection(): Promise<{
    success: boolean
    latencyMs: number
    error?: string
  }> {
    const start = Date.now()
    try {
      // Direct call to Ollama tags to check if service is running
      const res = await fetch(`${this.rawEndpoint}/api/tags`)
      if (!res.ok) {
        throw new Error(`Ollama returned status ${res.status}`)
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
      const res = await fetch(`${this.rawEndpoint}/api/tags`)
      if (!res.ok) {
        throw new Error(`Ollama tags endpoint error: ${res.statusText}`)
      }
      const data = (await res.json()) as { models: Array<{ name: string }> }
      return data.models.map((m) => m.name).sort()
    } catch (error) {
      console.error('Failed to list local Ollama models:', error)
      return ['llama3', 'mistral', 'codegemma', 'phi3'] // sensible local fallbacks
    }
  }
}
