import { useEditorStore } from '@/app/providers/editor-store';
import { ImportButton, ExportButton } from '@/features/file-io/FileIO';
import { BridgePanel } from '@/features/bridge-panel/BridgePanel';
import { nodeRegistry } from '@/editor-core/model/node-registry';
import { useMemo } from 'react';

export function Toolbar() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const dirty = useEditorStore((s) => s.dirty);
  const documentName = useEditorStore((s) => s.documentName);
  const undoAvailable = useEditorStore((s) => s.history.undoStack.length > 0);
  const redoAvailable = useEditorStore((s) => s.history.redoStack.length > 0);
  const datasetMeta = useMemo(() => nodeRegistry.getDatasetMeta(), []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        background: '#16162a',
        borderBottom: '1px solid #333',
        color: '#e0e0e0',
        fontSize: 13,
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 'bold', marginRight: 8 }}>
          ProtoFlux Editor
        </span>
        <span style={{ color: '#888' }}>
          {documentName}
          {dirty ? ' *' : ''}
        </span>
        {datasetMeta && (
          <span
            style={{ fontSize: 10, color: '#555' }}
            title={`Generated: ${datasetMeta.generatedAt}\nResonite: ${datasetMeta.resoniteVersion}\nNodes: ${datasetMeta.totalCount}`}
          >
            v{datasetMeta.resoniteVersion}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={undo} disabled={!undoAvailable} style={btnStyle(undoAvailable)}>
          Undo
        </button>
        <button onClick={redo} disabled={!redoAvailable} style={btnStyle(redoAvailable)}>
          Redo
        </button>
        <div style={{ width: 1, height: 20, background: '#444' }} />
        <ImportButton />
        <ExportButton />
        <div style={{ width: 1, height: 20, background: '#444' }} />
        <BridgePanel />
      </div>
    </div>
  );
}

function btnStyle(enabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    background: '#2a2a3a',
    border: '1px solid #444',
    borderRadius: 4,
    color: '#e0e0e0',
    cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.4,
    fontSize: 12,
    fontFamily: 'monospace',
  };
}
