import type { GraphModel, ProtofluxDocument } from '@/shared/types';
import { ProtofluxDocumentSchema } from './schema/v1';
import { migrateToLatest } from './migrations';
import { nodeRegistry } from '@/editor-core/model/node-registry';

export function deserialize(input: unknown): { graph: GraphModel; warnings: string[] } {
  const migrated = migrateToLatest(input);
  const result = ProtofluxDocumentSchema.safeParse(migrated);

  if (!result.success) {
    throw new Error(`Invalid document: ${result.error.message}`);
  }

  const doc: ProtofluxDocument = result.data as ProtofluxDocument;
  const warnings = [...(doc.warnings ?? [])];

  // Detect unknown nodes not in the registry and tag them for round-trip preservation
  for (const node of doc.graph.nodes) {
    const def = nodeRegistry.get(node.type);
    if (!def) {
      warnings.push(`Unknown node type: ${node.type} (id: ${node.id}) — preserved as-is`);
      // Preserve original data for round-trip if not already set
      if (!node.unknownRaw) {
        node.unknownRaw = { originalType: node.type };
      }
    }
  }

  return {
    graph: {
      nodes: doc.graph.nodes,
      edges: doc.graph.edges,
    },
    warnings,
  };
}
