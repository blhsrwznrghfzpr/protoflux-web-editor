import { ResoniteLink } from '@eth0fox/tsrl';
import type { DataModelOperationClientMessage } from '@eth0fox/tsrl';
import type { ProtofluxDocument } from '@/shared/types';
import type { BridgeStatus, IResoniteBridge } from './types';


export class TsrlBridge implements IResoniteBridge {
  private link: ResoniteLink | null = null;
  private status: BridgeStatus = 'disconnected';
  private listeners = new Set<(status: BridgeStatus) => void>();
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
    try {
      const link = await ResoniteLink.connect(this.url);
      this.link = link;
      link.socket.addEventListener('close', () => {
        this.link = null;
        this.setStatus('disconnected');
      });
      link.socket.addEventListener('error', () => {
        this.setStatus('error');
      });
      this.setStatus('connected');
    } catch {
      this.setStatus('error');
      throw new Error('ResoniteLinkへの接続に失敗しました');
    }
  }

  async disconnect(): Promise<void> {
    if (this.link) {
      this.link.socket.close();
      this.link = null;
    }
    this.setStatus('disconnected');
  }

  async pushGraph(doc: ProtofluxDocument): Promise<void> {
    if (!this.link) throw new Error('ResoniteLinkに接続されていません');
    const link = this.link;
    const { graph, meta } = doc;

    // Root スロットを取得
    const root = await link.slotGet('Root', false, 0);

    // ID を事前確保
    const parentSlotId = link.allocateId();
    const nodeSlotIds = graph.nodes.map(() => link.allocateId());
    const componentIds = graph.nodes.map(() => link.allocateId());

    const operations: DataModelOperationClientMessage[] = [];

    // グラフ用の親スロットを追加
    operations.push({
      $type: 'addSlot',
      data: {
        id: parentSlotId,
        parent: { $type: 'reference', targetId: root.id },
        name: { value: meta.name },
        isActive: { value: true },
        isPersistent: { value: true },
      },
    });

    // 各ノードのスロットとコンポーネントを追加
    for (let i = 0; i < graph.nodes.length; i++) {
      const node = graph.nodes[i]!;
      const slotId = nodeSlotIds[i]!;
      const componentId = componentIds[i]!;

      operations.push({
        $type: 'addSlot',
        data: {
          id: slotId,
          parent: { $type: 'reference', targetId: parentSlotId },
          name: { value: node.displayName ?? node.type },
          position: { value: { x: node.position.x * 0.001, y: -node.position.y * 0.001, z: 0 } },
          isActive: { value: true },
          isPersistent: { value: true },
        },
      });

      operations.push({
        $type: 'addComponent',
        containerSlotId: slotId,
        data: {
          id: componentId,
          componentType: node.type,
          members: {},
        },
      });
    }

    const responses = await link.dataModelOperationBatch(operations);
    const failed = responses.filter((r) => !r.success);
    if (failed.length > 0) {
      throw new Error(`インポートに一部失敗しました: ${failed.map((r) => r.errorInfo).join(', ')}`);
    }
  }

  onStatusChange(cb: (status: BridgeStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}
