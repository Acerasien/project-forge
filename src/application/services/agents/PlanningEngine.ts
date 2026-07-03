import { IPlanningStrategy } from './IPlanningStrategy'
import { EngineeringContext } from './ContextBuilder'
import { ExecutionPlan } from '../../../domain/ai/ExecutionPlan'

export class PlanningEngine {
  constructor(private readonly strategy: IPlanningStrategy) {}

  async createPlan(
    workflowId: string,
    goal: string,
    context: EngineeringContext
  ): Promise<ExecutionPlan> {
    return this.strategy.createPlan(workflowId, goal, context)
  }
}
