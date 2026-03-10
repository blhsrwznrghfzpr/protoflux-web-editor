import { describe, it, expect, beforeAll } from 'vitest';
import { addNode } from '../commands/add-node';
import { connectEdge } from '../commands/connect-edge';
import { deleteNode } from '../commands/delete-node';
import { moveNode } from '../commands/move-node';
import { updateParam } from '../commands/update-param';
import { nodeRegistry } from '../model/node-registry';
import type { GraphModel } from '@/shared/types';

const emptyGraph: GraphModel = { nodes: [], edges: [] };

beforeAll(() => {
  nodeRegistry.register({
    type: 'Test/FloatConst',
    category: 'Test/Constants',
    inputs: [],
    outputs: [{ name: 'value', dataType: 'Float' }],
    capabilities: { editable: true, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/Add',
    category: 'Test/Math',
    inputs: [
      { name: 'a', dataType: 'Float' },
      { name: 'b', dataType: 'Float' },
    ],
    outputs: [{ name: 'result', dataType: 'Float' }],
    capabilities: { editable: false, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/BoolConst',
    category: 'Test/Constants',
    inputs: [],
    outputs: [{ name: 'value', dataType: 'Bool' }],
    capabilities: { editable: true, renderable: true },
  });
});

describe('addNode', () => {
  it('adds a registered node with ports', () => {
    const result = addNode(emptyGraph, 'Test/Add', { x: 100, y: 200 });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.graph.nodes).toHaveLength(1);
      expect(result.node.type).toBe('Test/Add');
      expect(result.node.inputs).toHaveLength(2);
      expect(result.node.outputs).toHaveLength(1);
      expect(result.node.position).toEqual({ x: 100, y: 200 });
    }
  });

  it('adds an unknown node with unknownRaw', () => {
    const result = addNode(emptyGraph, 'Unknown/Foo', { x: 0, y: 0 });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.node.unknownRaw).toBeDefined();
    }
  });
});

describe('connectEdge', () => {
  it('connects two compatible ports', () => {
    let graph = emptyGraph;
    const r1 = addNode(graph, 'Test/FloatConst', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
    if ('error' in r2) throw new Error(r2.error);
    graph = r2.graph;

    const fromPort = r1.node.outputs[0].id;
    const toPort = r2.node.inputs[0].id;

    const result = connectEdge(graph, r1.node.id, fromPort, r2.node.id, toPort);
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.graph.edges).toHaveLength(1);
    }
  });

  it('rejects type-mismatched connection', () => {
    let graph = emptyGraph;
    const r1 = addNode(graph, 'Test/BoolConst', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
    if ('error' in r2) throw new Error(r2.error);
    graph = r2.graph;

    const result = connectEdge(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    expect('error' in result).toBe(true);
  });
});

describe('deleteNode', () => {
  it('removes node and its edges', () => {
    let graph = emptyGraph;
    const r1 = addNode(graph, 'Test/FloatConst', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
    if ('error' in r2) throw new Error(r2.error);
    graph = r2.graph;

    const edgeResult = connectEdge(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    if ('error' in edgeResult) throw new Error(edgeResult.error);
    graph = edgeResult.graph;

    const result = deleteNode(graph, r1.node.id);
    expect(result.nodes).toHaveLength(1);
    expect(result.edges).toHaveLength(0);
  });
});

describe('moveNode', () => {
  it('updates node position', () => {
    const r = addNode(emptyGraph, 'Test/Add', { x: 0, y: 0 });
    if ('error' in r) throw new Error(r.error);
    const moved = moveNode(r.graph, r.node.id, { x: 50, y: 100 });
    expect(moved.nodes[0].position).toEqual({ x: 50, y: 100 });
  });
});

describe('updateParam', () => {
  it('updates a parameter', () => {
    const r = addNode(emptyGraph, 'Test/FloatConst', { x: 0, y: 0 });
    if ('error' in r) throw new Error(r.error);
    const updated = updateParam(r.graph, r.node.id, 'value', 42);
    expect(updated.nodes[0].params?.value).toBe(42);
  });
});
