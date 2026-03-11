import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { nodeRegistry } from '../model/node-registry';
import { addNode } from '../commands/add-node';
import { connectEdge } from '../commands/connect-edge';
import { deleteNode } from '../commands/delete-node';
import { moveNode } from '../commands/move-node';
import { updateParam } from '../commands/update-param';
import { pushHistory, undo, redo, type HistoryState } from '../services/history';
import { validateGraph, canConnect } from '../services/validator';
import { serialize } from '@/serialization/serialize';
import { deserialize } from '@/serialization/deserialize';
import { NoopBridge } from '@/bridge/noop-bridge';
import type { GraphModel } from '@/shared/types';

beforeAll(() => {
  // MVP ノードセット登録（設計書 5.2）
  nodeRegistry.register({
    type: 'Test/FloatConst',
    category: 'Test/Constants',
    inputs: [],
    outputs: [{ name: 'value', dataType: 'Float' }],
    capabilities: { editable: true, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/IntConst',
    category: 'Test/Constants',
    inputs: [],
    outputs: [{ name: 'value', dataType: 'Int' }],
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

describe('E2E workflow: node placement → connection → save', () => {
  let graph: GraphModel;
  let history: HistoryState;

  beforeEach(() => {
    graph = { nodes: [], edges: [] };
    history = { undoStack: [], redoStack: [] };
  });

  it('completes full workflow: place, connect, edit, validate, save, load', () => {
    // Step 1: Place nodes
    const r1 = addNode(graph, 'Test/FloatConst', { x: 0, y: 0 });
    expect('error' in r1).toBe(false);
    if ('error' in r1) return;
    history = pushHistory(history, graph);
    graph = r1.graph;

    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
    expect('error' in r2).toBe(false);
    if ('error' in r2) return;
    history = pushHistory(history, graph);
    graph = r2.graph;

    expect(graph.nodes).toHaveLength(2);

    // Step 2: Connect nodes
    const check = canConnect(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    expect(check.ok).toBe(true);

    const c1 = connectEdge(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    expect('error' in c1).toBe(false);
    if ('error' in c1) return;
    history = pushHistory(history, graph);
    graph = c1.graph;

    expect(graph.edges).toHaveLength(1);

    // Step 3: Edit - move and set params
    graph = moveNode(graph, r2.node.id, { x: 300, y: 100 });
    graph = updateParam(graph, r1.node.id, 'value', 3.14);

    // Step 4: Validate graph
    const errors = validateGraph(graph);
    expect(errors).toHaveLength(0);

    // Step 5: Save (serialize)
    const doc = serialize(graph, 'E2E Test');
    expect(doc.schemaVersion).toBe(1);
    expect(doc.graph.nodes).toHaveLength(2);
    expect(doc.graph.edges).toHaveLength(1);

    // Step 6: Load (deserialize from JSON)
    const raw = JSON.parse(JSON.stringify(doc));
    const { graph: restored, warnings } = deserialize(raw);
    expect(warnings).toHaveLength(0);
    expect(restored.nodes).toHaveLength(2);
    expect(restored.edges).toHaveLength(1);

    // Verify data integrity
    const constNode = restored.nodes.find((n) => n.type === 'Test/FloatConst')!;
    expect(constNode.params?.value).toBe(3.14);
    const addNodeRestored = restored.nodes.find((n) => n.type === 'Test/Add')!;
    expect(addNodeRestored.position).toEqual({ x: 300, y: 100 });
  });

  it('handles undo/redo across the workflow', () => {
    // Add first node
    const r1 = addNode(graph, 'Test/FloatConst', { x: 0, y: 0 });
    if ('error' in r1) return;
    history = pushHistory(history, graph);
    graph = r1.graph;

    // Add second node
    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
    if ('error' in r2) return;
    history = pushHistory(history, graph);
    graph = r2.graph;

    expect(graph.nodes).toHaveLength(2);

    // Undo → should have 1 node
    const undoResult = undo(history, graph);
    expect(undoResult).not.toBeNull();
    if (!undoResult) return;
    graph = undoResult.graph;
    history = undoResult.history;
    expect(graph.nodes).toHaveLength(1);

    // Redo → should have 2 nodes again
    const redoResult = redo(history, graph);
    expect(redoResult).not.toBeNull();
    if (!redoResult) return;
    graph = redoResult.graph;
    history = redoResult.history;
    expect(graph.nodes).toHaveLength(2);
  });

  it('rejects invalid connections with proper errors', () => {
    // Place Float output and Bool input (type mismatch)
    const r1 = addNode(graph, 'Test/BoolConst', { x: 0, y: 0 });
    if ('error' in r1) return;
    graph = r1.graph;

    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
    if ('error' in r2) return;
    graph = r2.graph;

    // Bool → Float should fail
    const check = canConnect(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('Type mismatch');

    const result = connectEdge(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    expect('error' in result).toBe(true);
  });

  it('allows implicit type conversion (Int → Float)', () => {
    const r1 = addNode(graph, 'Test/IntConst', { x: 0, y: 0 });
    if ('error' in r1) return;
    graph = r1.graph;

    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
    if ('error' in r2) return;
    graph = r2.graph;

    // Int → Float should succeed via implicit conversion
    const check = canConnect(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    expect(check.ok).toBe(true);
  });

  it('cascading delete removes connected edges', () => {
    const r1 = addNode(graph, 'Test/FloatConst', { x: 0, y: 0 });
    if ('error' in r1) return;
    graph = r1.graph;

    const r2 = addNode(graph, 'Test/Add', { x: 200, y: 0 });
    if ('error' in r2) return;
    graph = r2.graph;

    const c = connectEdge(graph, r1.node.id, r1.node.outputs[0].id, r2.node.id, r2.node.inputs[0].id);
    if ('error' in c) return;
    graph = c.graph;

    expect(graph.edges).toHaveLength(1);

    // Delete source node → edge should be removed
    graph = deleteNode(graph, r1.node.id);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toHaveLength(0);
  });

  it('handles Bridge status-dependent UI control (connected-only Push)', async () => {
    // This tests the design doc section 9.3 / 13.1 requirement:
    // Push/Pull should only work when connected.
    // We verify the NoopBridge behavior.
    const bridge = new NoopBridge();

    expect(bridge.getStatus()).toBe('disconnected');
    await expect(bridge.pushGraph()).rejects.toThrow();
  });
});
