import { describe, it, expect } from 'vitest';
import { validateGraph, canConnect } from '../services/validator';
import type { GraphModel } from '@/shared/types';

function makeGraph(): GraphModel {
  return {
    nodes: [
      {
        id: 'n1',
        type: 'Constants/Float',
        position: { x: 0, y: 0 },
        inputs: [],
        outputs: [{ id: 'n1-out-value', name: 'value', dataType: 'Float' }],
      },
      {
        id: 'n2',
        type: 'Math/Add',
        position: { x: 200, y: 0 },
        inputs: [
          { id: 'n2-in-a', name: 'a', dataType: 'Float' },
          { id: 'n2-in-b', name: 'b', dataType: 'Float' },
        ],
        outputs: [{ id: 'n2-out-result', name: 'result', dataType: 'Float' }],
      },
      {
        id: 'n3',
        type: 'Constants/Bool',
        position: { x: 0, y: 200 },
        inputs: [],
        outputs: [{ id: 'n3-out-value', name: 'value', dataType: 'Bool' }],
      },
    ],
    edges: [],
  };
}

describe('validateGraph', () => {
  it('returns no errors for a valid graph', () => {
    const graph = makeGraph();
    graph.edges = [
      { id: 'e1', from: { nodeId: 'n1', portId: 'n1-out-value' }, to: { nodeId: 'n2', portId: 'n2-in-a' } },
    ];
    expect(validateGraph(graph)).toEqual([]);
  });

  it('detects missing source node', () => {
    const graph = makeGraph();
    graph.edges = [
      { id: 'e1', from: { nodeId: 'missing', portId: 'x' }, to: { nodeId: 'n2', portId: 'n2-in-a' } },
    ];
    const errors = validateGraph(graph);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('port-not-found');
  });

  it('detects type mismatch', () => {
    const graph = makeGraph();
    graph.edges = [
      { id: 'e1', from: { nodeId: 'n3', portId: 'n3-out-value' }, to: { nodeId: 'n2', portId: 'n2-in-a' } },
    ];
    const errors = validateGraph(graph);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('type-mismatch');
  });

  it('detects duplicate input connections', () => {
    const graph = makeGraph();
    graph.edges = [
      { id: 'e1', from: { nodeId: 'n1', portId: 'n1-out-value' }, to: { nodeId: 'n2', portId: 'n2-in-a' } },
      { id: 'e2', from: { nodeId: 'n1', portId: 'n1-out-value' }, to: { nodeId: 'n2', portId: 'n2-in-a' } },
    ];
    const errors = validateGraph(graph);
    expect(errors.some((e) => e.type === 'duplicate-input')).toBe(true);
  });
});

describe('canConnect', () => {
  it('allows valid connections', () => {
    const graph = makeGraph();
    const result = canConnect(graph, 'n1', 'n1-out-value', 'n2', 'n2-in-a');
    expect(result.ok).toBe(true);
  });

  it('rejects type mismatches', () => {
    const graph = makeGraph();
    const result = canConnect(graph, 'n3', 'n3-out-value', 'n2', 'n2-in-a');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Type mismatch');
  });

  it('rejects already-connected input', () => {
    const graph = makeGraph();
    graph.edges = [
      { id: 'e1', from: { nodeId: 'n1', portId: 'n1-out-value' }, to: { nodeId: 'n2', portId: 'n2-in-a' } },
    ];
    const result = canConnect(graph, 'n1', 'n1-out-value', 'n2', 'n2-in-a');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('already connected');
  });
});
