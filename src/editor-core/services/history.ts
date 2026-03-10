import type { GraphModel } from '@/shared/types';

export interface HistoryState {
  undoStack: GraphModel[];
  redoStack: GraphModel[];
}

export function pushHistory(
  history: HistoryState,
  snapshot: GraphModel,
  maxSize = 50,
): HistoryState {
  const undoStack = [...history.undoStack, snapshot].slice(-maxSize);
  return { undoStack, redoStack: [] };
}

export function undo(
  history: HistoryState,
  current: GraphModel,
): { history: HistoryState; graph: GraphModel } | null {
  if (history.undoStack.length === 0) return null;
  const undoStack = [...history.undoStack];
  const previous = undoStack.pop()!;
  return {
    history: {
      undoStack,
      redoStack: [...history.redoStack, current],
    },
    graph: previous,
  };
}

export function redo(
  history: HistoryState,
  current: GraphModel,
): { history: HistoryState; graph: GraphModel } | null {
  if (history.redoStack.length === 0) return null;
  const redoStack = [...history.redoStack];
  const next = redoStack.pop()!;
  return {
    history: {
      undoStack: [...history.undoStack, current],
      redoStack,
    },
    graph: next,
  };
}
