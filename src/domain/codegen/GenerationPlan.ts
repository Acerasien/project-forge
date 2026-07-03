export interface VirtualFile {
  path: string;       // Relative to workspace output root (e.g. "schema.sql" or "src/domain/User.ts")
  content: string;    // The file content string
  type: 'code' | 'schema' | 'config' | 'pipeline' | 'infra';
  description?: string;
  derivedFromArtifactId?: string; // For provenance traceability mapping in the graph
}

export interface GenerationPlan {
  initiativeId: string;
  virtualFiles: VirtualFile[];
}
