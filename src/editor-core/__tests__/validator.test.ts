import { describe, it, expect } from 'vitest';
import { validateGraph, canConnect, detectCycles, wouldCreateCycle } from '../services/validator';
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

function makeCyclicGraph(): GraphModel {
  return {
    nodes: [
      {
        id: 'a',
        type: 'Math/Add',
        position: { x: 0, y: 0 },
        inputs: [{ id: 'a-in', name: 'a', dataType: 'Float' }],
        outputs: [{ id: 'a-out', name: 'result', dataType: 'Float' }],
      },
      {
        id: 'b',
        type: 'Math/Add',
        position: { x: 200, y: 0 },
        inputs: [{ id: 'b-in', name: 'a', dataType: 'Float' }],
        outputs: [{ id: 'b-out', name: 'result', dataType: 'Float' }],
      },
    ],
    edges: [
      { id: 'e1', from: { nodeId: 'a', portId: 'a-out' }, to: { nodeId: 'b', portId: 'b-in' } },
      { id: 'e2', from: { nodeId: 'b', portId: 'b-out' }, to: { nodeId: 'a', portId: 'a-in' } },
    ],
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

  it('detects cycles in graph', () => {
    const graph = makeCyclicGraph();
    const errors = validateGraph(graph);
    expect(errors.some((e) => e.type === 'cycle-detected')).toBe(true);
  });

  it('returns no cycle error for acyclic graph', () => {
    const graph = makeGraph();
    graph.edges = [
      { id: 'e1', from: { nodeId: 'n1', portId: 'n1-out-value' }, to: { nodeId: 'n2', portId: 'n2-in-a' } },
    ];
    const errors = validateGraph(graph);
    expect(errors.some((e) => e.type === 'cycle-detected')).toBe(false);
  });
});

describe('detectCycles', () => {
  it('detects a simple cycle', () => {
    const graph = makeCyclicGraph();
    const errors = detectCycles(graph);
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('cycle-detected');
  });

  it('returns empty for acyclic graph', () => {
    const graph = makeGraph();
    graph.edges = [
      { id: 'e1', from: { nodeId: 'n1', portId: 'n1-out-value' }, to: { nodeId: 'n2', portId: 'n2-in-a' } },
    ];
    expect(detectCycles(graph)).toEqual([]);
  });
});

describe('wouldCreateCycle', () => {
  it('returns true when adding edge would create a cycle', () => {
    const graph = makeGraph();
    graph.edges = [
      { id: 'e1', from: { nodeId: 'n1', portId: 'n1-out-value' }, to: { nodeId: 'n2', portId: 'n2-in-a' } },
    ];
    // n2 -> n1 would create a cycle
    expect(wouldCreateCycle(graph, 'n2', 'n1')).toBe(true);
  });

  it('returns false when adding edge would not create a cycle', () => {
    const graph = makeGraph();
    // n1 -> n2 with no existing edges: no cycle
    expect(wouldCreateCycle(graph, 'n1', 'n2')).toBe(false);
  });

  it('detects self-loop via canConnect', () => {
    const graph: GraphModel = {
      nodes: [
        {
          id: 'n1',
          type: 'Math/Add',
          position: { x: 0, y: 0 },
          inputs: [{ id: 'n1-in-a', name: 'a', dataType: 'Float' }],
          outputs: [{ id: 'n1-out-result', name: 'result', dataType: 'Float' }],
        },
      ],
      edges: [],
    };
    const result = canConnect(graph, 'n1', 'n1-out-result', 'n1', 'n1-in-a');
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('cycle');
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
