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

/**
 * Move multiple nodes at once (batch operation, single history entry).
 */
export function moveNodes(
  graph: GraphModel,
  moves: Array<{ nodeId: NodeId; position: { x: number; y: number } }>,
): GraphModel {
  const moveMap = new Map(moves.map((m) => [m.nodeId, m.position]));
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      const pos = moveMap.get(n.id);
      return pos ? { ...n, position: pos } : n;
    }),
  };
}
