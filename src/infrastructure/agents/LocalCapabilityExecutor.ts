import { ICapabilityExecutor } from '../../application/services/agents/ICapabilityExecutor'
import { ExecutionResult } from '../../domain/ai/ExecutionResult'
import { ExecutionContext } from '../../domain/ai/ExecutionContext'
import { CapabilityRegistry } from '../../application/services/CapabilityRegistry'

export class LocalCapabilityExecutor implements ICapabilityExecutor {
  constructor(private readonly registry: CapabilityRegistry) {}

  async execute(
    capabilityName: string,
    args: Record<string, unknown>,
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const capability = this.registry.get(capabilityName)
    if (!capability) {
      return {
        success: false,
        summary: `Capability not found: ${capabilityName}`,
        error: `Capability not found: ${capabilityName}`
      }
    }

    try {
      const initiativeId = context.get<string>('initiativeId') || ''
      const result = await capability.execute(args, { initiativeId })

      return {
        success: result.success,
        summary: result.summary,
        data: {
          artifacts: result.createdArtifacts,
          metadata: result.executionMetadata
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        success: false,
        summary: `Error executing ${capabilityName}: ${msg}`,
        error: msg
      }
    }
  }
}
