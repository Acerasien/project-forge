import { ipcMain } from 'electron'
import { DocumentService } from '@application/services/DocumentService'
import { DocumentDTO, Result } from '@shared/types/ipc'

export class DocumentIpcHandler {
  constructor(private readonly documentService: DocumentService) {}

  private handleError(error: unknown): {
    success: false
    error: { code: string; message: string }
  } {
    console.error('[IPC Error]', error)
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
          const doc = await this.documentService.createDocument(
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
        const doc = await this.documentService.getDocument(id)
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
          const docs = await this.documentService.listDocuments(initiativeId)
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
          await this.documentService.updateDocumentContent(id, content)
          return { success: true, data: undefined }
        } catch (error) {
          return this.handleError(error)
        }
      }
    )

    ipcMain.handle('documents:delete', async (_, id: string): Promise<Result<void>> => {
      try {
        await this.documentService.deleteDocument(id)
        return { success: true, data: undefined }
      } catch (error) {
        return this.handleError(error)
      }
    })
  }
}
