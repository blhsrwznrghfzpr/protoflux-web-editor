import type { ProtofluxDocument } from '@/shared/types';

export type BridgeStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface IResoniteBridge {
  getStatus(): BridgeStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  pushGraph(doc: ProtofluxDocument): Promise<void>;
  pullGraph?(): Promise<ProtofluxDocument>;
  onStatusChange(cb: (status: BridgeStatus) => void): () => void;
}
