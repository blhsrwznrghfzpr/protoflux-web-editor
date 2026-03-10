/**
 * ProtoFlux ノード定義をJSONから読み込んで nodeRegistry に登録する
 *
 * src/data/protoflux-node-defs.json (npm run fetch-types && npm run process-types で生成) を
 * 動的にインポートして nodeRegistry に登録する。
 *
 * 使い方:
 *   import { loadProtofluxRegistry } from '@/editor-core/model/load-protoflux-registry';
 *   await loadProtofluxRegistry();
 */

import { nodeRegistry } from './node-registry';

interface ProcessedPort {
  name: string;
  dataType: string;
  kind: 'data' | 'flow';
}

interface ProcessedNodeDef {
  type: string;
  category: string;
  displayName: string;
  isGeneric: boolean;
  inputs: ProcessedPort[];
  outputs: ProcessedPort[];
}

interface ProcessedOutput {
  generatedAt: string;
  resoniteVersion?: string;
  totalCount: number;
  nodes: ProcessedNodeDef[];
}

let loaded = false;

/**
 * ProtoFlux ノード定義を動的ロードして nodeRegistry に登録する。
 * 複数回呼ばれても初回のみ実行される。
 *
 * @returns 登録したノード数。JSONが存在しない場合は 0。
 */
export async function loadProtofluxRegistry(): Promise<number> {
  if (loaded) return nodeRegistry.list().length;

  let data: ProcessedOutput;
  try {
    // Vite の動的インポートで JSON を読み込む
    const mod = await import('@/data/protoflux-node-defs.json');
    data = mod.default as ProcessedOutput;
  } catch {
    console.warn(
      '[loadProtofluxRegistry] src/data/protoflux-node-defs.json が見つかりません。\n' +
      '  npm run fetch-types && npm run process-types を実行してください。',
    );
    return 0;
  }

  let registered = 0;
  for (const node of data.nodes) {
    nodeRegistry.register({
      type: node.type,
      category: node.category,
      inputs: node.inputs.map((p) => ({ name: p.name, dataType: p.dataType })),
      outputs: node.outputs.map((p) => ({ name: p.name, dataType: p.dataType })),
      capabilities: { editable: false, renderable: true },
    });
    registered++;
  }

  loaded = true;
  console.info(`[loadProtofluxRegistry] ${registered} ProtoFlux nodes registered (Resonite ${data.resoniteVersion ?? 'unknown'})`);
  return registered;
}
