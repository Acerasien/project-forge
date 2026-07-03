import { IAIProvider } from '../../domain/ai/IAIProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { GeminiProvider } from './GeminiProvider'
import { OllamaProvider } from './OllamaProvider'
import { LMStudioProvider } from './LMStudioProvider'
import { AIProfile } from '../../shared/types/settings'

export class AIProviderFactory {
  static create(profile: AIProfile): IAIProvider {
    switch (profile.providerId) {
      case 'openai':
        return new OpenAIProvider(profile.apiKey || '', profile.endpoint)
      case 'gemini':
        return new GeminiProvider(profile.apiKey || '', profile.endpoint)
      case 'ollama':
        return new OllamaProvider(profile.endpoint)
      case 'lm-studio':
        return new LMStudioProvider(profile.endpoint)
      default:
        throw new Error(`Unsupported AI Provider: ${profile.providerId}`)
    }
  }
}
