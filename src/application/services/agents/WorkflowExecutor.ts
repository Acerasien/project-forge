import { ExecutionPlan } from '../../../domain/ai/ExecutionPlan'
import { ExecutionSession } from '../../../domain/ai/ExecutionSession'
import { ExecutionContext } from '../../../domain/ai/ExecutionContext'
import { ICapabilityExecutor } from './ICapabilityExecutor'
import { AgentEvent } from '../../../domain/ai/IAgent'

export class WorkflowExecutor {
  constructor(private readonly capabilityExecutor: ICapabilityExecutor) {}

  public async *execute(
    plan: ExecutionPlan,
    session: ExecutionSession,
    context: ExecutionContext
  ): AsyncIterable<AgentEvent> {
    session.status = 'running'

    for (const step of plan.steps) {
      // Check dependencies - in the future this will do graph traversal, for now linear execution
      const stepState = session.stepStates.get(step.id)
      if (!stepState) continue

      stepState.status = 'running'
      stepState.startedAt = new Date()
      yield { workflowId: session.workflowId, type: 'step_started', data: { stepId: step.id } }

      try {
        const result = await this.capabilityExecutor.execute(
          step.capabilityName,
          step.arguments,
          context
        )
        stepState.status = result.success ? 'completed' : 'failed'
        stepState.completedAt = new Date()
        stepState.result = result

        if (result.success) {
          yield {
            workflowId: session.workflowId,
            type: 'step_completed',
            data: { stepId: step.id, result }
          }
        } else {
          yield {
            workflowId: session.workflowId,
            type: 'step_failed',
            data: { stepId: step.id, result }
          }
          session.status = 'failed'
          break // Stop execution on failure for now
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error)
        stepState.status = 'failed'
        stepState.completedAt = new Date()
        stepState.result = { success: false, summary: `Error: ${msg}` }
        yield {
          workflowId: session.workflowId,
          type: 'step_failed',
          data: { stepId: step.id, error: msg }
        }
        session.status = 'failed'
        break
      }
    }

    if (session.status !== 'failed') {
      session.status = 'completed'
    }
  }
}
