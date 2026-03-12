import { useEffect, useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'error' | 'success';
  duration: number;
}

let addToastFn: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null;

const TOAST_DURATIONS: Record<ToastMessage['type'], number> = {
  info: 3000,
  success: 3000,
  error: 6000,
};

const MAX_TOASTS = 5;

export function toast(text: string, type: ToastMessage['type'] = 'info') {
  addToastFn?.({ text, type, duration: TOAST_DURATIONS[type] });
}

const TOAST_COLORS: Record<ToastMessage['type'], string> = {
  info: '#3498db',
  error: '#e74c3c',
  success: '#2ecc71',
};

export function ToastContainer() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (msg) => {
      const id = `${Date.now()}-${Math.random()}`;
      setMessages((prev) => [...prev, { ...msg, id }].slice(-MAX_TOASTS));
    };
    return () => {
      addToastFn = null;
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const timers = messages.map((msg) =>
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      }, msg.duration),
    );
    return () => timers.forEach(clearTimeout);
  }, [messages]);

  const dismiss = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  if (messages.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            background: '#1e1e2e',
            border: `1px solid ${TOAST_COLORS[msg.type]}`,
            borderLeft: `4px solid ${TOAST_COLORS[msg.type]}`,
            borderRadius: 6,
            padding: '10px 32px 10px 16px',
            color: '#e0e0e0',
            fontSize: 13,
            fontFamily: 'monospace',
            maxWidth: 360,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            position: 'relative',
            pointerEvents: 'auto',
          }}
        >
          {msg.text}
          <button
            onClick={() => dismiss(msg.id)}
            style={{
              position: 'absolute',
              top: 4,
              right: 6,
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 14,
              lineHeight: 1,
              padding: '2px 4px',
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
