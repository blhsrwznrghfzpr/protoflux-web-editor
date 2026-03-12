import { describe, it, expect, beforeAll } from 'vitest';
import { addNode } from '../commands/add-node';
import { connectEdge } from '../commands/connect-edge';
import { deleteNode } from '../commands/delete-node';
import { moveNode } from '../commands/move-node';
import { updateParam } from '../commands/update-param';
import { copyNodes, pasteNodes } from '../commands/copy-paste';
import { duplicateNodes } from '../commands/duplicate-node';
import { nodeRegistry } from '../model/node-registry';
import type { GraphModel } from '@/shared/types';

const emptyGraph: GraphModel = { nodes: [], edges: [] };

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
  nodeRegistry.register({
    type: 'Test/BoolConst',
    category: 'Test/Constants',
    inputs: [],
    outputs: [{ name: 'value', dataType: 'bool' }],
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

describe('copyNodes / pasteNodes', () => {
  it('copies and pastes nodes with new IDs', () => {
    let graph = emptyGraph;
    const r1 = addNode(graph, 'Test/FloatConst', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const clipboard = copyNodes(graph, [r1.node.id]);
    expect(clipboard.nodes).toHaveLength(1);

    const result = pasteNodes(graph, clipboard);
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.newNodeIds).toHaveLength(1);
    // New node should have a different ID
    expect(result.newNodeIds[0]).not.toBe(r1.node.id);
    // Position should be offset
    const pasted = result.graph.nodes.find((n) => n.id === result.newNodeIds[0])!;
    expect(pasted.position.x).toBe(60);
    expect(pasted.position.y).toBe(60);
  });

  it('preserves edges between copied nodes', () => {
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

    const clipboard = copyNodes(graph, [r1.node.id, r2.node.id]);
    expect(clipboard.nodes).toHaveLength(2);
    expect(clipboard.edges).toHaveLength(1);

    const result = pasteNodes(graph, clipboard);
    expect(result.graph.nodes).toHaveLength(4);
    expect(result.graph.edges).toHaveLength(2); // original + pasted
    // Pasted edge should reference new node IDs
    const pastedEdge = result.graph.edges.find((e) => result.newNodeIds.includes(e.from.nodeId));
    expect(pastedEdge).toBeDefined();
    expect(result.newNodeIds).toContain(pastedEdge!.to.nodeId);
  });

  it('ignores edges to nodes outside selection', () => {
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

    // Only copy one node — edge should not be included
    const clipboard = copyNodes(graph, [r1.node.id]);
    expect(clipboard.nodes).toHaveLength(1);
    expect(clipboard.edges).toHaveLength(0);
  });

  it('returns unchanged graph for empty clipboard', () => {
    const clipboard = { nodes: [], edges: [] };
    const result = pasteNodes(emptyGraph, clipboard);
    expect(result.graph).toBe(emptyGraph);
    expect(result.newNodeIds).toHaveLength(0);
  });

  it('supports incremental offset for multiple pastes', () => {
    let graph = emptyGraph;
    const r1 = addNode(graph, 'Test/FloatConst', { x: 0, y: 0 });
    if ('error' in r1) throw new Error(r1.error);
    graph = r1.graph;

    const clipboard = copyNodes(graph, [r1.node.id]);

    // First paste with offset multiplier 1
    const paste1 = pasteNodes(graph, clipboard, { x: 60, y: 60 });
    graph = paste1.graph;
    const pasted1 = graph.nodes.find((n) => n.id === paste1.newNodeIds[0])!;
    expect(pasted1.position.x).toBe(60);
    expect(pasted1.position.y).toBe(60);

    // Second paste with offset multiplier 2
    const paste2 = pasteNodes(graph, clipboard, { x: 120, y: 120 });
    graph = paste2.graph;
    const pasted2 = graph.nodes.find((n) => n.id === paste2.newNodeIds[0])!;
    expect(pasted2.position.x).toBe(120);
    expect(pasted2.position.y).toBe(120);

    // Third paste with offset multiplier 3
    const paste3 = pasteNodes(graph, clipboard, { x: 180, y: 180 });
    graph = paste3.graph;
    const pasted3 = graph.nodes.find((n) => n.id === paste3.newNodeIds[0])!;
    expect(pasted3.position.x).toBe(180);
    expect(pasted3.position.y).toBe(180);
  });
});

describe('duplicateNodes', () => {
  it('preserves inter-node edges when duplicating multiple nodes', () => {
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

    expect(graph.edges).toHaveLength(1);

    const result = duplicateNodes(graph, [r1.node.id, r2.node.id]);
    expect(result.newNodes).toHaveLength(2);
    expect(result.graph.nodes).toHaveLength(4);
    // Should have original edge + duplicated edge
    expect(result.graph.edges).toHaveLength(2);

    // Verify duplicated edge connects new nodes
    const newNodeIds = new Set(result.newNodes.map((n) => n.id));
    const dupEdge = result.graph.edges.find(
      (e) => newNodeIds.has(e.from.nodeId) && newNodeIds.has(e.to.nodeId),
    );
    expect(dupEdge).toBeDefined();
  });

  it('does not duplicate edges to nodes outside selection', () => {
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

    // Only duplicate one node
    const result = duplicateNodes(graph, [r1.node.id]);
    expect(result.newNodes).toHaveLength(1);
    // No new edges - external connection not duplicated
    expect(result.graph.edges).toHaveLength(1);
  });
});
