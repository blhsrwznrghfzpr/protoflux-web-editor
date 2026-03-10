import type { GraphModel, ProtofluxDocument } from '@/shared/types';

export function serialize(graph: GraphModel, name = 'Untitled'): ProtofluxDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    meta: {
      name,
      createdAt: now,
      updatedAt: now,
    },
    graph: {
      nodes: graph.nodes,
      edges: graph.edges,
    },
  };
}
