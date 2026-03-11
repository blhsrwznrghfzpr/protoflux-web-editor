/**
 * ResoniteLink インポートのテストスクリプト
 *
 * Usage:
 *   mise exec -- node_modules/.bin/tsx scripts/test-import.ts
 *
 * Resonite 側の準備:
 *   Dashboard → Session → Enable ResoniteLink
 */

import { ResoniteLink } from '@eth0fox/tsrl';
import type { DataModelOperationClientMessage } from '@eth0fox/tsrl';
import { WebSocket } from 'ws';

const PORT = 5458;
const URL = `ws://localhost:${PORT}`;


// テスト用のノードデータ（node-defs.json の実際の型名を使用）
const TEST_NODES = [
  {
    id: 'node-1',
    type: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueAdd<float>',
    displayName: 'ValueAdd<float>',
    position: { x: 0, y: 0 },
  },
  {
    id: 'node-2',
    type: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueMul<float>',
    displayName: 'ValueMul<float>',
    position: { x: 200, y: 0 },
  },
  {
    id: 'node-3',
    type: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Variables.DynamicVariableValueInput<float>',
    displayName: 'DynamicVariableValueInput<float>',
    position: { x: 0, y: 150 },
  },
];

async function main() {
  console.log(`Connecting to ResoniteLink at ${URL} ...`);

  let link: ResoniteLink;
  try {
    link = await ResoniteLink.connect(URL, WebSocket as never);
    console.log('✓ Connected');
  } catch (err) {
    console.error('✗ Connection failed:', err);
    process.exit(1);
  }

  try {
    // セッション情報を確認
    const session = await link.requestSessionData();
    console.log(`✓ Resonite version: ${session.resoniteVersion}`);
    console.log(`  ResoniteLink version: ${session.resoniteLinkVersion}`);
    console.log(`  Session ID: ${session.uniqueSessionId}`);

    // Root スロットを取得
    const root = await link.slotGet('Root', false, 0);
    console.log(`✓ Root slot ID: ${root.id}`);

    // ID を事前確保
    const parentSlotId = link.allocateId();
    const nodeSlotIds = TEST_NODES.map(() => link.allocateId());
    const componentIds = TEST_NODES.map(() => link.allocateId());

    const operations: DataModelOperationClientMessage[] = [];

    // 親スロット
    operations.push({
      $type: 'addSlot',
      data: {
        id: parentSlotId,
        parent: { $type: 'reference', targetId: root.id },
        name: { value: 'test-import' },
        isActive: { value: true },
        isPersistent: { value: true },
      },
    });

    // 各ノードのスロットとコンポーネント
    for (let i = 0; i < TEST_NODES.length; i++) {
      const node = TEST_NODES[i]!;
      const slotId = nodeSlotIds[i]!;
      const componentId = componentIds[i]!;
      console.log(`  Node ${i + 1}: ${node.displayName} → ${node.type}`);

      operations.push({
        $type: 'addSlot',
        data: {
          id: slotId,
          parent: { $type: 'reference', targetId: parentSlotId },
          name: { value: node.displayName },
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

    console.log(`\nSending batch (${operations.length} operations) ...`);
    const responses = await link.dataModelOperationBatch(operations);

    const failed = responses.filter((r) => !r.success);
    if (failed.length > 0) {
      console.error('✗ Some operations failed:');
      failed.forEach((r) => console.error('  -', r.errorInfo));
    } else {
      console.log(`✓ All ${responses.length} operations succeeded`);
      console.log(`  Parent slot ID: ${parentSlotId}`);
    }
  } catch (err) {
    console.error('✗ Error:', err);
  } finally {
    link.socket.close();
    console.log('\nDisconnected.');
  }
}

main();
