import { ipcMain } from 'electron'
import { WorkspaceRuntime } from '../../application/services/WorkspaceRuntime'
import { ArtifactStatus } from '../../domain/entities/Artifact'
import { RelationshipType } from '../../domain/entities/ArtifactRelationship'

export class ArtifactIpcHandler {
  constructor(private readonly runtime: WorkspaceRuntime) {}

  public register(): void {
    ipcMain.handle('artifacts:listByInitiative', async (_, initiativeId: string) => {
      try {
        const engine = this.runtime.getArtifactEngine()
        const artifacts = await engine.listArtifacts(initiativeId)
        return { success: true, data: artifacts }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('artifacts:get', async (_, id: string) => {
      try {
        const engine = this.runtime.getArtifactEngine()
        const artifact = await engine.getArtifact(id)
        return { success: true, data: artifact }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle('artifacts:updateContent', async (_, id: string, content: string) => {
      try {
        const engine = this.runtime.getArtifactEngine()
        await engine.updateContent(id, content)
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle(
      'artifacts:updateStatus',
      async (_, id: string, status: string, bypassGates: boolean = false) => {
        try {
          const engine = this.runtime.getArtifactEngine()
          await engine.updateStatus(id, status as ArtifactStatus, bypassGates)
          return { success: true }
        } catch (error: any) {
          // Handle gate warnings by returning them in a structured way
          if (error.message.startsWith('GateWarning:')) {
            return {
              success: false,
              isGateWarning: true,
              error: error.message.replace('GateWarning: ', '')
            }
          }
          return { success: false, error: error.message }
        }
      }
    )

    ipcMain.handle('graph:getInitiativeGraph', async (_, initiativeId: string) => {
      try {
        const service = this.runtime.getGraphService()
        const relationships = await service.getInitiativeGraph(initiativeId)
        return { success: true, data: relationships }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    })

    ipcMain.handle(
      'graph:createRelationship',
      async (_, sourceId: string, targetId: string, type: string) => {
        try {
          const service = this.runtime.getGraphService()
          const relationship = await service.createRelationship(
            sourceId,
            targetId,
            type as RelationshipType
          )
          return { success: true, data: relationship }
        } catch (error: any) {
          return { success: false, error: error.message }
        }
      }
    )
  }
}
