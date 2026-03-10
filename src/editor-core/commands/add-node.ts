import type { GraphModel, NodeModel } from '@/shared/types';
import { nodeRegistry } from '../model/node-registry';
import { generateId } from '@/shared/utils';

export function addNode(
  graph: GraphModel,
  type: string,
  position: { x: number; y: number },
): { graph: GraphModel; node: NodeModel } | { error: string } {
  const def = nodeRegistry.get(type);

  const nodeId = generateId();

  const node: NodeModel = {
    id: nodeId,
    type,
    displayName: def?.displayName,
    position,
    inputs: (def?.inputs ?? []).map((p) => ({
      id: `${nodeId}-in-${p.name}`,
      name: p.name,
      dataType: p.dataType,
    })),
    outputs: (def?.outputs ?? []).map((p) => ({
      id: `${nodeId}-out-${p.name}`,
      name: p.name,
      dataType: p.dataType,
    })),
    params: def?.defaultParams ? { ...def.defaultParams } : undefined,
    unknownRaw: def ? undefined : { originalType: type },
  };

  return {
    graph: {
      ...graph,
      nodes: [...graph.nodes, node],
    },
    node,
  };
}
