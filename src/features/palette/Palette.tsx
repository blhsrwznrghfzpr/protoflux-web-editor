import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { nodeRegistry, type NodeDefinition } from '@/editor-core/model/node-registry';
import { useEditorStore } from '@/app/providers/editor-store';

/** 検索インデックス: 初回のみ構築しキャッシュ */
interface SearchEntry {
  def: NodeDefinition;
  /** 小文字化した検索対象テキスト（displayName + type + category） */
  searchText: string;
}

let cachedIndex: SearchEntry[] | null = null;
function getSearchIndex(): SearchEntry[] {
  if (cachedIndex) return cachedIndex;
  const placeable = nodeRegistry.listPlaceable();
  cachedIndex = placeable.map((def) => ({
    def,
    searchText: `${def.displayName ?? ''} ${def.type} ${def.category}`.toLowerCase(),
  }));
  return cachedIndex;
}

const VISIBLE_LIMIT = 200;

export function Palette() {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const addNode = useEditorStore((s) => s.addNode);
  const scrollRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => getSearchIndex(), []);

  const isSearching = search.length > 0;

  const filtered = useMemo(() => {
    if (!isSearching) return index;
    const lower = search.toLowerCase();
    const terms = lower.split(/\s+/).filter(Boolean);
    return index.filter((entry) =>
      terms.every((term) => entry.searchText.includes(term)),
    );
  }, [index, search, isSearching]);

  const grouped = useMemo(() => {
    const map = new Map<string, NodeDefinition[]>();
    for (const entry of filtered) {
      const arr = map.get(entry.def.category) ?? [];
      arr.push(entry.def);
      map.set(entry.def.category, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const totalCount = filtered.length;
  const truncated = totalCount > VISIBLE_LIMIT && !isSearching;

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  // 検索中はカテゴリを自動展開
  useEffect(() => {
    if (isSearching) {
      setExpandedCategories(new Set(grouped.map(([cat]) => cat)));
    }
  }, [isSearching, grouped]);

  const handleAdd = (type: string) => {
    const x = 200 + Math.random() * 200;
    const y = 200 + Math.random() * 200;
    addNode(type, { x, y });
  };

  return (
    <div
      style={{
        width: 240,
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
          placeholder="Search nodes... (Ctrl+F)"
          data-palette-search
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
        <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
          {totalCount.toLocaleString()} nodes
          {isSearching ? ' found' : ' available'}
        </div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
        {grouped.map(([category, defs]) => {
          const isExpanded = expandedCategories.has(category);
          return (
            <div key={category} style={{ marginBottom: 4 }}>
              <button
                onClick={() => toggleCategory(category)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  width: '100%',
                  padding: '4px 4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  color: '#999',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  textAlign: 'left',
                  fontFamily: 'monospace',
                }}
              >
                <span style={{ fontSize: 8, width: 10, display: 'inline-block' }}>
                  {isExpanded ? '\u25BC' : '\u25B6'}
                </span>
                {category}
                <span style={{ color: '#555', marginLeft: 'auto', textTransform: 'none' }}>
                  ({defs.length})
                </span>
              </button>
              {isExpanded && (
                <div style={{ marginLeft: 4 }}>
                  {defs.map((def) => (
                    <button
                      key={def.type}
                      onClick={() => handleAdd(def.type)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/protoflux-node-type', def.type);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      title={def.type}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '5px 8px',
                        marginBottom: 1,
                        background: '#2a2a3a',
                        border: '1px solid transparent',
                        borderRadius: 4,
                        color: '#d0d0d0',
                        cursor: 'grab',
                        textAlign: 'left',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#7c3aed';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      {def.displayName ?? def.type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {truncated && (
          <div style={{ fontSize: 11, color: '#666', padding: 8, textAlign: 'center' }}>
            Use search to find specific nodes
          </div>
        )}
      </div>
    </div>
  );
}
