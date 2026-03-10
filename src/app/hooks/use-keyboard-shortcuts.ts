import { useEffect } from 'react';
import { useEditorStore } from '@/app/providers/editor-store';

export function useKeyboardShortcuts() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const selection = useEditorStore((s) => s.selection);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      if (isCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }

      if (isCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if not focused on an input element
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        for (const nodeId of selection) {
          deleteNode(nodeId);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, deleteNode, selection]);
}
