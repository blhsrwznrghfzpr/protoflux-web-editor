import { describe, it, expect } from 'vitest';
import { addNode } from '../commands/add-node';
import { connectEdge } from '../commands/connect-edge';
import { deleteNode } from '../commands/delete-node';
import { moveNode } from '../commands/move-node';
import { updateParam } from '../commands/update-param';
import type { GraphModel } from '@/shared/types';

const emptyGraph: GraphModel = { nodes: [], edges: [] };

describe('addNode', () => {
  it('adds a registered node with ports', () => {
    const result = addNode(emptyGraph, 'Math/Add', { x: 100, y: 200 });
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.graph.nodes).toHaveLength(1);
      expect(result.node.type).toBe('Math/Add');
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
    const r1 = addNode(graph, 'Constants/Float', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const r2 = addNode(graph, 'Math/Add', { x: 200, y: 0 });
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
    const r1 = addNode(graph, 'Constants/Bool', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const r2 = addNode(graph, 'Math/Add', { x: 200, y: 0 });
    if ('error' in r2) throw new Error(r2.error);
    graph = r2.graph;

    const result = connectEdge(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    expect('error' in result).toBe(true);
  });
});

describe('deleteNode', () => {
  it('removes node and its edges', () => {
    let graph = emptyGraph;
    const r1 = addNode(graph, 'Constants/Float', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const r2 = addNode(graph, 'Math/Add', { x: 200, y: 0 });
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
    const r = addNode(emptyGraph, 'Math/Add', { x: 0, y: 0 });
    if ('error' in r) throw new Error(r.error);
    const moved = moveNode(r.graph, r.node.id, { x: 50, y: 100 });
    expect(moved.nodes[0].position).toEqual({ x: 50, y: 100 });
  });
});

describe('updateParam', () => {
  it('updates a parameter', () => {
    const r = addNode(emptyGraph, 'Constants/Float', { x: 0, y: 0 });
    if ('error' in r) throw new Error(r.error);
    const updated = updateParam(r.graph, r.node.id, 'value', 42);
    expect(updated.nodes[0].params?.value).toBe(42);
  });
});
