import { useDocumentStore } from '../store/useDocumentStore'

export class DocumentManager {
  private saveTimeout: NodeJS.Timeout | null = null
  private pendingSaveDocumentId: string | null = null
  private pendingSaveContent: string | null = null

  public async loadDocuments(initiativeId: string): Promise<void> {
    const store = useDocumentStore.getState()
    store.setLoading(true)

    const result = await window.forge.documents.list(initiativeId)
    if (result.success) {
      store.setDocuments(result.data)

      // Auto-open last active or first available if none active
      if (!store.activeDocumentId && result.data.length > 0) {
        // Here we could read from a local storage preference for "last active document per initiative"
        // For now, we open the first one available.
        store.setActiveDocument(result.data[0].id)
      }
    } else {
      store.setError(result.error.message)
    }

    store.setLoading(false)
  }

  public openDocument(id: string): void {
    this.flushPendingSave()
    useDocumentStore.getState().setActiveDocument(id)
  }

  public closeDocument(): void {
    this.flushPendingSave()
    useDocumentStore.getState().setActiveDocument(null)
  }

  public updateContent(id: string, content: string): void {
    useDocumentStore.getState().updateDocumentContentLocally(id, content)

    // Debounce save to database
    this.pendingSaveDocumentId = id
    this.pendingSaveContent = content

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(() => {
      this.flushPendingSave()
    }, 500)
  }

  public flushPendingSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
      this.saveTimeout = null
    }

    if (this.pendingSaveDocumentId && this.pendingSaveContent !== null) {
      const id = this.pendingSaveDocumentId
      const content = this.pendingSaveContent

      // Clear pending state immediately to prevent double flush
      this.pendingSaveDocumentId = null
      this.pendingSaveContent = null

      window.forge.documents.update(id, content).catch((err) => {
        console.error(`Failed to flush save for document ${id}:`, err)
      })
    }
  }

  public async deleteDocument(id: string): Promise<void> {
    const store = useDocumentStore.getState()

    if (this.pendingSaveDocumentId === id) {
      if (this.saveTimeout) clearTimeout(this.saveTimeout)
      this.pendingSaveDocumentId = null
      this.pendingSaveContent = null
    }

    const result = await window.forge.documents.delete(id)
    if (result.success) {
      const remaining = store.documents.filter((d) => d.id !== id)
      store.setDocuments(remaining)

      if (store.activeDocumentId === id) {
        store.setActiveDocument(remaining.length > 0 ? remaining[0].id : null)
      }
    } else {
      store.setError(result.error.message)
    }
  }
}

export const documentManager = new DocumentManager()
