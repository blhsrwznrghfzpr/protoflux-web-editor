import { useEffect } from 'react';
import { useEditorStore } from '@/app/providers/editor-store';

export function useBeforeUnload() {
  const dirty = useEditorStore((s) => s.dirty);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
