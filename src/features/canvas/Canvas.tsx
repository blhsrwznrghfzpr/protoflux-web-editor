import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
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
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import type { NodeModel } from '@/shared/types';
import { toast } from '@/shared/components/Toast';
import { checkTypeCompatibility } from '@/editor-core/services/type-compatibility';
import { nodeRegistry, type NodeDefinition } from '@/editor-core/model/node-registry';
import { deserialize } from '@/serialization/deserialize';
import { confirmUnsavedChanges } from '@/shared/utils';

const DATA_TYPE_COLORS: Record<string, string> = {
  bool: '#e74c3c',
  int: '#3498db',
  float: '#2ecc71',
  float2: '#27ae60',
  float3: '#16a085',
  float4: '#1abc9c',
  floatQ: '#0e6655',
  string: '#f39c12',
  Uri: '#e67e22',
  color: '#9b59b6',
  colorX: '#8e44ad',
  User: '#e91e63',
  Slot: '#00bcd4',
  IValue: '#5dade2',
  IField: '#45b7d1',
  Impulse: '#ff6b6b',
  Operation: '#a29bfe',
  dummy: '#666',
};

const CATEGORY_COLORS: Record<string, string> = {
  Math: '#3498db',
  Logic: '#e74c3c',
  Flow: '#9b59b6',
  Variables: '#2ecc71',
  Data: '#f39c12',
  Operators: '#1abc9c',
  Actions: '#e91e63',
  Input: '#00bcd4',
  Network: '#ff6b6b',
  Users: '#e91e63',
  Physics: '#8e44ad',
  Rendering: '#16a085',
};

