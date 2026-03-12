import { useEditorStore } from '@/app/providers/editor-store';
import { useMemo } from 'react';
import type { EdgeModel } from '@/shared/types';
import { nodeRegistry } from '@/editor-core/model/node-registry';

const panelStyle: React.CSSProperties = {
  width: 240,
  background: '#1a1a2e',
  borderLeft: '1px solid #333',
  padding: 16,
  color: '#e0e0e0',
  fontSize: 12,
  fontFamily: 'monospace',
  overflow: 'auto',
};

const dangerBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  background: '#e74c3c',
  border: 'none',
  borderRadius: 4,
  color: 'white',
  cursor: 'pointer',
  fontSize: 12,
};

export function Inspector() {
  const graph = useEditorStore((s) => s.graph);
  const selection = useEditorStore((s) => s.selection);
  const updateParam = useEditorStore((s) => s.updateParam);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const deleteEdge = useEditorStore((s) => s.deleteEdge);
  const copySelected = useEditorStore((s) => s.copySelected);
  const duplicateSelected = useEditorStore((s) => s.duplicateSelected);

  const selectedNode = useMemo(() => {
    if (selection.length !== 1) return null;
    return graph.nodes.find((n) => n.id === selection[0]) ?? null;
  }, [graph.nodes, selection]);

  const selectedNodes = useMemo(() => {
    if (selection.length <= 1) return [];
    const idSet = new Set(selection);
    return graph.nodes.filter((n) => idSet.has(n.id));
  }, [graph.nodes, selection]);

  const connectedEdges = useMemo(() => {
    if (!selectedNode) return [] as EdgeModel[];
    return graph.edges.filter(
      (e) => e.from.nodeId === selectedNode.id || e.to.nodeId === selectedNode.id,
    );
  }, [graph.edges, selectedNode]);

  if (!selectedNode && selection.length === 0) {
    // Graph overview when nothing is selected
    const categoryCount = new Map<string, number>();
    for (const node of graph.nodes) {
      const def = nodeRegistry.get(node.type);
      const cat = def?.category ?? 'Unknown';
      categoryCount.set(cat, (categoryCount.get(cat) ?? 0) + 1);
    }
    const unknownCount = graph.nodes.filter((n) => !nodeRegistry.get(n.type)).length;

    return (
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Graph Overview</h3>
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: '#888' }}>Nodes:</span> {graph.nodes.length}
          </div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ color: '#888' }}>Edges:</span> {graph.edges.length}
          </div>
          {unknownCount > 0 && (
            <div style={{ marginBottom: 6, color: '#e67e22' }}>
              Unknown nodes: {unknownCount}
            </div>
          )}
        </div>
        {categoryCount.size > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#888', marginBottom: 4 }}>Categories</div>
            {Array.from(categoryCount.entries())
              .sort(([, a], [, b]) => b - a)
              .slice(0, 15)
              .map(([cat, count]) => (
                <div key={cat} style={{ marginBottom: 2, fontSize: 11 }}>
                  {cat} <span style={{ color: '#666' }}>x{count}</span>
                </div>
              ))}
            {categoryCount.size > 15 && (
              <div style={{ fontSize: 11, color: '#666' }}>
                ...and {categoryCount.size - 15} more
              </div>
            )}
          </div>
        )}
        {graph.nodes.length === 0 && (
          <div style={{ color: '#666', fontSize: 12, lineHeight: 1.5 }}>
            Add nodes from the palette on the left, or right-click the canvas to search and add nodes.
          </div>
        )}
      </div>
    );
  }

  // Multi-node selection panel
  if (selection.length > 1) {
    const typeCount = new Map<string, number>();
    for (const node of selectedNodes) {
      const label = node.displayName ?? node.type;
      typeCount.set(label, (typeCount.get(label) ?? 0) + 1);
    }
    const connectionCount = graph.edges.filter((e) => {
      const selSet = new Set(selection);
      return selSet.has(e.from.nodeId) && selSet.has(e.to.nodeId);
    }).length;

    return (
      <div style={panelStyle}>
        <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>
          {selection.length} nodes selected
        </h3>

        <div style={{ marginBottom: 12, fontSize: 11, color: '#888' }}>
          {connectionCount} internal connection{connectionCount !== 1 ? 's' : ''}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ color: '#888', marginBottom: 4 }}>Node Types</div>
          {Array.from(typeCount.entries())
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([type, count]) => (
              <div key={type} style={{ marginBottom: 2, fontSize: 11 }}>
                {type} <span style={{ color: '#666' }}>x{count}</span>
              </div>
            ))}
          {typeCount.size > 10 && (
            <div style={{ fontSize: 11, color: '#666' }}>
              ...and {typeCount.size - 10} more types
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={copySelected}
            style={{
              width: '100%',
              padding: '8px',
              background: '#2a2a3a',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Copy (Ctrl+C)
          </button>
          <button
            onClick={duplicateSelected}
            style={{
              width: '100%',
              padding: '8px',
              background: '#2a2a3a',
              border: '1px solid #444',
              borderRadius: 4,
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            Duplicate (Ctrl+D)
          </button>
          <button
            onClick={() => deleteNodes(selection)}
            style={dangerBtnStyle}
          >
            Delete {selection.length} Nodes
          </button>
        </div>
      </div>
    );
  }

  if (!selectedNode) {
    return <div style={{ ...panelStyle, color: '#888', fontSize: 13 }}>No node selected</div>;
  }

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: '0 0 4px', fontSize: 14 }}>
        {selectedNode.displayName ?? selectedNode.type}
      </h3>
      {selectedNode.displayName && selectedNode.displayName !== selectedNode.type && (
        <div style={{ marginBottom: 8, fontSize: 10, color: '#666', wordBreak: 'break-all' }}>
          {selectedNode.type}
        </div>
      )}

      {(() => {
        const def = nodeRegistry.get(selectedNode.type);
        return def ? (
          <div style={{ marginBottom: 8, fontSize: 11, color: '#999' }}>
            {def.category}
            {def.isGeneric && <span style={{ color: '#f39c12', marginLeft: 4 }}>(generic)</span>}
          </div>
        ) : (
          <div style={{ marginBottom: 8, fontSize: 11, color: '#e67e22' }}>
            Unknown node type
          </div>
        );
      })()}

      <div style={{ marginBottom: 12, fontSize: 11, color: '#888' }}>
        ID: {selectedNode.id}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ color: '#888', marginBottom: 4 }}>Position</div>
        <div>x: {Math.round(selectedNode.position.x)}, y: {Math.round(selectedNode.position.y)}</div>
      </div>

      {selectedNode.inputs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: '#888', marginBottom: 4 }}>Inputs</div>
          {selectedNode.inputs.map((p) => (
            <div key={p.id} style={{ marginBottom: 2 }}>
              {p.name} <span style={{ color: '#666' }}>({p.dataType})</span>
            </div>
          ))}
        </div>
      )}

      {selectedNode.outputs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: '#888', marginBottom: 4 }}>Outputs</div>
          {selectedNode.outputs.map((p) => (
            <div key={p.id} style={{ marginBottom: 2 }}>
              {p.name} <span style={{ color: '#666' }}>({p.dataType})</span>
            </div>
          ))}
        </div>
      )}

      {selectedNode.params && Object.keys(selectedNode.params).length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: '#888', marginBottom: 4 }}>Parameters</div>
          {Object.entries(selectedNode.params).map(([key, value]) => (
            <div key={key} style={{ marginBottom: 6 }}>
              <label style={{ display: 'block', marginBottom: 2 }}>{key}</label>
              <input
                type={typeof value === 'boolean' ? 'checkbox' : 'text'}
                checked={typeof value === 'boolean' ? value : undefined}
                value={typeof value !== 'boolean' ? String(value) : undefined}
                onChange={(e) => {
                  const newVal =
                    typeof value === 'boolean'
                      ? e.target.checked
                      : typeof value === 'number'
                        ? Number(e.target.value)
                        : e.target.value;
                  updateParam(selectedNode.id, key, newVal);
                }}
                style={{
                  width: typeof value === 'boolean' ? 'auto' : '100%',
                  padding: '4px 6px',
                  background: '#2a2a3a',
                  border: '1px solid #444',
                  borderRadius: 4,
                  color: '#e0e0e0',
                  fontSize: 12,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>
      )}

      {connectedEdges.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: '#888', marginBottom: 4 }}>Connections ({connectedEdges.length})</div>
          {connectedEdges.map((edge) => {
            const isOutput = edge.from.nodeId === selectedNode.id;
            const otherNodeId = isOutput ? edge.to.nodeId : edge.from.nodeId;
            const otherNode = graph.nodes.find((n) => n.id === otherNodeId);
            const otherLabel = otherNode?.displayName ?? otherNode?.type ?? otherNodeId;
            const portId = isOutput ? edge.from.portId : edge.to.portId;
            return (
              <div key={edge.id} style={{ marginBottom: 2, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: isOutput ? '#2ecc71' : '#3498db' }}>
                  {isOutput ? '\u2192' : '\u2190'}
                </span>
                <span style={{ flex: 1 }}>{portId} \u2014 {otherLabel}</span>
                <button
                  onClick={() => deleteEdge(edge.id)}
                  title="Disconnect"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '0 2px',
                    lineHeight: 1,
                  }}
                >
                  \u00D7
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => deleteNode(selectedNode.id)}
        style={{
          width: '100%',
          padding: '8px',
          background: '#e74c3c',
          border: 'none',
          borderRadius: 4,
          color: 'white',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Delete Node
      </button>
    </div>
  );
}
