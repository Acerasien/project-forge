import { create } from 'zustand'
import { DocumentDTO } from '@shared/types/ipc'

interface DocumentState {
  documents: DocumentDTO[]
  activeDocumentId: string | null
  isLoading: boolean
  error: string | null

  setDocuments: (docs: DocumentDTO[]) => void
  setActiveDocument: (id: string | null) => void
  updateDocumentContentLocally: (id: string, content: string) => void
  setError: (error: string | null) => void
  setLoading: (isLoading: boolean) => void
}

export const useDocumentStore = create<DocumentState>((set) => ({
  documents: [],
  activeDocumentId: null,
  isLoading: false,
  error: null,

  setDocuments: (docs) => set({ documents: docs }),
  setActiveDocument: (id) => set({ activeDocumentId: id }),
  updateDocumentContentLocally: (id, content) =>
    set((state) => ({
      documents: state.documents.map((doc) => (doc.id === id ? { ...doc, content } : doc))
    })),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading })
}))
