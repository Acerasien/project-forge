import { Migration } from './MigrationEngine'

export const migrations: Migration[] = [
  {
    version: 1,
    name: '001-create-initiatives',
    up: `
      CREATE TABLE IF NOT EXISTS initiatives (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `
  },
  {
    version: 2,
    name: '002-create-ai-conversations',
    up: `
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        initiative_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
      );
    `
  },
  {
    version: 3,
    name: '003-create-documents',
    up: `
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        initiative_id TEXT NOT NULL,
        name TEXT NOT NULL,
        extension TEXT NOT NULL,
        content TEXT NOT NULL,
        preferred_tool_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE CASCADE
      );
    `
  },
  {
    version: 4,
    name: '004-message-metadata',
    up: `
      ALTER TABLE ai_messages ADD COLUMN metadata TEXT;
    `
  },
  {
    version: 5,
    name: '005-create-artifacts-and-graph',
    up: `
      ALTER TABLE initiatives ADD COLUMN description TEXT;
      ALTER TABLE initiatives ADD COLUMN status TEXT NOT NULL DEFAULT 'Discovery' CHECK(status IN ('Discovery', 'InProgress', 'Released', 'Archived'));
      ALTER TABLE initiatives ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        initiative_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('Vision', 'Requirements', 'Architecture', 'SystemDesign')),
        title TEXT NOT NULL,
        content TEXT,
        status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft', 'Approved', 'NeedsReview')),
        version INTEGER NOT NULL DEFAULT 1 CHECK(version >= 1),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (initiative_id) REFERENCES initiatives(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS artifact_relationships (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('DerivedFrom', 'InformedBy', 'DecidedBy', 'Implements', 'Generated', 'SupersededBy')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id, target_id, type)
      );
    `
  },
  {
    version: 6,
    name: '006-artifact-intelligence',
    up: `
      CREATE TABLE IF NOT EXISTS artifact_intelligence (
        id TEXT PRIMARY KEY,
        artifact_id TEXT NOT NULL,
        completeness_score INTEGER,
        ai_confidence INTEGER,
        critique_summary TEXT,
        detected_risks TEXT,
        assumptions TEXT,
        suggested_improvements TEXT,
        validation_model TEXT,
        is_stale BOOLEAN NOT NULL DEFAULT 0,
        last_validated_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE CASCADE
      );
    `
  },
  {
    version: 7,
    name: '007-artifact-provenance',
    up: `
      ALTER TABLE artifacts ADD COLUMN generated_by_capability_id TEXT;
      ALTER TABLE artifacts ADD COLUMN generated_by_capability_version TEXT;
      ALTER TABLE artifacts ADD COLUMN generated_workflow_id TEXT;
      ALTER TABLE artifacts ADD COLUMN generation_session_id TEXT;
      ALTER TABLE artifacts ADD COLUMN generated_at DATETIME;
    `
  }
]
