const CURRENT_VERSION = 1;

export function migrateToLatest(input: unknown): unknown {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid document: expected an object');
  }

  const doc = input as Record<string, unknown>;

  if (!('schemaVersion' in doc)) {
    throw new Error('Invalid document: missing schemaVersion');
  }

  const version = doc.schemaVersion;

  if (version === CURRENT_VERSION) {
    return doc;
  }

  // Future migrations will be added here as chained transforms
  // e.g.: if (version === 1) doc = migrateV1toV2(doc);

  throw new Error(`Unsupported schema version: ${version}`);
}
