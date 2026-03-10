export type NodeId = string;
export type PortId = string;

export interface PortModel {
  id: PortId;
  name: string;
  dataType: string;
}

export interface NodeModel {
  id: NodeId;
  type: string;
  displayName?: string;
  position: { x: number; y: number };
  inputs: PortModel[];
  outputs: PortModel[];
  params?: Record<string, unknown>;
  unknownRaw?: Record<string, unknown>;
}

export interface EdgeModel {
  id: string;
  from: { nodeId: NodeId; portId: PortId };
  to: { nodeId: NodeId; portId: PortId };
}

export interface ProtofluxDocument {
  schemaVersion: 1;
  meta: {
    name: string;
    createdAt: string;
    updatedAt: string;
  };
  graph: {
    nodes: NodeModel[];
    edges: EdgeModel[];
  };
  warnings?: string[];
}

export interface GraphModel {
  nodes: NodeModel[];
  edges: EdgeModel[];
}
