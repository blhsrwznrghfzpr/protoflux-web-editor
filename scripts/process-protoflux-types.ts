/**
 * ProtoFlux Type Processor
 *
 * fetch-protoflux-types.ts で取得した生の型データを
 * アプリが使いやすい NodeDefinition 形式に変換して保存する
 *
 * Usage:
 *   npm run process-types
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentDefinition, MemberDefinition } from '@eth0fox/tsrl';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IN_PATH = resolve(__dirname, '../src/data/protoflux-types.json');
const OUT_PATH = resolve(__dirname, '../src/data/protoflux-node-defs.json');

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

interface ProtofluxTypeData {
  fetchedAt: string;
  resoniteVersion?: string;
  totalCount: number;
  types: Record<string, ComponentDefinition>;
}

interface ProcessedOutput {
  generatedAt: string;
  resoniteVersion?: string;
  sourceFile: string;
  totalCount: number;
  nodes: ProcessedNodeDef[];
}

const PRIMITIVE_MAP: Record<string, string> = {
  'System.Single': 'Float',
  'System.Double': 'Double',
  'System.Int32': 'Int',
  'System.Int64': 'Long',
  'System.UInt32': 'UInt',
  'System.UInt64': 'ULong',
  'System.Boolean': 'Bool',
  'System.String': 'String',
  'System.Byte': 'Byte',
  'System.SByte': 'SByte',
  'System.Int16': 'Short',
  'System.UInt16': 'UShort',
  'System.Char': 'Char',
  'System.Object': 'Object',
};

function simplifyTypeName(fullType: string): string {
  // ジェネリックパラメータプレースホルダー T, U, TValue など
  if (/^[A-Z][A-Za-z]*$/.test(fullType)) return fullType;

  if (fullType in PRIMITIVE_MAP) return PRIMITIVE_MAP[fullType];

  // アセンブリ修飾子 "[Assembly]Namespace.TypeName" → "TypeName"
  const withoutAssembly = fullType.replace(/^\[[^\]]+\]/, '');
  const parts = withoutAssembly.split('.');
  const lastPart = parts[parts.length - 1] ?? fullType;

  // ジェネリック定義 "TypeName<>" → "TypeName" (バッククォートも除去)
  return lastPart.replace(/<>$/, '').replace(/`\d+$/, '');
}

/**
 * TypeReference から人間が読みやすいデータ型文字列を生成する
 * 例: INodeValueOutput<> { genericArguments: [{type: "float"}] } → "Float"
 */
function resolveTypeRef(typeRef: { type: string; genericArguments?: Array<{ type: string }> | null }): string {
  const args = typeRef.genericArguments;
  if (args && args.length > 0) {
    // 最初のジェネリック引数が実際のデータ型
    const argType = args[0]?.type ?? '';
    if (argType in PRIMITIVE_MAP) return PRIMITIVE_MAP[argType];
    if (argType) return simplifyTypeName(argType);
  }
  // 引数なし（ジェネリック定義か非ジェネリック）
  return simplifyTypeName(typeRef.type);
}


/** ProtoFlux ノードのメンバー種別を判定して入力 / 出力ポートに分類する
 *
 * ResoniteLink reflection API での ProtoFlux ポートのパターン:
 *
 *  データ入力  - reference to INodeValueOutput<T> or INodeObjectOutput<T>
 *                (他ノードの出力を参照する)
 *  データ出力  - empty member of NodeValueOutput<T> or NodeObjectOutput<T>
 *                (このノード自身が提供するデータ出力)
 *  フロー入力  - empty member of SyncNodeOperation
 *                (このノードへの実行フロー入力)
 *  フロー出力  - reference to INodeOperation
 *                (このノードから続く実行フロー出力)
 */
function classifyMember(
  _name: string,
  member: MemberDefinition,
): { role: 'input' | 'output' | 'ignore'; kind: 'data' | 'flow'; dataType: string } {
  if (member.$type === 'reference') {
    const targetType = member.targetType.type;

    // データ入力: 他ノードの値出力を参照
    if (targetType.includes('INodeValueOutput') || targetType.includes('INodeObjectOutput')) {
      return { role: 'input', kind: 'data', dataType: resolveTypeRef(member.targetType) };
    }

    // フロー出力: 実行を次のオペレーションへ渡す
    if (targetType.includes('INodeOperation')) {
      return { role: 'output', kind: 'flow', dataType: 'Operation' };
    }

    // その他の参照は無視 (IGlobalValueProxy, IVariable など)
    return { role: 'ignore', kind: 'data', dataType: '' };
  }

  if (member.$type === 'empty') {
    const raw = member as unknown as Record<string, unknown>;
    const typeField = raw['type'] as { type: string; genericArguments?: Array<{ type: string }> | null } | undefined;
    const fullType = typeField?.type ?? member.type ?? '';

    // データ出力: このノードが提供する値
    if (fullType.includes('NodeValueOutput') || fullType.includes('NodeObjectOutput')) {
      const dataType = typeField ? resolveTypeRef(typeField) : simplifyTypeName(fullType);
      return { role: 'output', kind: 'data', dataType };
    }

    // フロー入力: このノードへの実行トリガー
    if (fullType.includes('SyncNodeOperation') || fullType.includes('NodeImpulse')) {
      return { role: 'input', kind: 'flow', dataType: 'Impulse' };
    }

    return { role: 'ignore', kind: 'data', dataType: '' };
  }

  // field / array / list / syncObject は無視
  return { role: 'ignore', kind: 'data', dataType: '' };
}

function processComponent(typeName: string, def: ComponentDefinition): ProcessedNodeDef {
  const inputs: ProcessedPort[] = [];
  const outputs: ProcessedPort[] = [];

  for (const [memberName, member] of Object.entries(def.members)) {
    const { role, kind, dataType } = classifyMember(memberName, member);
    if (role === 'input') {
      inputs.push({ name: memberName, dataType, kind });
    } else if (role === 'output') {
      outputs.push({ name: memberName, dataType, kind });
    }
  }

  const category = def.categoryPath || 'ProtoFlux';
  const displayName = def.type.name;
  const isGeneric = def.type.isGenericType;

  return { type: typeName, category, displayName, isGeneric, inputs, outputs };
}

function main() {
  console.log(`Reading: ${IN_PATH}`);

  let raw: ProtofluxTypeData;
  try {
    raw = JSON.parse(readFileSync(IN_PATH, 'utf-8')) as ProtofluxTypeData;
  } catch {
    console.error('Input file not found. Run `npm run fetch-types` first.');
    process.exit(1);
  }

  console.log(`Processing ${raw.totalCount} types...`);

  const nodes: ProcessedNodeDef[] = [];
  for (const [typeName, def] of Object.entries(raw.types)) {
    nodes.push(processComponent(typeName, def));
  }

  const output: ProcessedOutput = {
    generatedAt: new Date().toISOString(),
    resoniteVersion: raw.resoniteVersion,
    sourceFile: 'protoflux-types.json',
    totalCount: nodes.length,
    nodes,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  const sizeKb = Math.round(readFileSync(OUT_PATH).length / 1024);
  console.log(`\nSaved to: ${OUT_PATH}`);
  console.log(`Size: ${sizeKb} KB`);
  console.log(`Total nodes: ${nodes.length}`);

  // サンプル表示
  const sample = nodes.find((n) => n.inputs.length > 0 || n.outputs.length > 0);
  if (sample) {
    console.log('\nSample node:');
    console.log(JSON.stringify(sample, null, 2));
  }
}

main();
