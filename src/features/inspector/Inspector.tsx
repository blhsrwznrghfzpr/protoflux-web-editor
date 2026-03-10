import { useEditorStore } from '@/app/providers/editor-store';
import { useMemo } from 'react';

export function Inspector() {
  const graph = useEditorStore((s) => s.graph);
  const selection = useEditorStore((s) => s.selection);
  const updateParam = useEditorStore((s) => s.updateParam);
  const deleteNode = useEditorStore((s) => s.deleteNode);

  const selectedNode = useMemo(() => {
    if (selection.length !== 1) return null;
    return graph.nodes.find((n) => n.id === selection[0]) ?? null;
  }, [graph.nodes, selection]);

  if (!selectedNode) {
    return (
      <div
        style={{
          width: 240,
          background: '#1a1a2e',
          borderLeft: '1px solid #333',
          padding: 16,
          color: '#888',
          fontSize: 13,
        }}
      >
        {selection.length === 0 ? 'No node selected' : `${selection.length} nodes selected`}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 240,
        background: '#1a1a2e',
        borderLeft: '1px solid #333',
        padding: 16,
        color: '#e0e0e0',
        fontSize: 12,
        fontFamily: 'monospace',
        overflow: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>{selectedNode.type}</h3>

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
