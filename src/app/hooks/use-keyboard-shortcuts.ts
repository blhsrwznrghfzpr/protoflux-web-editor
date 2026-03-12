import { useEffect } from 'react';
import { useEditorStore } from '@/app/providers/editor-store';

export function useKeyboardShortcuts() {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const setSelection = useEditorStore((s) => s.setSelection);
  const selection = useEditorStore((s) => s.selection);
  const graph = useEditorStore((s) => s.graph);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const tag = (e.target as HTMLElement).tagName;
      const isInputFocused = tag === 'INPUT' || tag === 'TEXTAREA';

      // Undo: Ctrl+Z
      if (isCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z
      if (isCtrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }

      // Redo: Ctrl+Y
      if (isCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Save/Export: Ctrl+S
      if (isCtrl && e.key === 's') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('protoflux-export'));
        return;
      }

      // Copy: Ctrl+C
      if (isCtrl && e.key === 'c' && !isInputFocused) {
        e.preventDefault();
        useEditorStore.getState().copySelected();
        return;
      }

      // Paste: Ctrl+V
      if (isCtrl && e.key === 'v' && !isInputFocused) {
        e.preventDefault();
        useEditorStore.getState().pasteClipboard();
        return;
      }

      // Duplicate: Ctrl+D
      if (isCtrl && e.key === 'd' && !isInputFocused) {
        e.preventDefault();
        useEditorStore.getState().duplicateSelected();
        return;
      }

      // Search focus: Ctrl+F → パレットの検索欄にフォーカス
      if (isCtrl && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          '[data-palette-search]',
        );
        searchInput?.focus();
        searchInput?.select();
        return;
      }

      // Select All: Ctrl+A （入力欄以外）
      if (isCtrl && e.key === 'a' && !isInputFocused) {
        e.preventDefault();
        setSelection(graph.nodes.map((n) => n.id));
        return;
      }

      // Escape: 選択解除
      if (e.key === 'Escape') {
        setSelection([]);
        // 検索欄からもフォーカスを外す
        if (isInputFocused) {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      // Delete / Backspace: 選択ノード削除（batch: 1回のhistory entry）
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isInputFocused) return;
        if (selection.length > 1) {
          deleteNodes(selection);
        } else if (selection.length === 1) {
          deleteNode(selection[0]);
        }
        return;
      }

      // Zoom to fit all: Shift+1
      if (e.shiftKey && e.code === 'Digit1' && !isInputFocused) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('protoflux-fit-view'));
        return;
      }

      // Zoom to selection: Shift+2
      if (e.shiftKey && e.code === 'Digit2' && !isInputFocused) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('protoflux-fit-selection'));
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, deleteNode, deleteNodes, setSelection, selection, graph.nodes]);
}
