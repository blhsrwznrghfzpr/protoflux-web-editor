import { useEditorStore } from '@/app/providers/editor-store';

const STATUS_TYPE_COLORS: Record<string, string> = {
  info: '#3498db',
  error: '#e74c3c',
  warning: '#f39c12',
};

export function StatusBar() {
  const graph = useEditorStore((s) => s.graph);
  const bridgeStatus = useEditorStore((s) => s.bridgeStatus);
  const statusMessage = useEditorStore((s) => s.statusMessage);
  const clearStatusMessage = useEditorStore((s) => s.clearStatusMessage);

  const BRIDGE_LABELS: Record<string, string> = {
    disconnected: 'Disconnected',
    connecting: 'Connecting...',
    connected: 'Connected',
    error: 'Connection Error',
  };

  const BRIDGE_COLORS: Record<string, string> = {
    disconnected: '#888',
    connecting: '#f39c12',
    connected: '#2ecc71',
    error: '#e74c3c',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '3px 12px',
        background: '#16162a',
        borderTop: '1px solid #333',
        color: '#888',
        fontSize: 11,
        fontFamily: 'monospace',
        minHeight: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>Nodes: {graph.nodes.length}</span>
        <span>Edges: {graph.edges.length}</span>
      </div>

      {statusMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: STATUS_TYPE_COLORS[statusMessage.type] ?? '#888',
          }}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={clearStatusMessage}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 11,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: BRIDGE_COLORS[bridgeStatus] ?? '#888',
          }}
        />
        <span>{BRIDGE_LABELS[bridgeStatus] ?? bridgeStatus}</span>
      </div>
    </div>
  );
}
