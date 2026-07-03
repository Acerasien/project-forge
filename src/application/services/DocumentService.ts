import { IDocumentRepository } from '../../infrastructure/database/repositories/DocumentRepository'
import { Document } from '../../domain/entities/Document'
import { randomUUID } from 'crypto'

export class DocumentService {
  constructor(private readonly repository: IDocumentRepository) {}

  public async createDocument(
    initiativeId: string,
    name: string,
    extension: string,
    content: string,
    preferredToolId: string | null = null
  ): Promise<Document> {
    const doc = new Document(
      randomUUID(),
      initiativeId,
      name,
      extension,
      content,
      preferredToolId,
      new Date(),
      new Date()
    )
    await this.repository.create(doc)
    return doc
  }

  public async getDocument(id: string): Promise<Document | null> {
    return this.repository.getById(id)
  }

  public async listDocuments(initiativeId: string): Promise<Document[]> {
    return this.repository.listByInitiative(initiativeId)
  }

  public async updateDocumentContent(id: string, content: string): Promise<void> {
    await this.repository.updateContent(id, content)
  }

  public async deleteDocument(id: string): Promise<void> {
    await this.repository.delete(id)
  }
}
