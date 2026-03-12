import { useEditorStore } from '@/app/providers/editor-store';
import { serialize } from '@/serialization/serialize';
import { deserialize } from '@/serialization/deserialize';
import { toast } from '@/shared/components/Toast';
import { confirmUnsavedChanges } from '@/shared/utils';
import { useCallback, useEffect, useRef } from 'react';

export function useFileIO() {
  const graph = useEditorStore((s) => s.graph);
  const documentName = useEditorStore((s) => s.documentName);
  const loadGraph = useEditorStore((s) => s.loadGraph);
  const setDirty = useEditorStore((s) => s.setDirty);
  const setStatusMessage = useEditorStore((s) => s.setStatusMessage);

  const handleExport = useCallback(() => {
    const doc = serialize(graph, documentName);
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName}.protoflux.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDirty(false);
  }, [graph, documentName, setDirty]);

  const handleImport = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const json = JSON.parse(text);
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
    [loadGraph, setStatusMessage],
  );

  return { handleExport, handleImport };
}

export function ImportButton() {
  const { handleImport } = useFileIO();
  const dirty = useEditorStore((s) => s.dirty);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = useCallback(() => {
    if (confirmUnsavedChanges(dirty)) {
      inputRef.current?.click();
    }
  }, [dirty]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.protoflux.json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImport(file);
          e.target.value = '';
        }}
      />
      <button
        onClick={handleClick}
        style={toolbarButtonStyle}
      >
        Import
      </button>
    </>
  );
}

export function ExportButton() {
  const { handleExport } = useFileIO();

  useEffect(() => {
    const handler = () => handleExport();
    window.addEventListener('protoflux-export', handler);
    return () => window.removeEventListener('protoflux-export', handler);
  }, [handleExport]);

  return (
    <button onClick={handleExport} style={toolbarButtonStyle}>
      Export
    </button>
  );
}

const toolbarButtonStyle: React.CSSProperties = {
  padding: '6px 12px',
  background: '#2a2a3a',
  border: '1px solid #444',
  borderRadius: 4,
  color: '#e0e0e0',
  cursor: 'pointer',
  fontSize: 12,
  fontFamily: 'monospace',
};
