/**
 * Schema migration framework.
 *
 * Each migration function transforms a document from version N to N+1.
 * Migrations are applied sequentially until the document reaches CURRENT_VERSION.
 */

export const CURRENT_VERSION = 1;

type MigrationFn = (doc: Record<string, unknown>) => Record<string, unknown>;

/**
 * Registry of migration functions keyed by source version.
 * e.g. migrations[1] upgrades a v1 document to v2.
 *
 * When a new schema version is introduced:
 *   1. Increment CURRENT_VERSION
 *   2. Add a migration function: migrations[oldVersion] = (doc) => { ... return upgraded; }
 *   3. Update the Zod schema in schema/ to accept the new version
 */
const migrations: Record<number, MigrationFn> = {
  // Example for future use:
  // 1: (doc) => {
  //   // Transform v1 → v2
  //   const graph = doc.graph as { nodes: unknown[]; edges: unknown[] };
  //   return { ...doc, schemaVersion: 2, graph: { ...graph, groups: [] } };
  // },
};

export function migrateToLatest(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid document: expected an object');
  }

  const doc = { ...(input as Record<string, unknown>) };

  if (!('schemaVersion' in doc)) {
    // Legacy documents without schemaVersion are treated as v1
    doc.schemaVersion = 1;
  }

  let version = doc.schemaVersion as number;

  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new Error(`Invalid schema version: ${String(version)}`);
  }

  if (version > CURRENT_VERSION) {
    throw new Error(
      `Document schema version ${version} is newer than supported version ${CURRENT_VERSION}. Please update the editor.`,
    );
  }

  // Apply migrations sequentially
  let current = doc;
  while (version < CURRENT_VERSION) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new Error(
        `No migration path from version ${version} to ${version + 1}`,
      );
    }
    current = migrate(current);
    version = current.schemaVersion as number;
  }

  return current;
}
