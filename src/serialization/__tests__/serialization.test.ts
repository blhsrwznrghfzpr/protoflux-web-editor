import { describe, it, expect } from 'vitest';
import { serialize } from '../serialize';
import { deserialize } from '../deserialize';
import { addNode } from '@/editor-core/commands/add-node';
import { connectEdge } from '@/editor-core/commands/connect-edge';
import type { GraphModel } from '@/shared/types';

describe('serialize / deserialize round-trip', () => {
  it('preserves graph structure', () => {
    let graph: GraphModel = { nodes: [], edges: [] };

    const r1 = addNode(graph, 'Constants/Float', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const r2 = addNode(graph, 'Math/Add', { x: 200, y: 0 });
    if ('error' in r2) throw new Error(r2.error);
    graph = r2.graph;

    const er = connectEdge(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    if ('error' in er) throw new Error(er.error);
    graph = er.graph;

    const doc = serialize(graph, 'Test');
    expect(doc.schemaVersion).toBe(1);
    expect(doc.meta.name).toBe('Test');
    expect(doc.graph.nodes).toHaveLength(2);
    expect(doc.graph.edges).toHaveLength(1);

    const { graph: restored, warnings } = deserialize(doc);
    expect(restored.nodes).toHaveLength(2);
    expect(restored.edges).toHaveLength(1);
    expect(warnings).toHaveLength(0);

    // Verify node types preserved
    expect(restored.nodes.map((n) => n.type).sort()).toEqual(['Constants/Float', 'Math/Add']);
  });

  it('rejects invalid JSON structure', () => {
    expect(() => deserialize({ foo: 'bar' })).toThrow();
  });

  it('rejects unsupported schema version', () => {
    expect(() =>
      deserialize({
        schemaVersion: 999,
        meta: { name: 'x', createdAt: '', updatedAt: '' },
        graph: { nodes: [], edges: [] },
      }),
    ).toThrow('Unsupported schema version');
  });
});
