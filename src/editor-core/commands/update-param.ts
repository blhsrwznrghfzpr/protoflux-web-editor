import type { GraphModel, NodeId } from '@/shared/types';

export function updateParam(
  graph: GraphModel,
  nodeId: NodeId,
  key: string,
  value: unknown,
): GraphModel {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === nodeId
        ? { ...n, params: { ...n.params, [key]: value } }
        : n,
    ),
  };
}
