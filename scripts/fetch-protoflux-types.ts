/**
 * ProtoFlux Type Fetcher
 *
 * Connects to Resonite via ResoniteLink and fetches all ProtoFlux node definitions.
 * Output is saved to src/data/protoflux-types.json
 *
 * Usage:
 *   npm run fetch-types
 *   (Resoniteで ResoniteLink を有効にし、ポート番号を確認してから実行)
 */

import { ResoniteLink } from '@eth0fox/tsrl';
import type { ComponentDefinition } from '@eth0fox/tsrl';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WsLib: typeof import('ws') = require('ws');
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = process.argv[2] ? parseInt(process.argv[2]) : 37601;
const HOST = process.argv[3] ?? 'localhost';
const OUT_PATH = resolve(__dirname, '../src/data/protoflux-types.json');

export interface ProtofluxTypeData {
  fetchedAt: string;
  resoniteVersion?: string;
  totalCount: number;
  types: Record<string, ComponentDefinition>;
}

/** categoryPath を再帰的に辿り、全 ProtoFlux コンポーネント型名を収集 */
async function collectComponentTypes(
  link: ResoniteLink,
  categoryPath: string,
): Promise<string[]> {
  const result: string[] = [];

  async function traverse(path: string) {
    const list = await link.getComponentTypeList(path || undefined);
    result.push(...list.componentTypes);

    for (const sub of list.subcategories) {
      const subPath = path ? `${path}/${sub}` : sub;
      await traverse(subPath);
    }
  }

  await traverse(categoryPath);
  return result;
}


async function main() {
  console.log(`Connecting to Resonite on ws://${HOST}:${PORT} ...`);

  // permessage-deflate を無効化した WebSocket クラスを使用（Resonite 互換性のため）
  const BaseWs = WsLib.WebSocket;
  class ResoniteWebSocket extends BaseWs {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols, { perMessageDeflate: false });
    }
  }

  let link: ResoniteLink;
  try {
    link = await ResoniteLink.connect(
      `ws://${HOST}:${PORT}`,
      ResoniteWebSocket as unknown as typeof globalThis.WebSocket,
    );
  } catch (err) {
    console.error('Failed to connect:', err);
    console.error('Resonite で ResoniteLink を有効にし、ポート番号を確認してください。');
    process.exit(1);
  }

  console.log('Connected!');

  // セッション情報取得
  let resoniteVersion: string | undefined;
  try {
    const session = await link.requestSessionData();
    resoniteVersion = session.resoniteVersion;
    console.log(`Resonite version: ${resoniteVersion}`);
    console.log(`ResoniteLink version: ${session.resoniteLinkVersion}`);
  } catch {
    console.warn('Could not fetch session data');
  }

  // ProtoFlux コンポーネント型リスト収集
  console.log('\nFetching ProtoFlux component list...');
  const allTypes = await collectComponentTypes(link, 'ProtoFlux');
  console.log(`Found ${allTypes.length} ProtoFlux components.`);

  if (allTypes.length === 0) {
    console.error('No ProtoFlux components found. Is Resonite loaded with a ProtoFlux world?');
    process.exit(1);
  }

  // 各コンポーネントの定義を取得
  const types: Record<string, ComponentDefinition> = {};
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < allTypes.length; i++) {
    const typeName = allTypes[i];
    const progress = `[${i + 1}/${allTypes.length}]`;

    try {
      const def = await link.getComponentDefinition(typeName, true);
      types[typeName] = def;
      succeeded++;

      if ((i + 1) % 50 === 0 || i + 1 === allTypes.length) {
        console.log(`${progress} Fetched ${succeeded} types (${failed} failed)`);
      }
    } catch (err) {
      failed++;
      if (process.env.VERBOSE) {
        console.warn(`${progress} Failed to fetch ${typeName}:`, err);
      }
    }
  }

  console.log(`\nDone: ${succeeded} succeeded, ${failed} failed`);

  // 出力
  const output: ProtofluxTypeData = {
    fetchedAt: new Date().toISOString(),
    resoniteVersion,
    totalCount: succeeded,
    types,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nSaved to: ${OUT_PATH}`);

  link.socket.close();
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
