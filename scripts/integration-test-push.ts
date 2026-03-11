/**
 * Push 操作の CLI インテグレーションテスト
 *
 * TsrlBridge + serialize の実際のコードパスを通してテストします。
 *
 * Usage:
 *   mise exec -- node_modules/.bin/tsx scripts/integration-test-push.ts
 *
 * Resonite 側の準備:
 *   Dashboard → Session → Enable ResoniteLink (port 5458)
 */

import { WebSocket } from 'ws';
import { TsrlBridge } from '../src/bridge/tsrl-bridge.ts';
import { serialize } from '../src/serialization/serialize.ts';
import type { GraphModel } from '../src/shared/types/index.ts';

// Node.js 環境で ws を WebSocket として使用
(globalThis as Record<string, unknown>).WebSocket = WebSocket;

const URL = process.env.VITE_RESONITE_LINK_URL ?? 'ws://localhost:5458';

const SAMPLE_GRAPH: GraphModel = {
  nodes: [
    {
      id: 'node-1',
      type: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueAdd<float>',
      displayName: 'ValueAdd<float>',
      position: { x: 0, y: 0 },
      inputs: [
        { id: 'in-a', name: 'A', dataType: 'float' },
        { id: 'in-b', name: 'B', dataType: 'float' },
      ],
      outputs: [{ id: 'out', name: '*', dataType: 'float' }],
    },
    {
      id: 'node-2',
      type: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.Operators.ValueMul<float>',
      displayName: 'ValueMul<float>',
      position: { x: 300, y: 0 },
      inputs: [
        { id: 'in-a', name: 'A', dataType: 'float' },
        { id: 'in-b', name: 'B', dataType: 'float' },
      ],
      outputs: [{ id: 'out', name: '*', dataType: 'float' }],
    },
    {
      id: 'node-3',
      type: '[ProtoFluxBindings]FrooxEngine.ProtoFlux.Runtimes.Execution.Nodes.FrooxEngine.Variables.DynamicVariableValueInput<float>',
      displayName: 'DynamicVariableValueInput<float>',
      position: { x: 0, y: 200 },
      inputs: [],
      outputs: [{ id: 'out', name: 'Value', dataType: 'float' }],
    },
  ],
  edges: [
    {
      id: 'edge-1',
      from: { nodeId: 'node-1', portId: 'out' },
      to: { nodeId: 'node-2', portId: 'in-a' },
    },
  ],
};

async function main() {
  console.log(`Connecting to ResoniteLink at ${URL} ...`);

  const bridge = new TsrlBridge(URL);

  // 接続
  try {
    await bridge.connect();
    console.log('✓ Connected');
  } catch (err) {
    console.error('✗ Connection failed:', err);
    process.exit(1);
  }

  // シリアライズ
  const doc = serialize(SAMPLE_GRAPH, 'integration-test-push');
  console.log(`\nDocument: "${doc.meta.name}"`);
  console.log(`  nodes: ${doc.graph.nodes.length}`);
  console.log(`  edges: ${doc.graph.edges.length}`);
  doc.graph.nodes.forEach((n, i) => {
    console.log(`  [${i + 1}] ${n.displayName ?? n.type}`);
  });

  // Push
  console.log('\nPushing graph to Resonite ...');
  try {
    await bridge.pushGraph(doc);
    console.log('✓ Push succeeded');
  } catch (err) {
    console.error('✗ Push failed:', err);
  } finally {
    await bridge.disconnect();
    console.log('\nDisconnected.');
  }
}

main();
