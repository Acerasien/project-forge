import { ITool } from './ITool'

export class ToolRegistry {
  private static tools = new Map<string, ITool>()

  /**
   * Registers a tool globally.
   * @param tool The tool instance to register.
   */
  static register(tool: ITool): void {
    if (this.tools.has(tool.id)) {
      console.warn(`Tool with id '${tool.id}' is already registered. Overwriting.`)
    }
    this.tools.set(tool.id, tool)
  }

  /**
   * Retrieves a tool by its ID.
   * @param id The tool ID.
   */
  static get(id: string): ITool | undefined {
    return this.tools.get(id)
  }

  /**
   * Returns all registered tools.
   */
  static getAll(): ITool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Finds the first tool capable of opening a given document.
   * Useful for the upcoming Document System (Slice 5.2).
   * @param document The document metadata.
   */
  static getToolForDocument(document: unknown): ITool | undefined {
    for (const tool of this.tools.values()) {
      if (tool.canOpen && tool.canOpen(document)) {
        return tool
      }
    }
    return undefined
  }
}
