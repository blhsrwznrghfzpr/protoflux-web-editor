import type { GraphModel, EdgeModel, NodeId, PortId } from '@/shared/types';
import { canConnect } from '../services/validator';
import { generateId } from '@/shared/utils';

export function connectEdge(
  graph: GraphModel,
  fromNodeId: NodeId,
  fromPortId: PortId,
  toNodeId: NodeId,
  toPortId: PortId,
): { graph: GraphModel; edge: EdgeModel } | { error: string } {
  const check = canConnect(graph, fromNodeId, fromPortId, toNodeId, toPortId);
  if (!check.ok) {
    return { error: check.reason! };
  }

  const edge: EdgeModel = {
    id: generateId(),
    from: { nodeId: fromNodeId, portId: fromPortId },
    to: { nodeId: toNodeId, portId: toPortId },
  };

  return {
    graph: {
      ...graph,
      edges: [...graph.edges, edge],
    },
    edge,
  };
}
