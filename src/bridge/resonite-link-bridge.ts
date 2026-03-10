import type { ProtofluxDocument } from '@/shared/types';
import type { BridgeStatus, IResoniteBridge } from './types';

export class ResoniteLinkBridge implements IResoniteBridge {
  private status: BridgeStatus = 'disconnected';
  private listeners = new Set<(status: BridgeStatus) => void>();
  private ws: WebSocket | null = null;
  private url: string;

  constructor(url = 'ws://localhost:11404') {
    this.url = url;
  }

  getStatus(): BridgeStatus {
    return this.status;
  }

  private setStatus(status: BridgeStatus) {
    this.status = status;
    this.listeners.forEach((cb) => cb(status));
  }

  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') return;

    this.setStatus('connecting');

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.setStatus('connected');
          resolve();
        };

        this.ws.onerror = () => {
          this.setStatus('error');
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          this.setStatus('disconnected');
          this.ws = null;
        };
      } catch {
        this.setStatus('error');
        reject(new Error('Failed to create WebSocket connection'));
      }
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  async pushGraph(doc: ProtofluxDocument): Promise<void> {
    if (this.status !== 'connected' || !this.ws) {
      throw new Error('Not connected to Resonite');
    }

    this.ws.send(
      JSON.stringify({
        type: 'push',
        payload: doc,
      }),
    );
  }

  async pullGraph(): Promise<ProtofluxDocument> {
    if (this.status !== 'connected' || !this.ws) {
      throw new Error('Not connected to Resonite');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Pull timed out'));
      }, 10000);

      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pull-response') {
            clearTimeout(timeout);
            this.ws?.removeEventListener('message', handler);
            resolve(data.payload);
          }
        } catch {
          // Ignore non-JSON messages
        }
      };

      this.ws!.addEventListener('message', handler);
      this.ws!.send(JSON.stringify({ type: 'pull' }));
    });
  }

  onStatusChange(cb: (status: BridgeStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}
