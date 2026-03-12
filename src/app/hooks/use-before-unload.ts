import { useEffect } from 'react';
import { useEditorStore } from '@/app/providers/editor-store';

export function useBeforeUnload() {
  const dirty = useEditorStore((s) => s.dirty);
  const documentName = useEditorStore((s) => s.documentName);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // Sync browser tab title with document state
  useEffect(() => {
    const prefix = dirty ? '\u25CF ' : '';
    document.title = `${prefix}${documentName} - ProtoFlux Editor`;
  }, [dirty, documentName]);
}
