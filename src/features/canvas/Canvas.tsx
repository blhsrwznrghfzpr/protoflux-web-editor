import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  Handle,
  Position,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEditorStore } from '@/app/providers/editor-store';
import { useCallback, useMemo } from 'react';
import type { NodeModel } from '@/shared/types';

const DATA_TYPE_COLORS: Record<string, string> = {
  Bool: '#e74c3c',
  Int: '#3498db',
  Float: '#2ecc71',
  String: '#f39c12',
};

function ProtoFluxNode({ data, selected }: NodeProps<Node<{ model: NodeModel }>>) {
  const model = data.model;
  const label = model.type.split('/').pop() ?? model.type;

  return (
    <div
      style={{
        background: selected ? '#2a2a3a' : '#1e1e2e',
        border: `2px solid ${selected ? '#7c3aed' : '#444'}`,
        borderRadius: 8,
        padding: 0,
        minWidth: 160,
        color: '#e0e0e0',
        fontSize: 12,
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          background: '#333',
          padding: '6px 10px',
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          fontWeight: 'bold',
          fontSize: 13,
          borderBottom: '1px solid #555',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
        <div>
          {model.inputs.map((port, i) => (
            <div key={port.id} style={{ position: 'relative', padding: '4px 10px' }}>
              <Handle
                type="target"
                position={Position.Left}
                id={port.id}
                style={{
                  background: DATA_TYPE_COLORS[port.dataType] ?? '#888',
                  width: 10,
                  height: 10,
                  top: 12 + i * 0,
                }}
              />
              <span style={{ color: DATA_TYPE_COLORS[port.dataType] ?? '#888' }}>
                {port.name}
              </span>
            </div>
          ))}
        </div>
        <div>
          {model.outputs.map((port, i) => (
            <div key={port.id} style={{ position: 'relative', padding: '4px 10px', textAlign: 'right' }}>
              <Handle
                type="source"
                position={Position.Right}
                id={port.id}
                style={{
                  background: DATA_TYPE_COLORS[port.dataType] ?? '#888',
                  width: 10,
                  height: 10,
                  top: 12 + i * 0,
                }}
              />
              <span style={{ color: DATA_TYPE_COLORS[port.dataType] ?? '#888' }}>
                {port.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      {model.params && Object.keys(model.params).length > 0 && (
        <div style={{ borderTop: '1px solid #444', padding: '4px 10px', fontSize: 11, color: '#aaa' }}>
          {Object.entries(model.params).map(([k, v]) => (
            <div key={k}>{k}: {String(v)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { protoflux: ProtoFluxNode };

export function Canvas() {
  const graph = useEditorStore((s) => s.graph);
  const setSelection = useEditorStore((s) => s.setSelection);
  const storeConnectEdge = useEditorStore((s) => s.connectEdge);
  const storeMoveNode = useEditorStore((s) => s.moveNode);
  const storeDeleteNode = useEditorStore((s) => s.deleteNode);
  const storeDeleteEdge = useEditorStore((s) => s.deleteEdge);

  const nodes: Node[] = useMemo(
    () =>
      graph.nodes.map((n) => ({
        id: n.id,
        type: 'protoflux',
        position: n.position,
        data: { model: n },
        selected: false,
      })),
    [graph.nodes],
  );

  const edges: Edge[] = useMemo(
    () =>
      graph.edges.map((e) => ({
        id: e.id,
        source: e.from.nodeId,
        sourceHandle: e.from.portId,
        target: e.to.nodeId,
        targetHandle: e.to.portId,
        style: { stroke: '#7c3aed' },
      })),
    [graph.edges],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Handle position changes
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.dragging === false) {
          storeMoveNode(change.id, change.position);
        }
        if (change.type === 'remove') {
          storeDeleteNode(change.id);
        }
      }
      // Let React Flow handle visual updates
      void applyNodeChanges(changes, nodes);
    },
    [nodes, storeMoveNode, storeDeleteNode],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          storeDeleteEdge(change.id);
        }
      }
      void applyEdgeChanges(changes, edges);
    },
    [edges, storeDeleteEdge],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        storeConnectEdge(
          connection.source,
          connection.sourceHandle,
          connection.target,
          connection.targetHandle,
        );
      }
    },
    [storeConnectEdge],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      setSelection(selectedNodes.map((n) => n.id));
    },
    [setSelection],
  );

  return (
    <div style={{ flex: 1, height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        fitView
        colorMode="dark"
        deleteKeyCode="Delete"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
