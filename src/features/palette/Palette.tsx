import { useState, useMemo, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Fuse from 'fuse.js';
import { nodeRegistry, type NodeDefinition } from '@/editor-core/model/node-registry';
import { useEditorStore } from '@/app/providers/editor-store';

/** 検索インデックス: 初回のみ構築しキャッシュ */
interface SearchEntry {
  def: NodeDefinition;
  searchText: string;
}

let cachedIndex: SearchEntry[] | null = null;
let cachedFuse: Fuse<SearchEntry> | null = null;

function getSearchIndex(): SearchEntry[] {
  if (cachedIndex) return cachedIndex;
  const placeable = nodeRegistry.listPlaceable();
  cachedIndex = placeable.map((def) => ({
    def,
    searchText: `${def.displayName ?? ''} ${def.type} ${def.category}`.toLowerCase(),
  }));
  return cachedIndex;
}

function getFuse(index: SearchEntry[]): Fuse<SearchEntry> {
  if (cachedFuse) return cachedFuse;
  cachedFuse = new Fuse(index, {
    keys: ['def.displayName', 'def.type', 'def.category'],
    threshold: 0.4,
    ignoreLocation: true,
    includeScore: true,
  });
  return cachedFuse;
}

type FlatItem =
  | { kind: 'category'; category: string; count: number }
  | { kind: 'node'; def: NodeDefinition };

const CATEGORY_HEIGHT = 28;
const NODE_HEIGHT = 32;

export function Palette() {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const addNode = useEditorStore((s) => s.addNode);
  const viewport = useEditorStore((s) => s.viewport);
  const scrollRef = useRef<HTMLDivElement>(null);

  const index = useMemo(() => getSearchIndex(), []);
  const isSearching = search.length > 0;

  const fuse = useMemo(() => getFuse(index), [index]);

  const filtered = useMemo(() => {
    if (!isSearching) return index;
    const query = search.trim();
    // Use substring match first; fall back to fuzzy if no results
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const exact = index.filter((entry) =>
      terms.every((term) => entry.searchText.includes(term)),
    );
    if (exact.length > 0) return exact;
    // Fuzzy search via Fuse.js
    return fuse.search(query, { limit: 100 }).map((r) => r.item);
  }, [index, fuse, search, isSearching]);

  const grouped = useMemo(() => {
    const map = new Map<string, NodeDefinition[]>();
    for (const entry of filtered) {
      const arr = map.get(entry.def.category) ?? [];
      arr.push(entry.def);
      map.set(entry.def.category, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // 検索中は全カテゴリ展開
  const effectiveExpanded = useMemo(() => {
    if (isSearching) return new Set(grouped.map(([cat]) => cat));
    return expandedCategories;
  }, [isSearching, grouped, expandedCategories]);

  // カテゴリヘッダー + 展開中のノードをフラットリストにして仮想化
  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];
    for (const [category, defs] of grouped) {
      items.push({ kind: 'category', category, count: defs.length });
      if (effectiveExpanded.has(category)) {
        for (const def of defs) {
          items.push({ kind: 'node', def });
        }
      }
    }
    return items;
  }, [grouped, effectiveExpanded]);

  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (flatItems[i].kind === 'category' ? CATEGORY_HEIGHT : NODE_HEIGHT),
    overscan: 20,
  });

  const totalCount = filtered.length;

  const toggleCategory = useCallback((cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const handleAdd = (type: string) => {
    // Place at approximate viewport center with slight random offset to avoid stacking
    const centerX = (-viewport.x + window.innerWidth / 2) / viewport.zoom;
    const centerY = (-viewport.y + window.innerHeight / 2) / viewport.zoom;
    const x = centerX + (Math.random() - 0.5) * 100;
    const y = centerY + (Math.random() - 0.5) * 100;
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
        <div style={{ fontSize: 10, color: '#666', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>
            {totalCount.toLocaleString()} nodes
            {isSearching ? ' found' : ' available'}
          </span>
          {!isSearching && (
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button
                onClick={() => setExpandedCategories(new Set(grouped.map(([cat]) => cat)))}
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 10, padding: 0 }}
                title="Expand all"
              >
                [+]
              </button>
              <button
                onClick={() => setExpandedCategories(new Set())}
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 10, padding: 0 }}
                title="Collapse all"
              >
                [-]
              </button>
            </span>
          )}
        </div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '0 8px 8px' }}>
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((vItem) => {
            const item = flatItems[vItem.index];
            return (
              <div
                key={vItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: vItem.size,
                  transform: `translateY(${vItem.start}px)`,
                }}
              >
                {item.kind === 'category' ? (
                  <button
                    onClick={() => toggleCategory(item.category)}
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
                      {effectiveExpanded.has(item.category) ? '\u25BC' : '\u25B6'}
                    </span>
                    {item.category}
                    <span style={{ color: '#555', marginLeft: 'auto', textTransform: 'none' }}>
                      ({item.count})
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleAdd(item.def.type)}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/protoflux-node-type', item.def.type);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    title={item.def.type}
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
                    {item.def.displayName ?? item.def.type}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
