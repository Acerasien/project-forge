import { ExecutionResult } from '../../../domain/ai/ExecutionResult'
import { ExecutionContext } from '../../../domain/ai/ExecutionContext'

export interface ICapabilityExecutor {
  execute(
    capabilityName: string,
    args: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult>
}
