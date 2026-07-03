export interface ExecutionResult {
  success: boolean
  summary: string
  data?: Record<string, unknown>
  error?: string
  warnings?: string[]
  artifactsProduced?: string[]
}
