import { useState, useEffect } from 'react';

const SHORTCUTS = [
  { keys: 'Ctrl+Z', action: 'Undo' },
  { keys: 'Ctrl+Shift+Z / Ctrl+Y', action: 'Redo' },
  { keys: 'Ctrl+C', action: 'Copy selected nodes' },
  { keys: 'Ctrl+V', action: 'Paste nodes' },
  { keys: 'Ctrl+D', action: 'Duplicate selected nodes' },
  { keys: 'Ctrl+A', action: 'Select all nodes' },
  { keys: 'Ctrl+S', action: 'Export graph' },
  { keys: 'Ctrl+F', action: 'Focus palette search' },
  { keys: 'Delete / Backspace', action: 'Delete selected nodes' },
  { keys: 'Escape', action: 'Deselect all' },
  { keys: 'Shift+1', action: 'Zoom to fit all' },
  { keys: 'Shift+2', action: 'Zoom to selection' },
  { keys: 'Right-click canvas', action: 'Quick node search' },
  { keys: '?', action: 'Toggle this help' },
];

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '?') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          background: '#1e1e2e',
          border: '1px solid #444',
          borderRadius: 8,
          padding: 24,
          minWidth: 340,
          maxWidth: 460,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          fontFamily: 'monospace',
          color: '#e0e0e0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 16px', fontSize: 16 }}>Keyboard Shortcuts</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys}>
                <td
                  style={{
                    padding: '4px 12px 4px 0',
                    fontSize: 12,
                    color: '#888',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <kbd
                    style={{
                      background: '#2a2a3a',
                      border: '1px solid #555',
                      borderRadius: 3,
                      padding: '2px 6px',
                      fontSize: 11,
                      color: '#ccc',
                    }}
                  >
                    {s.keys}
                  </kbd>
                </td>
                <td style={{ padding: '4px 0', fontSize: 12 }}>{s.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 16, fontSize: 11, color: '#666', textAlign: 'center' }}>
          Press ? or click outside to close
        </div>
      </div>
    </div>
  );
}
