import type { GraphModel, NodeModel, EdgeModel } from '@/shared/types';
import { generateId } from '@/shared/utils';
import { nodeRegistry } from '../model/node-registry';

export interface ClipboardData {
  nodes: NodeModel[];
  edges: EdgeModel[];
}

/**
 * 選択ノードとその間のエッジをクリップボードデータとしてコピーする
 */
export function copyNodes(graph: GraphModel, nodeIds: string[]): ClipboardData {
  const nodeSet = new Set(nodeIds);
  const nodes = graph.nodes.filter((n) => nodeSet.has(n.id));
  // 選択ノード間のエッジのみコピー
  const edges = graph.edges.filter(
    (e) => nodeSet.has(e.from.nodeId) && nodeSet.has(e.to.nodeId),
  );
  return { nodes, edges };
}

/**
 * クリップボードデータをグラフに貼り付ける
 */
export function pasteNodes(
  graph: GraphModel,
  clipboard: ClipboardData,
  offset = { x: 60, y: 60 },
): { graph: GraphModel; newNodeIds: string[] } {
  if (clipboard.nodes.length === 0) return { graph, newNodeIds: [] };

  // 旧 ID → 新 ID マッピング
  const idMap = new Map<string, string>();
  const newNodes: NodeModel[] = [];

  for (const source of clipboard.nodes) {
    const newId = generateId();
    idMap.set(source.id, newId);

    const def = nodeRegistry.get(source.type);

    const node: NodeModel = {
      id: newId,
      type: source.type,
      displayName: source.displayName ?? def?.displayName,
      position: {
        x: source.position.x + offset.x,
        y: source.position.y + offset.y,
      },
      inputs: source.inputs.map((p) => {
        const newPortId = `${newId}-in-${p.name}`;
        idMap.set(p.id, newPortId);
        return { id: newPortId, name: p.name, dataType: p.dataType };
      }),
      outputs: source.outputs.map((p) => {
        const newPortId = `${newId}-out-${p.name}`;
        idMap.set(p.id, newPortId);
        return { id: newPortId, name: p.name, dataType: p.dataType };
      }),
      params: source.params ? { ...source.params } : undefined,
      unknownRaw: source.unknownRaw ? { ...source.unknownRaw } : undefined,
    };

    newNodes.push(node);
  }

  // エッジの再マッピング
  const newEdges: EdgeModel[] = [];
  for (const edge of clipboard.edges) {
    const newFromNodeId = idMap.get(edge.from.nodeId);
    const newToNodeId = idMap.get(edge.to.nodeId);
    const newFromPortId = idMap.get(edge.from.portId);
    const newToPortId = idMap.get(edge.to.portId);

    if (newFromNodeId && newToNodeId && newFromPortId && newToPortId) {
      newEdges.push({
        id: generateId(),
        from: { nodeId: newFromNodeId, portId: newFromPortId },
        to: { nodeId: newToNodeId, portId: newToPortId },
      });
    }
  }

  return {
    graph: {
      nodes: [...graph.nodes, ...newNodes],
      edges: [...graph.edges, ...newEdges],
    },
    newNodeIds: newNodes.map((n) => n.id),
  };
}
