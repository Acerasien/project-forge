import { ICapability, CapabilityResult } from '../../domain/ai/ICapability'
import { DocumentService } from '../services/DocumentService'

export class ReadDocumentCapability implements ICapability {
  name = 'ReadDocument'
  description = 'Reads the contents of an existing document in the workspace.'
  parameters = {
    type: 'object',
    properties: {
      documentName: {
        type: 'string',
        description: 'The exact name of the document to read (e.g. "main.ts").'
      }
    },
    required: ['documentName']
  }

  constructor(private documentService: DocumentService) {}

  async execute(
    args: { documentName: string },
    context: { initiativeId: string }
  ): Promise<CapabilityResult> {
    const docs = await this.documentService.listDocuments(context.initiativeId)
    const doc = docs.find((d) => d.name === args.documentName)

    if (!doc) {
      return {
        success: false,
        summary: `Document "${args.documentName}" not found in this initiative.`
      }
    }

    return {
      success: true,
      summary: `Successfully read document "${args.documentName}".`,
      data: { content: doc.content },
      executionMetadata: { documentId: doc.id, documentName: doc.name }
    }
  }
}

export class WriteDocumentCapability implements ICapability {
  name = 'WriteDocument'
  description = 'Updates or overwrites the contents of an existing document.'
  parameters = {
    type: 'object',
    properties: {
      documentName: {
        type: 'string',
        description: 'The exact name of the document to update (e.g. "main.ts").'
      },
      content: {
        type: 'string',
        description: 'The full new content to write to the document.'
      }
    },
    required: ['documentName', 'content']
  }

  constructor(private documentService: DocumentService) {}

  async execute(
    args: { documentName: string; content: string },
    context: { initiativeId: string }
  ): Promise<CapabilityResult> {
    const docs = await this.documentService.listDocuments(context.initiativeId)
    const doc = docs.find((d) => d.name === args.documentName)

    if (!doc) {
      return {
        success: false,
        summary: `Document "${args.documentName}" not found. Create it first using CreateDocument.`
      }
    }

    await this.documentService.updateDocumentContent(doc.id, args.content)

    return {
      success: true,
      summary: `Successfully updated document "${args.documentName}".`,
      executionMetadata: { documentId: doc.id, documentName: doc.name }
    }
  }
}

export class CreateDocumentCapability implements ICapability {
  name = 'CreateDocument'
  description = 'Creates a new document in the workspace.'
  parameters = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'The filename of the new document (e.g. "notes.md").'
      },
      extension: {
        type: 'string',
        description: 'The file extension without the dot (e.g. "md", "ts", "flow").'
      },
      content: {
        type: 'string',
        description: 'The initial content of the document.'
      },
      preferredToolId: {
        type: 'string',
        description: 'Optional preferred tool (e.g. "editor" or "flow").'
      }
    },
    required: ['name', 'extension', 'content']
  }

  constructor(private documentService: DocumentService) {}

  async execute(
    args: { name: string; extension: string; content: string; preferredToolId?: string },
    context: { initiativeId: string }
  ): Promise<CapabilityResult> {
    const docs = await this.documentService.listDocuments(context.initiativeId)
    if (docs.some((d) => d.name === args.name)) {
      return {
        success: false,
        summary: `Document "${args.name}" already exists. Use WriteDocument instead.`
      }
    }

    const doc = await this.documentService.createDocument(
      context.initiativeId,
      args.name,
      args.extension,
      args.content,
      args.preferredToolId || null
    )

    return {
      success: true,
      summary: `Successfully created document "${args.name}".`,
      executionMetadata: { documentId: doc.id, documentName: doc.name }
    }
  }
}

export class ListDocumentsCapability implements ICapability {
  name = 'ListDocuments'
  description = 'Lists all documents available in the current workspace.'
  parameters = {
    type: 'object',
    properties: {},
    required: []
  }

  constructor(private documentService: DocumentService) {}

  async execute(_args: unknown, context: { initiativeId: string }): Promise<CapabilityResult> {
    const docs = await this.documentService.listDocuments(context.initiativeId)

    if (docs.length === 0) {
      return {
        success: true,
        summary: 'No documents exist in this initiative.',
        data: { documents: [] }
      }
    }

    const docList = docs.map((d) => ({ name: d.name, extension: d.extension }))
    return {
      success: true,
      summary: `Found ${docs.length} document(s).`,
      data: { documents: docList }
    }
  }
}