function ProtoFluxNode({ data, selected }: NodeProps<Node<{ model: NodeModel }>>) {
  const model = data.model;
  const label = model.displayName ?? model.type;
  const def = nodeRegistry.get(model.type);
  const isUnknown = !def;
  const categoryColor = def ? (CATEGORY_COLORS[def.category] ?? '#555') : '#e67e22';
  const hasError = useEditorStore((s) =>
    s.validationErrors.some(
      (e) => e.edgeId && s.graph.edges.some(
        (edge) => edge.id === e.edgeId && (edge.from.nodeId === model.id || edge.to.nodeId === model.id),
      ),
    ),
  );

  const borderColor = selected
    ? '#7c3aed'
    : hasError
      ? '#e74c3c'
      : isUnknown
        ? '#e67e22'
        : '#444';

  return (
    <div
      style={{
        background: selected ? '#2a2a3a' : '#1e1e2e',
        border: `2px solid ${borderColor}`,
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
          background: isUnknown ? '#5a3a1e' : '#333',
          padding: '6px 10px',
          borderTopLeftRadius: 6,
          borderTopRightRadius: 6,
          fontWeight: 'bold',
          fontSize: 13,
          borderBottom: `1px solid ${isUnknown ? '#e67e22' : '#555'}`,
          borderTop: `3px solid ${categoryColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {isUnknown && (
          <span title="Unknown node type - preserved for round-trip" style={{ fontSize: 14 }}>
            &#x26A0;
          </span>
        )}
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
  const storeSetViewport = useEditorStore((s) => s.setViewport);
  const storeConnectEdge = useEditorStore((s) => s.connectEdge);
  const storeMoveNode = useEditorStore((s) => s.moveNode);
  const storeMoveNodes = useEditorStore((s) => s.moveNodes);
  const storeDeleteNode = useEditorStore((s) => s.deleteNode);
  const storeDeleteEdge = useEditorStore((s) => s.deleteEdge);
  const storeAddNode = useEditorStore((s) => s.addNode);
  const loadGraph = useEditorStore((s) => s.loadGraph);
  const dirty = useEditorStore((s) => s.dirty);
  const setStatusMessage = useEditorStore((s) => s.setStatusMessage);
  const reactFlowInstance = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRestoredRef = useRef(false);

  // Restore saved viewport on initial load
  useEffect(() => {
    if (viewportRestoredRef.current) return;
    viewportRestoredRef.current = true;
    const saved = useEditorStore.getState().viewport;
    if (saved && (saved.x !== 0 || saved.y !== 0 || saved.zoom !== 1)) {
      // Defer to let React Flow initialize
      requestAnimationFrame(() => {
        reactFlowInstance.setViewport({ x: saved.x, y: saved.y, zoom: saved.zoom });
      });
    }
  }, [reactFlowInstance]);

  const onViewportChange = useCallback(
    (viewport: { x: number; y: number; zoom: number }) => {
      storeSetViewport(viewport);
    },
    [storeSetViewport],
  );

  // Zoom-to-fit and zoom-to-selection events
  useEffect(() => {
    const handleFitView = () => reactFlowInstance.fitView({ duration: 300 });
    const handleFitSelection = () => {
      const sel = useEditorStore.getState().selection;
      if (sel.length > 0) {
        reactFlowInstance.fitView({ nodes: sel.map((id) => ({ id })), duration: 300, padding: 0.3 });
      }
    };
    window.addEventListener('protoflux-fit-view', handleFitView);
    window.addEventListener('protoflux-fit-selection', handleFitSelection);
    return () => {
      window.removeEventListener('protoflux-fit-view', handleFitView);
      window.removeEventListener('protoflux-fit-selection', handleFitSelection);
    };
  }, [reactFlowInstance]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    flowPosition: { x: number; y: number };
  } | null>(null);
  const [contextSearch, setContextSearch] = useState('');
  const [contextHighlight, setContextHighlight] = useState(0);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleFileDrop = useCallback(
    (file: File) => {
      if (!confirmUnsavedChanges(dirty)) return;
      const MAX_FILE_SIZE = 50 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        toast(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 50MB.`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          const { graph: importedGraph, warnings } = deserialize(json);
          const name = json.meta?.name ?? file.name.replace(/\.protoflux\.json$/, '');
          loadGraph(importedGraph, name);
          toast('Graph imported successfully', 'success');
          if (warnings.length > 0) {
            toast(`Import warnings: ${warnings.join(', ')}`, 'info');
          }
        } catch (err) {
          const msg = `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
          toast(msg, 'error');
          setStatusMessage(msg, 'error');
        }
      };
      reader.readAsText(file);
    },
    [dirty, loadGraph, setStatusMessage],
  );

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      // Handle file drop (import .protoflux.json)
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.name.endsWith('.json')) {
          handleFileDrop(file);
          return;
        }
      }

      // Handle node type drop from palette
      const nodeType = e.dataTransfer.getData('application/protoflux-node-type');
      if (!nodeType || !wrapperRef.current) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });
      storeAddNode(nodeType, position);
    },
    [reactFlowInstance, storeAddNode, handleFileDrop],
  );

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
      graph.edges.map((e) => {
        // 暗黙変換が発生しているエッジを検出して線色・ラベルを変える
        const fromNode = graph.nodes.find((n) => n.id === e.from.nodeId);
        const toNode = graph.nodes.find((n) => n.id === e.to.nodeId);
        const outputPort = fromNode?.outputs.find((p) => p.id === e.from.portId);
        const inputPort = toNode?.inputs.find((p) => p.id === e.to.portId);

        let stroke = '#7c3aed';
        let label: string | undefined;
        if (outputPort && inputPort) {
          const compat = checkTypeCompatibility(outputPort.dataType, inputPort.dataType);
          if (compat.implicit) {
            stroke = '#f39c12';
            label = `${outputPort.dataType} \u2192 ${inputPort.dataType}`;
          } else {
            stroke = DATA_TYPE_COLORS[outputPort.dataType] ?? '#7c3aed';
          }
        }

        return {
          id: e.id,
          source: e.from.nodeId,
          sourceHandle: e.from.portId,
          target: e.to.nodeId,
          targetHandle: e.to.portId,
          animated: label !== undefined,
          style: { stroke, strokeWidth: 2 },
          label,
          labelStyle: label ? { fill: '#f39c12', fontSize: 10 } : undefined,
          labelBgStyle: label ? { fill: '#1e1e2e', fillOpacity: 0.8 } : undefined,
        };
      }),
    [graph.edges, graph.nodes],
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Collect all position changes that finished dragging (batch into a single history entry)
      const finishedMoves: Array<{ nodeId: string; position: { x: number; y: number } }> = [];
      for (const change of changes) {
        if (change.type === 'position' && change.position && change.dragging === false) {
          finishedMoves.push({ nodeId: change.id, position: change.position });
        }
        if (change.type === 'remove') {
          storeDeleteNode(change.id);
        }
      }
      // Batch move: single history entry for all nodes dragged together
      if (finishedMoves.length > 1) {
        storeMoveNodes(finishedMoves);
      } else if (finishedMoves.length === 1) {
        storeMoveNode(finishedMoves[0].nodeId, finishedMoves[0].position);
      }
      // Let React Flow handle visual updates
      void applyNodeChanges(changes, nodes);
    },
    [nodes, storeMoveNode, storeMoveNodes, storeDeleteNode],
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

  // Real-time validation during edge dragging (§7.2)
  const isValidConnection = useCallback(
    (conn: Edge | Connection) => {
      const source = conn.source;
      const target = conn.target;
      const sourceHandle = conn.sourceHandle ?? undefined;
      const targetHandle = conn.targetHandle ?? undefined;

      if (!source || !target || !sourceHandle || !targetHandle) {
        return false;
      }
      const fromNode = graph.nodes.find((n) => n.id === source);
      const toNode = graph.nodes.find((n) => n.id === target);
      if (!fromNode || !toNode) return false;

      const outputPort = fromNode.outputs.find((p) => p.id === sourceHandle);
      const inputPort = toNode.inputs.find((p) => p.id === targetHandle);
      if (!outputPort || !inputPort) return false;

      // Type compatibility check
      const compat = checkTypeCompatibility(outputPort.dataType, inputPort.dataType);
      if (!compat.compatible) return false;

      // Self-connection check
      if (source === target) return false;

      return true;
    },
    [graph.nodes],
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        // Auto-replace: if input already has a connection, remove it first
        const existingEdge = graph.edges.find(
          (e) => e.to.nodeId === connection.target && e.to.portId === connection.targetHandle,
        );
        if (existingEdge) {
          storeDeleteEdge(existingEdge.id);
        }

        const error = storeConnectEdge(
          connection.source,
          connection.sourceHandle,
          connection.target,
          connection.targetHandle,
        );
        if (error) {
          toast(error, 'error');
        }
      }
    },
    [storeConnectEdge, storeDeleteEdge, graph.edges],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      setSelection(selectedNodes.map((n) => n.id));
    },
    [setSelection],
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | globalThis.MouseEvent) => {
      event.preventDefault();
      const flowPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setContextMenu({ x: event.clientX, y: event.clientY, flowPosition });
      setContextSearch('');
    },
    [reactFlowInstance],
  );

  const contextResults = useMemo(() => {
    if (!contextMenu || contextSearch.length < 1) return [];
    const lower = contextSearch.toLowerCase();
    const terms = lower.split(/\s+/).filter(Boolean);
    const placeable = nodeRegistry.listPlaceable();
    const matched: NodeDefinition[] = [];
    for (const def of placeable) {
      const text = `${def.displayName ?? ''} ${def.type} ${def.category}`.toLowerCase();
      if (terms.every((t) => text.includes(t))) {
        matched.push(def);
        if (matched.length >= 20) break;
      }
    }
    return matched;
  }, [contextMenu, contextSearch]);

  const handleContextAdd = useCallback(
    (type: string) => {
      if (!contextMenu) return;
      storeAddNode(type, contextMenu.flowPosition);
      setContextMenu(null);
    },
    [contextMenu, storeAddNode],
  );

  return (
    <div ref={wrapperRef} style={{ flex: 1, height: '100%' }} onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onSelectionChange={onSelectionChange}
        onViewportChange={onViewportChange}
        onPaneClick={() => setContextMenu(null)}
        onPaneContextMenu={onPaneContextMenu}
        fitView
        colorMode="dark"
        deleteKeyCode="Delete"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const model = node.data?.model as NodeModel | undefined;
            if (!model) return '#444';
            const def = nodeRegistry.get(model.type);
            if (!def) return '#e67e22';
            return CATEGORY_COLORS[def.category] ?? '#555';
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#1e1e2e',
            border: '1px solid #444',
            borderRadius: 6,
            padding: 4,
            zIndex: 10000,
            minWidth: 220,
            maxHeight: 300,
            overflow: 'auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            fontFamily: 'monospace',
            fontSize: 12,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            type="text"
            placeholder="Search nodes..."
            value={contextSearch}
            onChange={(e) => { setContextSearch(e.target.value); setContextHighlight(0); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setContextMenu(null);
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setContextHighlight((prev) => Math.min(prev + 1, contextResults.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setContextHighlight((prev) => Math.max(prev - 1, 0));
              }
              if (e.key === 'Enter' && contextResults.length > 0) {
                handleContextAdd(contextResults[contextHighlight]?.type ?? contextResults[0].type);
              }
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#2a2a3a',
              border: '1px solid #555',
              borderRadius: 4,
              color: '#e0e0e0',
              fontSize: 12,
              boxSizing: 'border-box',
              marginBottom: 4,
            }}
          />
          {contextResults.map((def, idx) => (
            <button
              key={def.type}
              onClick={() => handleContextAdd(def.type)}
              onMouseEnter={() => setContextHighlight(idx)}
              title={def.type}
              style={{
                display: 'block',
                width: '100%',
                padding: '5px 8px',
                background: idx === contextHighlight ? '#2a2a3a' : 'transparent',
                border: 'none',
                borderRadius: 4,
                color: '#d0d0d0',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            >
              <div>{def.displayName ?? def.type}</div>
              <div style={{ fontSize: 10, color: '#666' }}>{def.category}</div>
            </button>
          ))}
          {contextSearch.length > 0 && contextResults.length === 0 && (
            <div style={{ padding: 8, color: '#666', textAlign: 'center' }}>No nodes found</div>
          )}
          {contextSearch.length === 0 && (
            <div style={{ padding: 8, color: '#666', textAlign: 'center' }}>
              Type to search for nodes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
