import type { GraphModel, ProtofluxDocument } from '@/shared/types';
import { ProtofluxDocumentSchema } from './schema/v1';
import { migrateToLatest } from './migrations';

export function deserialize(input: unknown): { graph: GraphModel; warnings: string[] } {
  const migrated = migrateToLatest(input);
  const result = ProtofluxDocumentSchema.safeParse(migrated);

  if (!result.success) {
    throw new Error(`Invalid document: ${result.error.message}`);
  }

  const doc: ProtofluxDocument = result.data as ProtofluxDocument;
  return {
    graph: {
      nodes: doc.graph.nodes,
      edges: doc.graph.edges,
    },
    warnings: doc.warnings ?? [],
  };
}
