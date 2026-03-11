/**
 * 型文字列の正規化ユーティリティ（設計書 16.2）
 *
 * `type` は C# フル型名を canonical key として保持。
 * `displayName` は UI 表示用。
 * `dataType` はポート型名（短縮形）。
 *
 * このモジュールはフル型名 → 短縮表示名 の変換を提供する。
 */

/** C# 標準型名 → 短縮表示名のマッピング */
const SYSTEM_TYPE_MAP: Record<string, string> = {
  'System.Single': 'Float',
  'System.Double': 'Double',
  'System.Int32': 'Int',
  'System.Int64': 'Long',
  'System.Boolean': 'Bool',
  'System.String': 'String',
  'System.Byte': 'Byte',
  'System.UInt16': 'UShort',
  'System.UInt32': 'UInt',
  'System.UInt64': 'ULong',
  'System.Int16': 'Short',
  'System.Object': 'Object',
};

/**
 * C# フル型名から短縮表示名を取得する。
 * 例: "System.Single" → "Float"
 * 例: "FrooxEngine.float3" → "float3"
 * 例: "ProtoFlux.Core.ObjectInput`1[System.Single]" → "Float"
 */
export function normalizeDataType(fullType: string): string {
  // 直接マッチ
  if (fullType in SYSTEM_TYPE_MAP) {
    return SYSTEM_TYPE_MAP[fullType];
  }

  // ジェネリック引数 [T] を取り出す
  const genericMatch = fullType.match(/\[([^\]]+)\]$/);
  if (genericMatch) {
    const inner = genericMatch[1];
    if (inner in SYSTEM_TYPE_MAP) {
      return SYSTEM_TYPE_MAP[inner];
    }
    return extractShortName(inner);
  }

  return extractShortName(fullType);
}

/**
 * 名前空間を除いた短い名前を返す。
 * 例: "FrooxEngine.float3" → "float3"
 */
function extractShortName(name: string): string {
  const parts = name.split('.');
  return parts[parts.length - 1] ?? name;
}

/**
 * C# フル型名から表示用のノード名を取得する。
 * ジェネリック記号 `N を除去し、名前空間を短縮する。
 * 例: "FrooxEngine.ProtoFlux.GlobalValue`1[bool]" → "GlobalValue<bool>"
 */
export function normalizeDisplayName(fullType: string): string {
  let name = extractShortName(fullType.replace(/\[.*\]$/, ''));

  // ジェネリックアリティ表記を除去
  name = name.replace(/`\d+$/, '');

  // ジェネリック引数があれば付与
  const genericMatch = fullType.match(/\[([^\]]+)\]$/);
  if (genericMatch) {
    const param = normalizeDataType(genericMatch[1]);
    name = `${name}<${param}>`;
  }

  return name;
}
