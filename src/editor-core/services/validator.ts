import type { GraphModel, NodeId, PortId } from '@/shared/types';

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

    // Type check (strict mode)
    if (outputPort.dataType !== inputPort.dataType) {
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

  return errors;
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

  if (outputPort.dataType !== inputPort.dataType) {
    return { ok: false, reason: `Type mismatch: ${outputPort.dataType} → ${inputPort.dataType}` };
  }

  // Check if input already has a connection
  const hasExisting = graph.edges.some(
    (e) => e.to.nodeId === toNodeId && e.to.portId === toPortId,
  );
  if (hasExisting) {
    return { ok: false, reason: 'Input port already connected' };
  }

  return { ok: true };
}
