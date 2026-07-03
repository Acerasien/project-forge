import { ExecutionPlan } from '../../../domain/ai/ExecutionPlan'
import { EngineeringContext } from './ContextBuilder'

export interface IPlanningStrategy {
  createPlan(workflowId: string, goal: string, context: EngineeringContext): Promise<ExecutionPlan>
}
