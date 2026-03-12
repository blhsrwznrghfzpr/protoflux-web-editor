import type { GraphModel, ProtofluxDocument } from '@/shared/types';
import { nodeRegistry } from '@/editor-core/model/node-registry';

export const EDITOR_VERSION = '1.0.0';

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
      editorVersion: EDITOR_VERSION,
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
