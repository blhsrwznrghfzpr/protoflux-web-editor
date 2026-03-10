import type { GraphModel, NodeId } from '@/shared/types';

export function deleteNode(graph: GraphModel, nodeId: NodeId): GraphModel {
  return {
    nodes: graph.nodes.filter((n) => n.id !== nodeId),
    edges: graph.edges.filter(
      (e) => e.from.nodeId !== nodeId && e.to.nodeId !== nodeId,
    ),
  };
}

export function deleteEdge(graph: GraphModel, edgeId: string): GraphModel {
  return {
    ...graph,
    edges: graph.edges.filter((e) => e.id !== edgeId),
  };
}
