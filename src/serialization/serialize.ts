import type { GraphModel, ProtofluxDocument } from '@/shared/types';
import { nodeRegistry } from '@/editor-core/model/node-registry';

export interface SerializeOptions {
  createdAt?: string;
}

export function serialize(
  graph: GraphModel,
  name = 'Untitled',
  options?: SerializeOptions,
): ProtofluxDocument {
  const now = new Date().toISOString();
  const datasetMeta = nodeRegistry.getDatasetMeta();

  return {
    schemaVersion: 1,
    meta: {
      name,
      createdAt: options?.createdAt ?? now,
      updatedAt: now,
      ...(datasetMeta && {
        resoniteVersion: datasetMeta.resoniteVersion,
        datasetGeneratedAt: datasetMeta.generatedAt,
      }),
    },
    graph: {
      nodes: graph.nodes,
      edges: graph.edges,
    },
  };
}
