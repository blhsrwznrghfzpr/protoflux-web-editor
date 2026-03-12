import { ResoniteLink } from '@eth0fox/tsrl';
import type { DataModelOperationClientMessage, Slot, AnyFieldValue, Reference } from '@eth0fox/tsrl';
import type { ProtofluxDocument, NodeModel, EdgeModel, PortModel } from '@/shared/types';
import type { BridgeStatus, IResoniteBridge } from './types';
import { nodeRegistry } from '@/editor-core/model/node-registry';
import { generateId } from '@/shared/utils';


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

    // ノード ID → コンポーネント ID のマッピング（エッジ接続用）
    const nodeIdToComponentId = new Map<string, string>();
    for (let i = 0; i < graph.nodes.length; i++) {
      nodeIdToComponentId.set(graph.nodes[i]!.id, componentIds[i]!);
    }

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

      // エッジからこのノードの出力ポートの接続先をコンポーネント members に reference として設定
      const members: Record<string, AnyFieldValue> = {};
      for (const edge of graph.edges) {
        if (edge.from.nodeId === node.id) {
          const targetComponentId = nodeIdToComponentId.get(edge.to.nodeId);
          if (targetComponentId) {
            const port = node.outputs.find((p) => p.id === edge.from.portId);
            const memberKey = port?.name ?? edge.from.portId;
            members[memberKey] = {
              $type: 'reference',
              targetId: targetComponentId,
            } as Reference;
          }
        }
      }

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
          members,
        },
      });
    }

    const responses = await link.dataModelOperationBatch(operations);
    const failed = responses.filter((r) => !r.success);
    if (failed.length > 0) {
      throw new Error(`インポートに一部失敗しました: ${failed.map((r) => r.errorInfo).join(', ')}`);
    }
  }

  async pullGraph(): Promise<ProtofluxDocument> {
    if (!this.link) throw new Error('ResoniteLinkに接続されていません');
    const link = this.link;

    // Root スロットを depth=2 で取得（親スロット → 各ノードスロット + コンポーネント）
    const root = await link.slotGet('Root', true, 2);
    const warnings: string[] = [];

    // Root の子スロットから ProtoFlux コンポーネントを含むグラフスロットを探す
    const graphSlot = findGraphSlot(root);
    if (!graphSlot) {
      throw new Error('ProtoFlux グラフが見つかりませんでした');
    }

    const children = graphSlot.children ?? [];
    const nodes: NodeModel[] = [];
    const edges: EdgeModel[] = [];

    // コンポーネント ID → ノード ID のマッピング（エッジ再構築用）
    const componentIdToNodeId = new Map<string, string>();

    for (const childSlot of children) {
      if (childSlot.isReferenceOnly) continue;

      const components = childSlot.components ?? [];
      const protofluxComponent = components.find(
        (c) => !c.isReferenceOnly && c.componentType && isProtoFluxComponent(c.componentType),
      );

      if (!protofluxComponent || protofluxComponent.isReferenceOnly) continue;

      const nodeId = generateId();
      const type = protofluxComponent.componentType;
      const def = nodeRegistry.get(type);

      // スロット位置からエディタ座標に変換（push の逆変換）
      const pos = childSlot.position?.value;
      const position = {
        x: (pos?.x ?? 0) * 1000,
        y: -(pos?.y ?? 0) * 1000,
      };

      const inputs: PortModel[] = def
        ? def.inputs.map((inp) => ({
            id: generateId(),
            name: inp.name,
            dataType: inp.dataType,
          }))
        : [];

      const outputs: PortModel[] = def
        ? def.outputs.map((out) => ({
            id: generateId(),
            name: out.name,
            dataType: out.dataType,
          }))
        : [];

      const node: NodeModel = {
        id: nodeId,
        type,
        displayName: def?.displayName ?? childSlot.name?.value ?? type,
        position,
        inputs,
        outputs,
        ...(!def && { unknownRaw: { componentId: protofluxComponent.id } }),
      };

      if (!def) {
        warnings.push(`Unknown node type: ${type}`);
      }

      nodes.push(node);
      componentIdToNodeId.set(protofluxComponent.id, nodeId);
    }

    // エッジの再構築: コンポーネント members 内の reference を解析
    for (const childSlot of children) {
      if (childSlot.isReferenceOnly) continue;
      const components = childSlot.components ?? [];
      const protofluxComponent = components.find(
        (c) => !c.isReferenceOnly && c.componentType && isProtoFluxComponent(c.componentType),
      );
      if (!protofluxComponent || protofluxComponent.isReferenceOnly) continue;

      const sourceNodeId = componentIdToNodeId.get(protofluxComponent.id);
      if (!sourceNodeId) continue;

      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode) continue;

      const members = protofluxComponent.members ?? {};
      for (const [memberName, memberValue] of Object.entries(members)) {
        if (!isReference(memberValue) || !memberValue.targetId) continue;

        const targetNodeId = componentIdToNodeId.get(memberValue.targetId);
        if (!targetNodeId) continue;

        // ソースノードの出力ポートを memberName で探す
        const sourcePort = sourceNode.outputs.find((p) => p.name === memberName);
        if (!sourcePort) continue;

        const targetNode = nodes.find((n) => n.id === targetNodeId);
        if (!targetNode || targetNode.inputs.length === 0) continue;

        // ターゲットノードの未接続入力ポートに接続
        const usedInputPorts = new Set(
          edges.filter((e) => e.to.nodeId === targetNodeId).map((e) => e.to.portId),
        );
        const availableInput = targetNode.inputs.find((p) => !usedInputPorts.has(p.id));
        if (!availableInput) continue;

        edges.push({
          id: generateId(),
          from: { nodeId: sourceNodeId, portId: sourcePort.id },
          to: { nodeId: targetNodeId, portId: availableInput.id },
        });
      }
    }

    return {
      schemaVersion: 1,
      meta: {
        name: graphSlot.name?.value ?? 'Pulled Graph',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      graph: { nodes, edges },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  onStatusChange(cb: (status: BridgeStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

function isReference(value: AnyFieldValue): value is Reference {
  return value != null && typeof value === 'object' && '$type' in value && value.$type === 'reference';
}

function isProtoFluxComponent(componentType: string): boolean {
  return componentType.includes('ProtoFlux') || componentType.includes('FrooxEngine');
}

/**
 * Root の子スロットから ProtoFlux コンポーネントを含むグラフスロットを探す
 */
function findGraphSlot(root: Slot & { isReferenceOnly: false }): (Slot & { isReferenceOnly: false }) | null {
  const children = root.children ?? [];

  // 子スロットに ProtoFlux コンポーネントを持つ孫スロットがあるか探す
  for (const child of children) {
    if (child.isReferenceOnly) continue;

    const grandChildren = child.children ?? [];
    const hasProtoFlux = grandChildren.some((gc) => {
      if (gc.isReferenceOnly) return false;
      return (gc.components ?? []).some(
        (c) => !c.isReferenceOnly && c.componentType && isProtoFluxComponent(c.componentType),
      );
    });

    if (hasProtoFlux) {
      return child as Slot & { isReferenceOnly: false };
    }
  }

  // 見つからない場合、直下にノードがあれば Root を返す
  const hasDirectProtoFlux = children.some((child) => {
    if (child.isReferenceOnly) return false;
    return (child.components ?? []).some(
      (c) => !c.isReferenceOnly && c.componentType && isProtoFluxComponent(c.componentType),
    );
  });

  if (hasDirectProtoFlux) {
    return root;
  }

  return null;
}
