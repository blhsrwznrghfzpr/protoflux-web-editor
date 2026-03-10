import { describe, it, expect } from 'vitest';
import { pushHistory, undo, redo, type HistoryState } from '../services/history';
import type { GraphModel } from '@/shared/types';

const g1: GraphModel = { nodes: [], edges: [] };
const g2: GraphModel = { nodes: [{ id: 'n1', type: 'Math/Add', position: { x: 0, y: 0 }, inputs: [], outputs: [] }], edges: [] };
const g3: GraphModel = { nodes: [{ id: 'n1', type: 'Math/Add', position: { x: 0, y: 0 }, inputs: [], outputs: [] }, { id: 'n2', type: 'Math/Sub', position: { x: 0, y: 0 }, inputs: [], outputs: [] }], edges: [] };

describe('history', () => {
  it('pushes snapshots onto undo stack', () => {
    const h: HistoryState = { undoStack: [], redoStack: [] };
    const h2 = pushHistory(h, g1);
    expect(h2.undoStack).toHaveLength(1);
    expect(h2.redoStack).toHaveLength(0);
  });

  it('undo restores previous state', () => {
    let h: HistoryState = { undoStack: [], redoStack: [] };
    h = pushHistory(h, g1);
    const result = undo(h, g2);
    expect(result).not.toBeNull();
    expect(result!.graph).toBe(g1);
    expect(result!.history.redoStack).toHaveLength(1);
  });

  it('redo restores next state', () => {
    let h: HistoryState = { undoStack: [], redoStack: [] };
    h = pushHistory(h, g1);
    const undone = undo(h, g2)!;
    const redone = redo(undone.history, undone.graph);
    expect(redone).not.toBeNull();
    expect(redone!.graph).toBe(g2);
  });

  it('undo returns null when stack empty', () => {
    const h: HistoryState = { undoStack: [], redoStack: [] };
    expect(undo(h, g1)).toBeNull();
  });

  it('redo returns null when stack empty', () => {
    const h: HistoryState = { undoStack: [], redoStack: [] };
    expect(redo(h, g1)).toBeNull();
  });

  it('push clears redo stack', () => {
    let h: HistoryState = { undoStack: [], redoStack: [] };
    h = pushHistory(h, g1);
    const undone = undo(h, g2)!;
    const h2 = pushHistory(undone.history, g3);
    expect(h2.redoStack).toHaveLength(0);
  });
});
