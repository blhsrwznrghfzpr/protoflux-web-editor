import { create } from 'zustand';
import type { GraphModel, NodeId } from '@/shared/types';
import { pushHistory, undo, redo, type HistoryState } from '@/editor-core/services/history';
import { addNode } from '@/editor-core/commands/add-node';
import { connectEdge } from '@/editor-core/commands/connect-edge';
import { deleteNode, deleteEdge } from '@/editor-core/commands/delete-node';
import { moveNode } from '@/editor-core/commands/move-node';
import { updateParam } from '@/editor-core/commands/update-param';
import { duplicateNodes } from '@/editor-core/commands/duplicate-node';
import { validateGraph, type ValidationError } from '@/editor-core/services/validator';
import type { BridgeStatus, IResoniteBridge } from '@/bridge/types';
import { NoopBridge } from '@/bridge/noop-bridge';

export interface StatusMessage {
  text: string;
  type: 'info' | 'error' | 'warning';
  timestamp: number;
}

interface EditorState {
  graph: GraphModel;
  selection: NodeId[];
  viewport: { x: number; y: number; zoom: number };
  history: HistoryState;
  dirty: boolean;
  documentName: string;
  bridge: IResoniteBridge;
  bridgeStatus: BridgeStatus;
  statusMessage: StatusMessage | null;
  validationErrors: ValidationError[];

  // Actions
  addNode: (type: string, position: { x: number; y: number }) => void;
  connectEdge: (fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => string | null;
  deleteNode: (nodeId: string) => void;
  deleteEdge: (edgeId: string) => void;
  moveNode: (nodeId: string, position: { x: number; y: number }) => void;
  updateParam: (nodeId: string, key: string, value: unknown) => void;
  duplicateSelected: () => void;
  setSelection: (nodeIds: string[]) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  undo: () => void;
  redo: () => void;
  loadGraph: (graph: GraphModel, name?: string) => void;
  setDocumentName: (name: string) => void;
  setDirty: (dirty: boolean) => void;
  setBridge: (bridge: IResoniteBridge) => void;
  setBridgeStatus: (status: BridgeStatus) => void;
  setStatusMessage: (text: string, type: StatusMessage['type']) => void;
  clearStatusMessage: () => void;
}

// ---- Validation with debounce -----------------------------------------------

let validationTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleValidation() {
  if (validationTimer) clearTimeout(validationTimer);
  validationTimer = setTimeout(() => {
    const state = useEditorStore.getState();
    const errors = validateGraph(state.graph);
    useEditorStore.setState({ validationErrors: errors });
  }, 300);
}

// ---- Auto-save with debounce ------------------------------------------------

const AUTOSAVE_KEY = 'protoflux-autosave';

interface AutosaveData {
  graph: GraphModel;
  documentName?: string;
  viewport?: { x: number; y: number; zoom: number };
}

function loadAutosave(): AutosaveData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // 旧形式互換: graph だけ直接保存されていた場合
    if (parsed.nodes) return { graph: parsed };
    return parsed;
  } catch {
    return null;
  }
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleAutosave() {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    const state = useEditorStore.getState();
    try {
      const data: AutosaveData = {
        graph: state.graph,
        documentName: state.documentName,
        viewport: state.viewport,
      };
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }, 500);
}

// ---- Initial state ----------------------------------------------------------

const savedData = loadAutosave();
const initialGraph = savedData?.graph ?? { nodes: [], edges: [] };
const initialDocName = savedData?.documentName ?? 'Untitled';
const initialViewport = savedData?.viewport ?? { x: 0, y: 0, zoom: 1 };

// ---- Store ------------------------------------------------------------------

export const useEditorStore = create<EditorState>((set, get) => ({
  graph: initialGraph,
  selection: [],
  viewport: initialViewport,
  history: { undoStack: [], redoStack: [] },
  dirty: false,
  documentName: initialDocName,
  bridge: new NoopBridge(),
  bridgeStatus: 'disconnected',
  statusMessage: null,
  validationErrors: validateGraph(initialGraph),

  addNode: (type, position) => {
    const state = get();
    const result = addNode(state.graph, type, position);
    if ('error' in result) return;
    set({
      graph: result.graph,
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    scheduleAutosave();
    scheduleValidation();
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
    scheduleAutosave();
    scheduleValidation();
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
    scheduleAutosave();
    scheduleValidation();
  },

  deleteEdge: (edgeId) => {
    const state = get();
    const newGraph = deleteEdge(state.graph, edgeId);
    set({
      graph: newGraph,
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    scheduleAutosave();
    scheduleValidation();
  },

  moveNode: (nodeId, position) => {
    const state = get();
    const newGraph = moveNode(state.graph, nodeId, position);
    set({
      graph: newGraph,
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    scheduleAutosave();
  },

  updateParam: (nodeId, key, value) => {
    const state = get();
    const newGraph = updateParam(state.graph, nodeId, key, value);
    set({
      graph: newGraph,
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    scheduleAutosave();
  },

  duplicateSelected: () => {
    const state = get();
    if (state.selection.length === 0) return;
    const result = duplicateNodes(state.graph, state.selection);
    set({
      graph: result.graph,
      selection: result.newNodes.map((n) => n.id),
      history: pushHistory(state.history, state.graph),
      dirty: true,
    });
    scheduleAutosave();
  },

  setSelection: (nodeIds) => set({ selection: nodeIds }),

  setViewport: (viewport) => {
    set({ viewport });
    scheduleAutosave();
  },

  undo: () => {
    const state = get();
    const result = undo(state.history, state.graph);
    if (!result) return;
    set({ graph: result.graph, history: result.history, dirty: true });
    scheduleAutosave();
    scheduleValidation();
  },

  redo: () => {
    const state = get();
    const result = redo(state.history, state.graph);
    if (!result) return;
    set({ graph: result.graph, history: result.history, dirty: true });
    scheduleAutosave();
    scheduleValidation();
  },

  loadGraph: (graph, name) => {
    set({
      graph,
      selection: [],
      history: { undoStack: [], redoStack: [] },
      dirty: false,
      documentName: name ?? 'Untitled',
      validationErrors: validateGraph(graph),
    });
    scheduleAutosave();
  },

  setDocumentName: (name) => {
    set({ documentName: name });
    scheduleAutosave();
  },
  setDirty: (dirty) => set({ dirty }),
  setBridge: (bridge) => set({ bridge }),
  setBridgeStatus: (status) => set({ bridgeStatus: status }),
  setStatusMessage: (text, type) =>
    set({ statusMessage: { text, type, timestamp: Date.now() } }),
  clearStatusMessage: () => set({ statusMessage: null }),
}));
