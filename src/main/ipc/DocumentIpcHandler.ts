import { ipcMain } from 'electron'
import { WorkspaceRuntime } from '../../application/services/WorkspaceRuntime'
import { DocumentDTO, Result } from '../../shared/types/ipc'

export class DocumentIpcHandler {
  constructor(private readonly runtime: WorkspaceRuntime) {}

  private handleError(error: unknown): {
    success: false
    error: { code: string; message: string }
  } {
    console.error('[Document IPC Error]', error)
    const message = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: { code: 'DOCUMENT_ERROR', message } }
  }

  public register(): void {
    ipcMain.handle(
      'documents:create',
      async (
        _,
        initiativeId: string,
        name: string,
        extension: string,
        content: string,
        preferredToolId: string | null = null
      ): Promise<Result<DocumentDTO>> => {
        try {
          const service = this.runtime.getDocumentService()
          const doc = await service.createDocument(
            initiativeId,
            name,
            extension,
            content,
            preferredToolId
          )
          return {
            success: true,
            data: {
              id: doc.id,
              initiativeId: doc.initiativeId,
              name: doc.name,
              extension: doc.extension,
              content: doc.content,
              preferredToolId: doc.preferredToolId,
              createdAt: doc.createdAt.toISOString(),
              updatedAt: doc.updatedAt.toISOString()
            }
          }
        } catch (error) {
          return this.handleError(error)
        }
      }
    )

    ipcMain.handle('documents:get', async (_, id: string): Promise<Result<DocumentDTO | null>> => {
      try {
        const service = this.runtime.getDocumentService()
        const doc = await service.getDocument(id)
        if (!doc) return { success: true, data: null }
        return {
          success: true,
          data: {
            id: doc.id,
            initiativeId: doc.initiativeId,
            name: doc.name,
            extension: doc.extension,
            content: doc.content,
            preferredToolId: doc.preferredToolId,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString()
          }
        }
      } catch (error) {
        return this.handleError(error)
      }
    })

    ipcMain.handle(
      'documents:list',
      async (_, initiativeId: string): Promise<Result<DocumentDTO[]>> => {
        try {
          const service = this.runtime.getDocumentService()
          const docs = await service.listDocuments(initiativeId)
          return {
            success: true,
            data: docs.map((doc) => ({
              id: doc.id,
              initiativeId: doc.initiativeId,
              name: doc.name,
              extension: doc.extension,
              content: doc.content,
              preferredToolId: doc.preferredToolId,
              createdAt: doc.createdAt.toISOString(),
              updatedAt: doc.updatedAt.toISOString()
            }))
          }
        } catch (error) {
          return this.handleError(error)
        }
      }
    )

    ipcMain.handle(
      'documents:update',
      async (_, id: string, content: string): Promise<Result<void>> => {
        try {
          const service = this.runtime.getDocumentService()
          await service.updateDocumentContent(id, content)
          return { success: true, data: undefined }
        } catch (error) {
          return this.handleError(error)
        }
      }
    )

    ipcMain.handle('documents:delete', async (_, id: string): Promise<Result<void>> => {
      try {
        const service = this.runtime.getDocumentService()
        await service.deleteDocument(id)
        return { success: true, data: undefined }
      } catch (error) {
        return this.handleError(error)
      }
    })
  }
}
