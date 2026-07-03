import { OpenAIProvider } from './OpenAIProvider'

export class GeminiProvider extends OpenAIProvider {
  readonly name = 'Google Gemini'
  readonly supportsStreaming = true
  readonly supportsToolCalling = true
  readonly supportsVision = true
  readonly supportsReasoning = false

  constructor(apiKey: string, endpoint?: string) {
    // Google Gemini provides OpenAI compatibility at this baseURL
    const baseURL = endpoint || 'https://generativelanguage.googleapis.com/v1beta/openai/'
    super(apiKey, baseURL)
  }

  override async fetchAvailableModels(): Promise<string[]> {
    // Default Gemini models
    return [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash',
      'gemini-2.0-flash-thinking-exp',
      'gemini-2.5-flash',
      'gemini-2.5-pro'
    ]
  }
}
