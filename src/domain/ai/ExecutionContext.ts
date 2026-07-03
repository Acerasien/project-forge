export class ExecutionContext {
  private readonly data: Map<string, unknown>

  constructor(initialData?: Record<string, unknown>) {
    this.data = new Map(initialData ? Object.entries(initialData) : [])
  }

  public set(key: string, value: unknown): void {
    this.data.set(key, value)
  }

  public get<T>(key: string): T | undefined {
    return this.data.get(key) as T | undefined
  }

  public has(key: string): boolean {
    return this.data.has(key)
  }

  public getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    for (const [k, v] of this.data.entries()) {
      result[k] = v
    }
    return result
  }
}
