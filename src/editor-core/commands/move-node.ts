import type { GraphModel, NodeId } from '@/shared/types';

export function moveNode(
  graph: GraphModel,
  nodeId: NodeId,
  position: { x: number; y: number },
): GraphModel {
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === nodeId ? { ...n, position } : n,
    ),
  };
}
