import { create } from 'zustand';
import type { GraphModel, NodeId } from '@/shared/types';
import { pushHistory, undo, redo, type HistoryState } from '@/editor-core/services/history';
import { addNode } from '@/editor-core/commands/add-node';
import { connectEdge } from '@/editor-core/commands/connect-edge';
import { deleteNode, deleteEdge } from '@/editor-core/commands/delete-node';
import { moveNode } from '@/editor-core/commands/move-node';
import { updateParam } from '@/editor-core/commands/update-param';
import type { BridgeStatus, IResoniteBridge } from '@/bridge/types';
import { NoopBridge } from '@/bridge/noop-bridge';

interface EditorState {
  graph: GraphModel;
  selection: NodeId[];
  viewport: { x: number; y: number; zoom: number };
  history: HistoryState;
  dirty: boolean;
  documentName: string;
  bridge: IResoniteBridge;
  bridgeStatus: BridgeStatus;

  // Actions
  addNode: (type: string, position: { x: number; y: number }) => void;
  connectEdge: (fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => string | null;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;
  updateParam: (nodeId: string, key: string, value: unknown) => void;
  setSelection: (nodeIds: string[]) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  undo: () => void;
  redo: () => void;
  loadGraph: (graph: GraphModel, name?: string) => void;
  setDocumentName: (name: string) => void;
  setDirty: (dirty: boolean) => void;
  setBridge: (bridge: IResoniteBridge) => void;
  setBridgeStatus: (status: BridgeStatus) => void;
}

const AUTOSAVE_KEY = 'protoflux-autosave';

function loadAutosave(): GraphModel | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function autosave(graph: GraphModel) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(graph));
  } catch {
    // Ignore storage errors
  }
}

const initialGraph = loadAutosave() ?? { nodes: [], edges: [] };

export const useEditorStore = create<EditorState>((set, get) => ({
  graph: initialGraph,
  selection: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  history: { undoStack: [], redoStack: [] },
  dirty: false,
  documentName: 'Untitled',
  bridge: new NoopBridge(),
  bridgeStatus: 'disconnected',

  addNode: (type, position) => {
    const state = get();
    const result = addNode(state.graph, type, position);
    if ('error' in result) return;
    set({
      graph: result.graph,
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    autosave(result.graph);
  },

  connectEdge: (fromNodeId, fromPortId, toNodeId, toPortId) => {
    const state = get();
    const result = connectEdge(state.graph, fromNodeId, fromPortId, toNodeId, toPortId);
    if ('error' in result) return result.error;
    set({
      graph: result.graph,
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    autosave(result.graph);
    return null;
  },

  deleteNode: (nodeId) => {
    const state = get();
    const newGraph = deleteNode(state.graph, nodeId);
    set({
      graph: newGraph,
      selection: state.selection.filter((id) => id !== nodeId),
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    autosave(newGraph);
  },

  deleteEdge: (edgeId) => {
    const state = get();
    const newGraph = deleteEdge(state.graph, edgeId);
    set({
      graph: newGraph,
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    autosave(newGraph);
  },

  moveNode: (nodeId, position) => {
    const state = get();
    const newGraph = moveNode(state.graph, nodeId, position);
    set({ graph: newGraph, dirty: true });
    autosave(newGraph);
  },

  updateParam: (nodeId, key, value) => {
    const state = get();
    const newGraph = updateParam(state.graph, nodeId, key, value);
    set({
      graph: newGraph,
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    autosave(newGraph);
  },

  setSelection: (nodeIds) => set({ selection: nodeIds }),

  setViewport: (viewport) => set({ viewport }),

  undo: () => {
    const state = get();
    const result = undo(state.history, state.graph);
    if (!result) return;
    set({ graph: result.graph, history: result.history, dirty: true });
    autosave(result.graph);
  },

  redo: () => {
    const state = get();
    const result = redo(state.history, state.graph);
    if (!result) return;
    set({ graph: result.graph, history: result.history, dirty: true });
    autosave(result.graph);
  },

  loadGraph: (graph, name) => {
    set({
      graph,
      selection: [],
      history: { undoStack: [], redoStack: [] },
      dirty: false,
      documentName: name ?? 'Untitled',
    });
    autosave(graph);
  },

  setDocumentName: (name) => set({ documentName: name }),
  setDirty: (dirty) => set({ dirty }),
  setBridge: (bridge) => set({ bridge }),
  setBridgeStatus: (status) => set({ bridgeStatus: status }),
}));
