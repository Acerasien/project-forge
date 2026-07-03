export interface AgentEvent {
  workflowId: string
  type:
    | 'plan_created'
    | 'step_started'
    | 'step_completed'
    | 'step_skipped'
    | 'step_failed'
    | 'paused'
    | 'resumed'
    | 'completed'
    | 'cancelled'
    | 'error'
  data: unknown
}

export interface IAgent {
  execute(goal: string, initiativeId: string): AsyncIterable<AgentEvent>
}
