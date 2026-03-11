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

// ---- 型定義 ----------------------------------------------------------------

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
  /** ジェネリックパラメータ名のリスト ("T", "T0" など) */
  genericParamNames: string[];
  /** 展開済みの具体的な型を持つノードか */
  isExpanded: boolean;
  /** ジェネリックフィールド (ValueInput パターン) を持つか */
  hasGenericField: boolean;
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

// ---- プリミティブ型リスト --------------------------------------------------

const SYSTEM_TYPE_MAP: Record<string, string> = {
  'System.Single': 'float',
  'System.Double': 'double',
  'System.Int32': 'int',
  'System.Int64': 'long',
  'System.UInt32': 'uint',
  'System.UInt64': 'ulong',
  'System.Boolean': 'bool',
  'System.String': 'string',
  'System.Byte': 'byte',
  'System.SByte': 'sbyte',
  'System.Int16': 'short',
  'System.UInt16': 'ushort',
  'System.Char': 'char',
  'System.Object': 'object',
};

/** struct 制約を満たすプリミティブ型 (Resonite 内部型名, 表示名) */
const STRUCT_PRIMITIVE_TYPES: Array<[string, string]> = [
  ['bool', 'bool'],
  ['byte', 'byte'],
  ['sbyte', 'sbyte'],
  ['short', 'short'],
  ['ushort', 'ushort'],
  ['int', 'int'],
  ['uint', 'uint'],
  ['long', 'long'],
  ['ulong', 'ulong'],
  ['float', 'float'],
  ['double', 'double'],
  ['float2', 'float2'],
  ['float3', 'float3'],
  ['float4', 'float4'],
  ['floatQ', 'floatQ'],
  ['color', 'color'],
  ['colorX', 'colorX'],
];

/** 参照型 (class 制約 / 制約なし の Object ノード向け) */
const REFERENCE_TYPES: Array<[string, string]> = [
  ['string', 'string'],
  ['User', 'User'],
  ['Slot', 'Slot'],
];

// ---- 型名ユーティリティ ----------------------------------------------------

