export * from './ITool'
export * from './ToolRegistry'

import { ToolRegistry } from './ToolRegistry'
import { EditorTool } from './editor/EditorTool'
import { FlowTool } from './flow/FlowTool'

/**
 * Initializes the core tools and registers them in the global ToolRegistry.
 * Should be called once during application startup.
 */
export function registerCoreTools(): void {
  ToolRegistry.register(new EditorTool())
  ToolRegistry.register(new FlowTool())
}
