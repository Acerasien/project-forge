import { IpcMain } from 'electron'
import { EngineeringAgent } from '../../application/services/agents/EngineeringAgent'

export class AgentIpcHandler {
  constructor(private agent: EngineeringAgent) {}

  register(ipcMain: IpcMain): void {
    ipcMain.handle(
      'agent:executeGoal',
      async (event, params: { goal: string; initiativeId: string }) => {
        const { goal, initiativeId } = params

        try {
          const stream = this.agent.execute(goal, initiativeId)

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
