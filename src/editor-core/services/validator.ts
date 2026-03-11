import type { GraphModel, NodeId, PortId } from '@/shared/types';
import { checkTypeCompatibility } from './type-compatibility';

export interface ValidationError {
  type: 'port-not-found' | 'type-mismatch' | 'duplicate-input' | 'cycle-detected';
  message: string;
  edgeId?: string;
}

export function validateGraph(graph: GraphModel): ValidationError[] {
  const errors: ValidationError[] = [];

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  const inputConnectionCount = new Map<string, number>();

  for (const edge of graph.edges) {
    const fromNode = nodeMap.get(edge.from.nodeId);
    const toNode = nodeMap.get(edge.to.nodeId);

    if (!fromNode) {
      errors.push({
        type: 'port-not-found',
        message: `Edge ${edge.id}: source node ${edge.from.nodeId} not found`,
        edgeId: edge.id,
      });
      continue;
    }

    if (!toNode) {
      errors.push({
        type: 'port-not-found',
        message: `Edge ${edge.id}: target node ${edge.to.nodeId} not found`,
        edgeId: edge.id,
      });
      continue;
    }

    const outputPort = fromNode.outputs.find((p) => p.id === edge.from.portId);
    if (!outputPort) {
      errors.push({
        type: 'port-not-found',
        message: `Edge ${edge.id}: output port ${edge.from.portId} not found on node ${fromNode.id}`,
        edgeId: edge.id,
      });
      continue;
    }

    const inputPort = toNode.inputs.find((p) => p.id === edge.to.portId);
    if (!inputPort) {
      errors.push({
        type: 'port-not-found',
        message: `Edge ${edge.id}: input port ${edge.to.portId} not found on node ${toNode.id}`,
        edgeId: edge.id,
      });
      continue;
    }

    // Type check (strict mode with optional implicit conversions)
    const compat = checkTypeCompatibility(outputPort.dataType, inputPort.dataType);
    if (!compat.compatible) {
      errors.push({
        type: 'type-mismatch',
        message: `Edge ${edge.id}: type mismatch ${outputPort.dataType} → ${inputPort.dataType}`,
        edgeId: edge.id,
      });
    }

    // Duplicate input connection check
    const inputKey = `${edge.to.nodeId}:${edge.to.portId}`;
    const count = (inputConnectionCount.get(inputKey) ?? 0) + 1;
    inputConnectionCount.set(inputKey, count);
    if (count > 1) {
      errors.push({
        type: 'duplicate-input',
        message: `Edge ${edge.id}: input port ${edge.to.portId} on node ${edge.to.nodeId} has multiple connections`,
        edgeId: edge.id,
      });
    }
  }

  // Cycle detection
  const cycleErrors = detectCycles(graph);
  errors.push(...cycleErrors);

  return errors;
}

export function detectCycles(graph: GraphModel): ValidationError[] {
  const errors: ValidationError[] = [];
  // Build adjacency list: nodeId -> set of downstream nodeIds
  const adj = new Map<NodeId, Set<NodeId>>();
  for (const node of graph.nodes) {
    adj.set(node.id, new Set());
  }
  for (const edge of graph.edges) {
    adj.get(edge.from.nodeId)?.add(edge.to.nodeId);
  }

  const visited = new Set<NodeId>();
  const inStack = new Set<NodeId>();

  function dfs(nodeId: NodeId): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const neighbor of adj.get(nodeId) ?? []) {
      if (dfs(neighbor)) {
        return true;
      }
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const node of graph.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) {
        errors.push({
          type: 'cycle-detected',
          message: 'Graph contains a cycle',
        });
        break;
      }
    }
  }

  return errors;
}

/**
 * Check if adding an edge from fromNodeId to toNodeId would create a cycle.
 */
export function wouldCreateCycle(
  graph: GraphModel,
  fromNodeId: NodeId,
  toNodeId: NodeId,
): boolean {
  // Check if there's already a path from toNodeId to fromNodeId
  const adj = new Map<NodeId, Set<NodeId>>();
  for (const node of graph.nodes) {
    adj.set(node.id, new Set());
  }
  for (const edge of graph.edges) {
    adj.get(edge.from.nodeId)?.add(edge.to.nodeId);
  }

  // BFS from toNodeId to see if we can reach fromNodeId
  const queue = [toNodeId];
  const visited = new Set<NodeId>([toNodeId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === fromNodeId) return true;
    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

export function canConnect(
  graph: GraphModel,
  fromNodeId: NodeId,
  fromPortId: PortId,
  toNodeId: NodeId,
  toPortId: PortId,
): { ok: boolean; reason?: string } {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const fromNode = nodeMap.get(fromNodeId);
  const toNode = nodeMap.get(toNodeId);

  if (!fromNode || !toNode) {
    return { ok: false, reason: 'Node not found' };
  }

  const outputPort = fromNode.outputs.find((p) => p.id === fromPortId);
  const inputPort = toNode.inputs.find((p) => p.id === toPortId);

  if (!outputPort || !inputPort) {
    return { ok: false, reason: 'Port not found' };
  }

  const compat = checkTypeCompatibility(outputPort.dataType, inputPort.dataType);
  if (!compat.compatible) {
    return { ok: false, reason: `Type mismatch: ${outputPort.dataType} → ${inputPort.dataType}` };
  }

  // Check if input already has a connection
  const hasExisting = graph.edges.some(
    (e) => e.to.nodeId === toNodeId && e.to.portId === toPortId,
  );
  if (hasExisting) {
    return { ok: false, reason: 'Input port already connected' };
  }

  // Check if adding this edge would create a cycle
  if (fromNodeId === toNodeId || wouldCreateCycle(graph, fromNodeId, toNodeId)) {
    return { ok: false, reason: 'Connection would create a cycle' };
  }

  return { ok: true };
}
