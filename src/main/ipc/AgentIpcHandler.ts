import { IpcMain } from 'electron'
import { WorkspaceRuntime } from '../../application/services/WorkspaceRuntime'

export class AgentIpcHandler {
  constructor(private readonly runtime: WorkspaceRuntime) {}

  register(ipcMain: IpcMain): void {
    ipcMain.handle(
      'agent:executeGoal',
      async (event, params: { goal: string; initiativeId: string }) => {
        const { goal, initiativeId } = params

        try {
          const agent = this.runtime.getEngineeringAgent()
          const stream = agent.execute(goal, initiativeId)

          for await (const agentEvent of stream) {
            event.sender.send('agent:event', agentEvent)
          }
        } catch (err: unknown) {
          event.sender.send('agent:event', {
            workflowId: 'unknown',
            type: 'error',
            data: { error: err instanceof Error ? err.message : String(err) }
          })
        }
      }
    )
  }
}
