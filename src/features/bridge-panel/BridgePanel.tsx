import { useEditorStore } from '@/app/providers/editor-store';
import { ResoniteLinkBridge } from '@/bridge/resonite-link-bridge';
import { serialize } from '@/serialization/serialize';
import { useCallback, useEffect, useState } from 'react';

const STATUS_COLORS: Record<string, string> = {
  disconnected: '#888',
  connecting: '#f39c12',
  connected: '#2ecc71',
  error: '#e74c3c',
};

export function BridgePanel() {
  const bridge = useEditorStore((s) => s.bridge);
  const bridgeStatus = useEditorStore((s) => s.bridgeStatus);
  const setBridge = useEditorStore((s) => s.setBridge);
  const setBridgeStatus = useEditorStore((s) => s.setBridgeStatus);
  const graph = useEditorStore((s) => s.graph);
  const documentName = useEditorStore((s) => s.documentName);
  const [url, setUrl] = useState('ws://localhost:11404');

  useEffect(() => {
    const unsub = bridge.onStatusChange(setBridgeStatus);
    return unsub;
  }, [bridge, setBridgeStatus]);

  const handleConnect = useCallback(async () => {
    const newBridge = new ResoniteLinkBridge(url);
    setBridge(newBridge);
    newBridge.onStatusChange(setBridgeStatus);
    try {
      await newBridge.connect();
    } catch {
      // Status is set via onStatusChange
    }
  }, [url, setBridge, setBridgeStatus]);

  const handleDisconnect = useCallback(async () => {
    await bridge.disconnect();
  }, [bridge]);

  const handlePush = useCallback(async () => {
    try {
      const doc = serialize(graph, documentName);
      await bridge.pushGraph(doc);
    } catch (err) {
      alert(`Push failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [bridge, graph, documentName]);

  const isConnected = bridgeStatus === 'connected';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: STATUS_COLORS[bridgeStatus] ?? '#888',
        }}
        title={bridgeStatus}
      />
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={bridgeStatus === 'connected' || bridgeStatus === 'connecting'}
        style={{
          padding: '4px 6px',
          background: '#2a2a3a',
          border: '1px solid #444',
          borderRadius: 4,
          color: '#e0e0e0',
          fontSize: 11,
          width: 160,
        }}
      />
      {isConnected ? (
        <button onClick={handleDisconnect} style={btnStyle}>
          Disconnect
        </button>
      ) : (
        <button
          onClick={handleConnect}
          disabled={bridgeStatus === 'connecting'}
          style={btnStyle}
        >
          Connect
        </button>
      )}
      <button
        onClick={handlePush}
        disabled={!isConnected}
        style={{
          ...btnStyle,
          opacity: isConnected ? 1 : 0.4,
        }}
      >
        Push
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: '#2a2a3a',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#e0e0e0',
  cursor: 'pointer',
  fontSize: 11,
};
