import { IAgent, AgentEvent } from '../../../domain/ai/IAgent'
import { ContextBuilder } from './ContextBuilder'
import { PlanningEngine } from './PlanningEngine'
import { WorkflowExecutor } from './WorkflowExecutor'
import { ExecutionSession } from '../../../domain/ai/ExecutionSession'
import { ExecutionContext } from '../../../domain/ai/ExecutionContext'
import { DomainEventBus } from '../../../domain/events/DomainEventBus'
import {
  AgentStartedEvent,
  AgentPlanCreatedEvent,
  AgentCompletedEvent,
  AgentFailedEvent
} from '../../../domain/events/DomainEvent'
import { v4 as uuidv4 } from 'uuid'

export class EngineeringAgent implements IAgent {
  constructor(
    private readonly contextBuilder: ContextBuilder,
    private readonly planningEngine: PlanningEngine,
    private readonly workflowExecutor: WorkflowExecutor,
    private readonly eventBus: DomainEventBus
  ) {}

  public async *execute(goal: string, initiativeId: string): AsyncIterable<AgentEvent> {
    const workflowId = uuidv4()
    this.eventBus.publish(new AgentStartedEvent(workflowId, goal, initiativeId))

    try {
      // 1. Build Context
      const context = await this.contextBuilder.build(initiativeId)

      // 2. Plan
      const plan = await this.planningEngine.createPlan(workflowId, goal, context)
      this.eventBus.publish(
        new AgentPlanCreatedEvent(
          workflowId,
          plan.workflowId /* using workflowId as planId here for simplicity */
        )
      )
      yield { workflowId, type: 'plan_created', data: { plan } }

      // 3. Execute
      const session = new ExecutionSession(
        workflowId,
        workflowId,
        plan.steps.map((s) => s.id)
      )
      const executionContext = new ExecutionContext({ initiativeId })

      for await (const event of this.workflowExecutor.execute(plan, session, executionContext)) {
        yield event
      }

      if (session.status === 'completed') {
        this.eventBus.publish(new AgentCompletedEvent(workflowId))
        yield { workflowId, type: 'completed', data: null }
      } else {
        this.eventBus.publish(new AgentFailedEvent(workflowId, 'Workflow execution failed'))
        yield { workflowId, type: 'error', data: { error: 'Workflow execution failed' } }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      this.eventBus.publish(new AgentFailedEvent(workflowId, msg))
      yield { workflowId, type: 'error', data: { error: msg } }
    }
  }
}
