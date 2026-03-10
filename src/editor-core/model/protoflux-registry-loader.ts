import type { ComponentDefinition, MemberDefinition } from '@eth0fox/tsrl';
import type { NodeDefinition } from './node-registry';
import { nodeRegistry } from './node-registry';

export interface ProtofluxTypeData {
  fetchedAt: string;
  resoniteVersion?: string;
  totalCount: number;
  types: Record<string, ComponentDefinition>;
}

/**
 * MemberDefinition からポートのデータ型文字列を取得する
 */
function resolveDataType(member: MemberDefinition): string {
  switch (member.$type) {
    case 'field':
      return member.valueType.type;
    case 'reference':
      return member.targetType.type;
    case 'empty':
      return member.memberType.type;
    case 'list':
      return resolveDataType(member.elementDefinition);
    case 'array':
      return member.valueType.type;
    case 'syncObject':
      return member.type.type;
    default:
      return 'unknown';
  }
}

/**
 * ProtoFlux メンバーの型名からポートが入力かどうかを判定する
 */
function isInputPort(memberType: string): boolean {
  return (
    memberType.includes('ObjectInput') ||
    memberType.includes('ObjectArgument') ||
    memberType.includes('ValueInput') ||
    memberType.includes('ValueArgument') ||
    memberType.includes('Impulse')
  );
}

/**
 * ProtoFlux メンバーの型名からポートが出力かどうかを判定する
 */
function isOutputPort(memberType: string): boolean {
  return (
    memberType.includes('ObjectOutput') ||
    memberType.includes('ValueOutput') ||
    memberType.includes('Operation')
  );
}

/**
 * Resonite の完全型名からシンプルな表示名を取得する
 * e.g. "FrooxEngine.float3" -> "float3"
 * e.g. "ProtoFlux.Core.ObjectInput`1[System.Single]" -> "Float"
 */
function simplifyDataType(fullType: string): string {
  // ジェネリック引数を取り出す
  const genericMatch = fullType.match(/\[([^\]]+)\]$/);
  if (genericMatch) {
    return simplifyTypeName(genericMatch[1]);
  }
  return simplifyTypeName(fullType);
}

function simplifyTypeName(name: string): string {
  const typeMap: Record<string, string> = {
    'System.Single': 'Float',
    'System.Double': 'Double',
    'System.Int32': 'Int',
    'System.Int64': 'Long',
    'System.Boolean': 'Bool',
    'System.String': 'String',
    'System.Byte': 'Byte',
    'System.UInt32': 'UInt',
    'System.UInt64': 'ULong',
  };

  if (name in typeMap) return typeMap[name];

  // 名前空間を除いた短い名前を返す
  const parts = name.split('.');
  return parts[parts.length - 1] ?? name;
}

/**
 * ComponentDefinition を NodeDefinition に変換する
 */
export function componentDefToNodeDef(
  typeName: string,
  def: ComponentDefinition,
): NodeDefinition | null {
  const inputs: NodeDefinition['inputs'] = [];
  const outputs: NodeDefinition['outputs'] = [];

  for (const [memberName, member] of Object.entries(def.members)) {
    const memberTypeStr = resolveDataType(member);

    if (isInputPort(memberTypeStr)) {
      inputs.push({
        name: memberName,
        dataType: simplifyDataType(memberTypeStr),
      });
    } else if (isOutputPort(memberTypeStr)) {
      outputs.push({
        name: memberName,
        dataType: simplifyDataType(memberTypeStr),
      });
    }
  }

  // カテゴリはパスから取得
  const category = def.categoryPath || typeName.split('.').slice(0, -1).join('/');
  const shortName = def.type.name;

  return {
    type: typeName,
    category,
    inputs,
    outputs,
    capabilities: { editable: false, renderable: true },
    defaultParams: {},
    // ソート用にラベルを付与
    ...(shortName ? { label: shortName } : {}),
  };
}

/**
 * JSON ファイルから読み込んだ ProtofluxTypeData を nodeRegistry に登録する
 */
export function registerProtofluxTypes(data: ProtofluxTypeData): {
  registered: number;
  skipped: number;
} {
  let registered = 0;
  let skipped = 0;

  for (const [typeName, def] of Object.entries(data.types)) {
    const nodeDef = componentDefToNodeDef(typeName, def);
    if (nodeDef) {
      nodeRegistry.register(nodeDef);
      registered++;
    } else {
      skipped++;
    }
  }

  return { registered, skipped };
}
