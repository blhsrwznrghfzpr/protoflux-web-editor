import type { GraphModel, NodeModel } from '@/shared/types';
import { addNode } from './add-node';

/**
 * 指定ノードを複製する。パラメータもコピーし、位置をオフセットする。
 */
export function duplicateNodes(
  graph: GraphModel,
  nodeIds: string[],
  offset = { x: 40, y: 40 },
): { graph: GraphModel; newNodes: NodeModel[] } {
  let current = graph;
  const newNodes: NodeModel[] = [];

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
  }

  return { graph: current, newNodes };
}
