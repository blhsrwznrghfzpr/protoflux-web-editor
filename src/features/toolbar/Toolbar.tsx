import { useEditorStore } from '@/app/providers/editor-store';
import { ImportButton, ExportButton } from '@/features/file-io/FileIO';
import { BridgePanel } from '@/features/bridge-panel/BridgePanel';
import { nodeRegistry } from '@/editor-core/model/node-registry';
import { confirmUnsavedChanges } from '@/shared/utils';
import { useMemo, useState, useRef, useCallback, type KeyboardEvent } from 'react';

export function Toolbar() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const dirty = useEditorStore((s) => s.dirty);
  const documentName = useEditorStore((s) => s.documentName);
  const setDocumentName = useEditorStore((s) => s.setDocumentName);
  const newGraph = useEditorStore((s) => s.newGraph);
  const undoAvailable = useEditorStore((s) => s.history.undoStack.length > 0);
  const redoAvailable = useEditorStore((s) => s.history.redoStack.length > 0);
  const datasetMeta = useMemo(() => nodeRegistry.getDatasetMeta(), []);
  const [editingName, setEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const commitName = useCallback(() => {
    const val = nameInputRef.current?.value.trim();
    if (val) setDocumentName(val);
    setEditingName(false);
  }, [setDocumentName]);

  const handleNameKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') commitName();
    if (e.key === 'Escape') setEditingName(false);
  }, [commitName]);

  const handleNew = useCallback(() => {
    if (confirmUnsavedChanges(dirty)) {
      newGraph();
    }
  }, [dirty, newGraph]);

  return (
    <nav
      role="toolbar"
      aria-label="Editor toolbar"
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
        {editingName ? (
          <input
            ref={nameInputRef}
            autoFocus
            defaultValue={documentName}
            onBlur={commitName}
            onKeyDown={handleNameKeyDown}
            style={{
              background: '#2a2a3a',
              border: '1px solid #7c3aed',
              borderRadius: 4,
              color: '#e0e0e0',
              padding: '2px 6px',
              fontSize: 13,
              fontFamily: 'monospace',
              width: 160,
            }}
          />
        ) : (
          <span
            onClick={() => setEditingName(true)}
            title="Click to rename"
            style={{ color: '#888', cursor: 'pointer' }}
          >
            {documentName}
            {dirty ? ' *' : ''}
          </span>
        )}
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
        <button onClick={undo} disabled={!undoAvailable} style={btnStyle(undoAvailable)} aria-label="Undo (Ctrl+Z)">
          Undo
        </button>
        <button onClick={redo} disabled={!redoAvailable} style={btnStyle(redoAvailable)} aria-label="Redo (Ctrl+Shift+Z)">
          Redo
        </button>
        <div style={{ width: 1, height: 20, background: '#444' }} aria-hidden />
        <button onClick={handleNew} style={btnStyle(true)} aria-label="New graph">
          New
        </button>
        <ImportButton />
        <ExportButton />
        <div style={{ width: 1, height: 20, background: '#444' }} />
        <BridgePanel />
      </div>
    </nav>
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
