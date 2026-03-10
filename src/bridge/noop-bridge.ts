import type { BridgeStatus, IResoniteBridge } from './types';

export class NoopBridge implements IResoniteBridge {
  getStatus(): BridgeStatus {
    return 'disconnected';
  }

  async connect(): Promise<void> {
    // No-op
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async pushGraph(): Promise<void> {
    throw new Error('NoopBridge: Push not available');
  }

  onStatusChange(): () => void {
    return () => {};
  }
}
