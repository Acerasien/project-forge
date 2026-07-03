export interface ExecutionStep {
  id: string
  capabilityName: string
  arguments: Record<string, unknown>
  dependencies?: string[]
  description: string
}

export class ExecutionPlan {
  constructor(
    public readonly workflowId: string,
    public readonly steps: ReadonlyArray<ExecutionStep>,
    public readonly goal: string,
    public readonly createdAt: Date
  ) {}
}
