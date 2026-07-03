export interface AIProfile {
  id: string
  name: string
  providerId: string // e.g., 'gemini', 'openai', 'ollama', 'lm-studio'
  apiKey?: string
  endpoint?: string
  model?: string
}

export interface AppSettings {
  version: number
  workspacePath: string | null
  activeProfileId: string | null
  profiles: AIProfile[]
}
