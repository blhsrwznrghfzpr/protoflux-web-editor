import type { GraphModel, NodeModel, EdgeModel } from '@/shared/types';
import { addNode } from './add-node';
import { generateId } from '@/shared/utils';

/**
 * 指定ノードを複製する。パラメータもコピーし、位置をオフセットする。
 * 選択ノード間のエッジも保持する。
 */
export function duplicateNodes(
  graph: GraphModel,
  nodeIds: string[],
  offset = { x: 40, y: 40 },
): { graph: GraphModel; newNodes: NodeModel[] } {
  let current = graph;
  const newNodes: NodeModel[] = [];
  const oldToNewNodeId = new Map<string, string>();
  const oldToNewPortId = new Map<string, string>();
  const sourceSet = new Set(nodeIds);

  for (const nodeId of nodeIds) {
    const source = current.nodes.find((n) => n.id === nodeId);
    if (!source) continue;

    const result = addNode(current, source.type, {
      x: source.position.x + offset.x,
      y: source.position.y + offset.y,
    });
    if ('error' in result) continue;

    // パラメータをコピー
    if (source.params) {
      const node = result.graph.nodes[result.graph.nodes.length - 1];
      result.graph = {
        ...result.graph,
        nodes: result.graph.nodes.map((n) =>
          n.id === node.id ? { ...n, params: { ...source.params } } : n,
        ),
      };
    }

    current = result.graph;
    newNodes.push(result.node);
    oldToNewNodeId.set(nodeId, result.node.id);

    // Build port ID mapping
    for (let i = 0; i < source.inputs.length; i++) {
      if (result.node.inputs[i]) {
        oldToNewPortId.set(source.inputs[i].id, result.node.inputs[i].id);
      }
    }
    for (let i = 0; i < source.outputs.length; i++) {
      if (result.node.outputs[i]) {
        oldToNewPortId.set(source.outputs[i].id, result.node.outputs[i].id);
      }
    }
  }

  // Duplicate inter-node edges
  const newEdges: EdgeModel[] = [];
  for (const edge of graph.edges) {
    if (sourceSet.has(edge.from.nodeId) && sourceSet.has(edge.to.nodeId)) {
      const newFromNodeId = oldToNewNodeId.get(edge.from.nodeId);
      const newToNodeId = oldToNewNodeId.get(edge.to.nodeId);
      const newFromPortId = oldToNewPortId.get(edge.from.portId);
      const newToPortId = oldToNewPortId.get(edge.to.portId);
      if (newFromNodeId && newToNodeId && newFromPortId && newToPortId) {
        newEdges.push({
          id: generateId(),
          from: { nodeId: newFromNodeId, portId: newFromPortId },
          to: { nodeId: newToNodeId, portId: newToPortId },
        });
      }
    }
  }

  if (newEdges.length > 0) {
    current = {
      ...current,
      edges: [...current.edges, ...newEdges],
    };
  }

  return { graph: current, newNodes };
}
