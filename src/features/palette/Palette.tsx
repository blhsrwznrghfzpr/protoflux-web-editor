import { useState, useMemo } from 'react';
import { nodeRegistry } from '@/editor-core/model/node-registry';
import { useEditorStore } from '@/app/providers/editor-store';

export function Palette() {
  const [search, setSearch] = useState('');
  const addNode = useEditorStore((s) => s.addNode);
  const definitions = useMemo(() => nodeRegistry.list(), []);
  const filtered = useMemo(() => {
    if (!search) return definitions;
    const lower = search.toLowerCase();
    return definitions.filter(
      (d) =>
        d.type.toLowerCase().includes(lower) ||
        d.category.toLowerCase().includes(lower),
    );
  }, [definitions, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const def of filtered) {
      const arr = map.get(def.category) ?? [];
      arr.push(def);
      map.set(def.category, arr);
    }
    return map;
  }, [filtered]);

  const handleAdd = (type: string) => {
    const x = 200 + Math.random() * 200;
    const y = 200 + Math.random() * 200;
    addNode(type, { x, y });
  };

  return (
    <div
      style={{
        width: 220,
        background: '#1a1a2e',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 8 }}>
        <input
          type="text"
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            background: '#2a2a3a',
            border: '1px solid #444',
            borderRadius: 4,
            color: '#e0e0e0',
            fontSize: 12,
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
        {Array.from(grouped.entries()).map(([category, defs]) => (
          <div key={category} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              {category}
            </div>
            {defs.map((def) => (
              <button
                key={def.type}
                onClick={() => handleAdd(def.type)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 8px',
                  marginBottom: 2,
                  background: '#2a2a3a',
                  border: '1px solid transparent',
                  borderRadius: 4,
                  color: '#d0d0d0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#7c3aed';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                {def.type.split('/').pop()}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
