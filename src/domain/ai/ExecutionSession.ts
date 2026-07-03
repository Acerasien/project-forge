import { ExecutionResult } from './ExecutionResult'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface StepExecutionState {
  status: StepStatus
  startedAt?: Date
  completedAt?: Date
  result?: ExecutionResult
  retryCount: number
}

export class ExecutionSession {
  public readonly stepStates: Map<string, StepExecutionState>
  public status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

  constructor(
    public readonly workflowId: string,
    public readonly planId: string,
    stepIds: string[]
  ) {
    this.status = 'pending'
    this.stepStates = new Map()
    for (const id of stepIds) {
      this.stepStates.set(id, { status: 'pending', retryCount: 0 })
    }
  }

  // To support persistence later, we can add serialize() / deserialize() methods here
}
