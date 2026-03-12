import { describe, it, expect, beforeAll } from 'vitest';
import { serialize } from '../serialize';
import { deserialize } from '../deserialize';
import { migrateToLatest, CURRENT_VERSION } from '../migrations';
import { addNode } from '@/editor-core/commands/add-node';
import { connectEdge } from '@/editor-core/commands/connect-edge';
import { deleteNode } from '@/editor-core/commands/delete-node';
import { moveNode } from '@/editor-core/commands/move-node';
import { updateParam } from '@/editor-core/commands/update-param';
import { nodeRegistry } from '@/editor-core/model/node-registry';
import type { GraphModel } from '@/shared/types';

beforeAll(() => {
  nodeRegistry.register({
    type: 'Test/FloatConst',
    category: 'Test/Constants',
    inputs: [],
    outputs: [{ name: 'value', dataType: 'float' }],
    capabilities: { editable: true, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/Add',
    category: 'Test/Math',
    inputs: [
      { name: 'a', dataType: 'float' },
      { name: 'b', dataType: 'float' },
    ],
    outputs: [{ name: 'result', dataType: 'float' }],
    capabilities: { editable: false, renderable: true },
  });
});

describe('serialize / deserialize round-trip', () => {
  it('preserves graph structure', () => {
    let graph: GraphModel = { nodes: [], edges: [] };

    const r1 = addNode(graph, 'Test/FloatConst', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
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

    expect(restored.nodes.map((n) => n.type).sort()).toEqual(['Test/Add', 'Test/FloatConst']);
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
    ).toThrow('newer than supported version');
  });
});

describe('integration: Import → Edit → Export → re-Import', () => {
  it('preserves full edit cycle (add, connect, move, param, delete)', () => {
    // 1. Build a graph
    let graph: GraphModel = { nodes: [], edges: [] };

    const r1 = addNode(graph, 'Test/FloatConst', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
    if ('error' in r2) throw new Error(r2.error);
    graph = r2.graph;

    const r3 = addNode(graph, 'Test/FloatConst', { x: 0, y: 100 });
    if ('error' in r3) throw new Error(r3.error);
    graph = r3.graph;

    // Connect n1 -> n2.a
    const c1 = connectEdge(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    if ('error' in c1) throw new Error(c1.error);
    graph = c1.graph;

    // Connect n3 -> n2.b
    const c2 = connectEdge(graph, r3.node.id, r3.node.outputs[0].id, r2.node.id, r2.node.inputs[1].id);
    if ('error' in c2) throw new Error(c2.error);
    graph = c2.graph;

    // 2. Edit: move node, update params
    graph = moveNode(graph, r2.node.id, { x: 300, y: 50 });
    graph = updateParam(graph, r1.node.id, 'value', 42);

    // 3. Delete one node (n3) — cascading edges
    graph = deleteNode(graph, r3.node.id);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1); // only c1 survives

    // 4. Export
    const doc = serialize(graph, 'EditCycle');
    const json = JSON.parse(JSON.stringify(doc)); // simulate file I/O

    // 5. Re-import
    const { graph: restored, warnings } = deserialize(json);
    expect(warnings).toHaveLength(0);
    expect(restored.nodes).toHaveLength(2);
    expect(restored.edges).toHaveLength(1);

    // Verify position was preserved
    const addNode2 = restored.nodes.find((n) => n.type === 'Test/Add')!;
    expect(addNode2.position).toEqual({ x: 300, y: 50 });

    // Verify params were preserved
    const constNode = restored.nodes.find((n) => n.type === 'Test/FloatConst')!;
    expect(constNode.params?.value).toBe(42);

    // Verify edge integrity
    const edge = restored.edges[0];
    expect(edge.from.nodeId).toBe(constNode.id);
    expect(edge.to.nodeId).toBe(addNode2.id);
  });

  it('preserves unknown node raw data through round-trip', () => {
    // Simulate importing a document with an unknown node type
    const doc = {
      schemaVersion: 1,
      meta: { name: 'Unknown', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      graph: {
        nodes: [
          {
            id: 'u1',
            type: 'Custom/UnknownNode',
            position: { x: 50, y: 50 },
            inputs: [{ id: 'u1-in', name: 'data', dataType: 'Any' }],
            outputs: [{ id: 'u1-out', name: 'result', dataType: 'Any' }],
            params: { secret: 'keepme' },
          },
        ],
        edges: [],
      },
    };

    const { graph } = deserialize(doc);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].type).toBe('Custom/UnknownNode');
    expect(graph.nodes[0].params?.secret).toBe('keepme');

    // Re-export and verify
    const reExported = serialize(graph, 'Unknown');
    const { graph: restored } = deserialize(reExported);
    expect(restored.nodes[0].type).toBe('Custom/UnknownNode');
    expect(restored.nodes[0].params?.secret).toBe('keepme');
  });
});

describe('migration framework', () => {
  it('passes through current version documents unchanged', () => {
    const doc = {
      schemaVersion: CURRENT_VERSION,
      meta: { name: 'test', createdAt: '', updatedAt: '' },
      graph: { nodes: [], edges: [] },
    };
    const result = migrateToLatest(doc) as Record<string, unknown>;
    expect(result.schemaVersion).toBe(CURRENT_VERSION);
  });

  it('rejects non-object input', () => {
    expect(() => migrateToLatest('string')).toThrow('expected an object');
    expect(() => migrateToLatest(null)).toThrow('expected an object');
    expect(() => migrateToLatest(42)).toThrow('expected an object');
  });

  it('treats documents without schemaVersion as v1', () => {
    const doc = {
      meta: { name: 'legacy', createdAt: '', updatedAt: '' },
      graph: { nodes: [], edges: [] },
    };
    const result = migrateToLatest(doc) as Record<string, unknown>;
    expect(result.schemaVersion).toBe(1);
  });

  it('rejects invalid schema version values', () => {
    expect(() => migrateToLatest({ schemaVersion: 'bad' })).toThrow('Invalid schema version');
    expect(() => migrateToLatest({ schemaVersion: 0 })).toThrow('Invalid schema version');
    expect(() => migrateToLatest({ schemaVersion: -1 })).toThrow('Invalid schema version');
    expect(() => migrateToLatest({ schemaVersion: 1.5 })).toThrow('Invalid schema version');
  });

  it('rejects future versions with helpful message', () => {
    expect(() =>
      migrateToLatest({ schemaVersion: 999 }),
    ).toThrow('Please update the editor');
  });

  it('adds unknownRaw to unknown nodes during deserialization', () => {
    const doc = {
      schemaVersion: 1,
      meta: { name: 'x', createdAt: '', updatedAt: '' },
      graph: {
        nodes: [{
          id: 'n1',
          type: 'Nonexistent/Node',
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
        }],
        edges: [],
      },
    };
    const { graph, warnings } = deserialize(doc);
    expect(graph.nodes[0].unknownRaw).toBeDefined();
    expect(warnings.some((w) => w.includes('Unknown node type'))).toBe(true);
  });

  it('does not overwrite existing unknownRaw', () => {
    const doc = {
      schemaVersion: 1,
      meta: { name: 'x', createdAt: '', updatedAt: '' },
      graph: {
        nodes: [{
          id: 'n1',
          type: 'Nonexistent/Node',
          position: { x: 0, y: 0 },
          inputs: [],
          outputs: [],
          unknownRaw: { custom: 'data' },
        }],
        edges: [],
      },
    };
    const { graph } = deserialize(doc);
    expect(graph.nodes[0].unknownRaw).toEqual({ custom: 'data' });
  });
});
