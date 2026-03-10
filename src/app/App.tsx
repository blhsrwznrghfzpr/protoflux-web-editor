import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from '@/features/canvas/Canvas';
import { Palette } from '@/features/palette/Palette';
import { Inspector } from '@/features/inspector/Inspector';
import { Toolbar } from '@/features/toolbar/Toolbar';
import { ToastContainer } from '@/shared/components/Toast';
import { useKeyboardShortcuts } from './hooks/use-keyboard-shortcuts';
import { useBeforeUnload } from './hooks/use-before-unload';

function EditorLayout() {
  useKeyboardShortcuts();
  useBeforeUnload();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        background: '#0d0d1a',
        color: '#e0e0e0',
        fontFamily: 'monospace',
      }}
    >
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Palette />
        <Canvas />
        <Inspector />
      </div>
    </div>
  );
}

export function App() {
  return (
    <ReactFlowProvider>
      <EditorLayout />
      <ToastContainer />
    </ReactFlowProvider>
  );
}
