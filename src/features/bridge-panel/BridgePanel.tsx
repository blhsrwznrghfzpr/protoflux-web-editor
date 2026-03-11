import { useEditorStore } from '@/app/providers/editor-store';
import { ResoniteLinkBridge } from '@/bridge/resonite-link-bridge';
import { serialize } from '@/serialization/serialize';
import { deserialize } from '@/serialization/deserialize';
import { toast } from '@/shared/components/Toast';
import { withRetry } from '@/shared/utils';
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
  const loadGraph = useEditorStore((s) => s.loadGraph);
  const setStatusMessage = useEditorStore((s) => s.setStatusMessage);
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
      toast('Connected to Resonite', 'success');
    } catch {
      toast('Failed to connect to Resonite', 'error');
      setStatusMessage('Connection to Resonite failed', 'error');
    }
  }, [url, setBridge, setBridgeStatus, setStatusMessage]);

  const handleDisconnect = useCallback(async () => {
    await bridge.disconnect();
    toast('Disconnected from Resonite', 'info');
  }, [bridge]);

  const handlePush = useCallback(async () => {
    try {
      const doc = serialize(graph, documentName);
      await withRetry(() => bridge.pushGraph(doc));
      toast('Graph pushed to Resonite', 'success');
    } catch (err) {
      const msg = `Push failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      toast(msg, 'error');
      setStatusMessage(msg, 'error');
    }
  }, [bridge, graph, documentName, setStatusMessage]);

  const handlePull = useCallback(async () => {
    if (!bridge.pullGraph) {
      toast('Pull is not supported by this bridge', 'error');
      return;
    }
    try {
      const doc = await withRetry(() => bridge.pullGraph!());
      const { graph: pulledGraph, warnings } = deserialize(doc);
      loadGraph(pulledGraph, doc.meta.name);
      if (warnings.length > 0) {
        toast(`Pull completed with warnings: ${warnings.join(', ')}`, 'info');
      } else {
        toast('Graph pulled from Resonite', 'success');
      }
    } catch (err) {
      const msg = `Pull failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      toast(msg, 'error');
      setStatusMessage(msg, 'error');
    }
  }, [bridge, loadGraph, setStatusMessage]);

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
      <button
        onClick={handlePull}
        disabled={!isConnected}
        style={{
          ...btnStyle,
          opacity: isConnected ? 1 : 0.4,
        }}
      >
        Pull
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
