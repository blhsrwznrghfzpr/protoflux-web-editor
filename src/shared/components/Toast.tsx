import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'info' | 'error' | 'success';
}

let addToastFn: ((msg: Omit<ToastMessage, 'id'>) => void) | null = null;

export function toast(text: string, type: ToastMessage['type'] = 'info') {
  addToastFn?.({ text, type });
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
      setMessages((prev) => [...prev, { ...msg, id }]);
    };
    return () => {
      addToastFn = null;
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setTimeout(() => {
      setMessages((prev) => prev.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
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
            padding: '10px 16px',
            color: '#e0e0e0',
            fontSize: 13,
            fontFamily: 'monospace',
            maxWidth: 360,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
}