function simplifyTypeName(fullType: string): string {
  if (/^[A-Z][A-Za-z0-9]*$/.test(fullType)) return fullType;  // ジェネリックパラメータ
  if (fullType in SYSTEM_TYPE_MAP) return SYSTEM_TYPE_MAP[fullType];
  const withoutAssembly = fullType.replace(/^\[[^\]]+\]/, '');
  const parts = withoutAssembly.split('.');
  const lastPart = parts[parts.length - 1] ?? fullType;
  return lastPart.replace(/<>$/, '').replace(/`\d+$/, '');
}

function resolveTypeRef(typeRef: { type: string; genericArguments?: Array<{ type: string }> | null }): string {
  const args = typeRef.genericArguments;
  if (args && args.length > 0) {
    const argType = args[0]?.type ?? '';
    if (argType in SYSTEM_TYPE_MAP) return SYSTEM_TYPE_MAP[argType];
    if (argType) return simplifyTypeName(argType);
  }
  return simplifyTypeName(typeRef.type);
}

// ---- メンバー分類 ----------------------------------------------------------

function classifyMember(
  _name: string,
  member: MemberDefinition,
): { role: 'input' | 'output' | 'ignore'; kind: 'data' | 'flow'; dataType: string } {
  if (member.$type === 'reference') {
    const targetType = member.targetType.type;
    if (targetType.includes('INodeValueOutput') || targetType.includes('INodeObjectOutput')) {
      return { role: 'input', kind: 'data', dataType: resolveTypeRef(member.targetType) };
    }
    if (targetType.includes('INodeOperation')) {
      return { role: 'output', kind: 'flow', dataType: 'Operation' };
    }
    return { role: 'ignore', kind: 'data', dataType: '' };
  }

  if (member.$type === 'empty') {
    const raw = member as unknown as Record<string, unknown>;
    const typeField = raw['type'] as { type: string; genericArguments?: Array<{ type: string }> | null } | undefined;
    const fullType = typeField?.type ?? member.type ?? '';
    if (fullType.includes('NodeValueOutput') || fullType.includes('NodeObjectOutput')) {
      return { role: 'output', kind: 'data', dataType: typeField ? resolveTypeRef(typeField) : simplifyTypeName(fullType) };
    }
    if (fullType.includes('SyncNodeOperation') || fullType.includes('NodeImpulse')) {
      return { role: 'input', kind: 'flow', dataType: 'Impulse' };
    }
    return { role: 'ignore', kind: 'data', dataType: '' };
  }

  return { role: 'ignore', kind: 'data', dataType: '' };
}

// ---- コンポーネント処理 ----------------------------------------------------

function processComponent(typeName: string, def: ComponentDefinition): ProcessedNodeDef {
  const inputs: ProcessedPort[] = [];
  const outputs: ProcessedPort[] = [];

  let hasGenericField = false;
  let genericFieldName = '';

  for (const [memberName, member] of Object.entries(def.members)) {
    // ジェネリックフィールド (ValueInput パターン) の検出
    if (
      member.$type === 'field' &&
      (member.valueType as { isGenericParameter?: boolean }).isGenericParameter === true
    ) {
      hasGenericField = true;
      genericFieldName = memberName;
      continue;
    }

    const { role, kind, dataType } = classifyMember(memberName, member);
    if (role === 'input') inputs.push({ name: memberName, dataType, kind });
    else if (role === 'output') outputs.push({ name: memberName, dataType, kind });
  }

  // ValueInput パターン: ジェネリックフィールドがあり出力なし → フィールドを暗黙的出力として扱う
  if (hasGenericField && outputs.filter(o => o.kind === 'data').length === 0) {
    outputs.push({ name: genericFieldName, dataType: 'T', kind: 'data' });
  }

  const category = def.categoryPath || 'ProtoFlux';
  const displayName = def.type.name;
  const isGeneric = def.type.isGenericType;

  // ジェネリックパラメータ名を収集 (ポートの dataType に現れるもの)
  const paramNamesInPorts = new Set<string>();
  for (const p of [...inputs, ...outputs]) {
    if (/^[A-Z][A-Za-z0-9]*$/.test(p.dataType)) paramNamesInPorts.add(p.dataType);
  }
  const genericParamNames = def.type.genericParameters?.map(p => p.name) ?? [];

  return {
    type: typeName,
    category,
    displayName,
    isGeneric,
    genericParamNames,
    isExpanded: false,
    hasGenericField,
    inputs,
    outputs,
  };
}

// ---- ジェネリック展開 -------------------------------------------------------

/**
 * 単一ジェネリックパラメータのノードを各プリミティブ型に展開する
 *
 * - struct 制約あり → STRUCT_PRIMITIVE_TYPES
 * - 制約なし / class → ALL_PRIMITIVE_TYPES
 */
function expandGenericNodes(
  nodes: ProcessedNodeDef[],
  rawTypes: ProtofluxTypeData['types'],
): ProcessedNodeDef[] {
  const result: ProcessedNodeDef[] = [];

  for (const node of nodes) {
    // 単一ジェネリックパラメータかつ <> を含む型のみ展開
    if (
      !node.isGeneric ||
      node.genericParamNames.length !== 1 ||
      !node.type.includes('<>')
    ) {
      result.push(node);
      continue;
    }

    const paramName = node.genericParamNames[0]!;
    const rawDef = rawTypes[node.type];
    const param = rawDef?.type.genericParameters?.find(p => p.name === paramName);

    // 展開対象の型リストを決定: struct 制約あり → プリミティブ型、それ以外 → 参照型
    const typesToExpand: Array<[string, string]> =
      param?.struct === true ? STRUCT_PRIMITIVE_TYPES : REFERENCE_TYPES;

    // ジェネリック定義はそのまま残す（テンプレートとして）
    result.push(node);

    for (const [resoniteName, displayName] of typesToExpand) {
      const expandedType = node.type.replace('<>', `<>[${resoniteName}]`);
      const expandedDisplayName = `${node.displayName}<${displayName}>`;

      const substituteType = (dataType: string): string =>
        dataType === paramName ? resoniteName : dataType;

      const expandedInputs = node.inputs.map(p => ({
        ...p,
        dataType: substituteType(p.dataType),
      }));

      const expandedOutputs = node.outputs.map(p => ({
        ...p,
        dataType: substituteType(p.dataType),
      }));

      // 計算ノード: T 型の入力はあるが data 出力がない → 暗黙的な出力を追加
      const hasDataOutputs = expandedOutputs.some(p => p.kind === 'data');
      const hasTInputs = expandedInputs.some(p => p.kind === 'data');
      if (hasTInputs && !hasDataOutputs) {
        expandedOutputs.push({ name: '*', dataType: resoniteName, kind: 'data' });
      }

      result.push({
        type: expandedType,
        category: node.category,
        displayName: expandedDisplayName,
        isGeneric: false,
        genericParamNames: [],
        isExpanded: true,
        hasGenericField: node.hasGenericField,
        inputs: expandedInputs,
        outputs: expandedOutputs,
      });
    }
  }

  return result;
}

// ---- main ------------------------------------------------------------------

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

  console.log(`Expanding generic nodes...`);
  const expanded = expandGenericNodes(nodes, raw.types);

  const expandedCount = expanded.filter(n => n.isExpanded).length;
  console.log(`Expanded: ${expandedCount} concrete instances from generic nodes`);

  const output: ProcessedOutput = {
    generatedAt: new Date().toISOString(),
    resoniteVersion: raw.resoniteVersion,
    sourceFile: 'protoflux-types.json',
    totalCount: expanded.length,
    nodes: expanded,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  const sizeKb = Math.round(readFileSync(OUT_PATH).length / 1024);
  console.log(`\nSaved to: ${OUT_PATH}`);
  console.log(`Size: ${sizeKb} KB`);
  console.log(`Total nodes: ${expanded.length} (${raw.totalCount} original + ${expandedCount} expanded)`);

  // サンプル表示 (ValueInput<float>)
  const sample = expanded.find(n => n.displayName === 'ValueInput<float>');
  if (sample) {
    console.log('\nSample (ValueInput<float>):');
    console.log(JSON.stringify(sample, null, 2));
  }
  const addSample = expanded.find(n => n.displayName === 'ValueAdd<float>');
  if (addSample) {
    console.log('\nSample (ValueAdd<float>):');
    console.log(JSON.stringify(addSample, null, 2));
  }
}

main();
