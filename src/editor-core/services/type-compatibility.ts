/**
 * 型互換性チェック（設計書 6.1 / 6.2 対応）
 *
 * MVP: 厳格型（完全一致）
 * 将来拡張: 限定的暗黙変換を whitelist で管理
 *
 * Resonite では同じ型が大文字・小文字混在で出現する（例: colorX / ColorX, float3 / Float3）。
 * 比較時はケース非依存の正規キーで一致判定する。
 */

/** 暗黙変換ルールのホワイトリスト: [from, to]（正規化済みの lowercase で格納） */
const IMPLICIT_CONVERSIONS: ReadonlyArray<[string, string]> = [
  ['int', 'float'],
  ['int', 'double'],
  ['float', 'double'],
  ['byte', 'int'],
  ['byte', 'float'],
  ['short', 'int'],
  ['short', 'float'],
];

const conversionSet = new Set(
  IMPLICIT_CONVERSIONS.map(([from, to]) => `${from}->${to}`),
);

/**
 * 型名を比較用の正規キーに変換する（lowercase）。
 * 表示には使わず、互換性判定にのみ使う。
 */
function canonicalType(t: string): string {
  return t.toLowerCase();
}

/**
 * 2つの型が接続互換かどうか判定する。
 * @returns { compatible, implicit } implicit=true の場合は暗黙変換が発生する
 */
export function checkTypeCompatibility(
  outputType: string,
  inputType: string,
): { compatible: boolean; implicit: boolean } {
  const out = canonicalType(outputType);
  const inp = canonicalType(inputType);

  if (out === inp) {
    return { compatible: true, implicit: false };
  }
  if (conversionSet.has(`${out}->${inp}`)) {
    return { compatible: true, implicit: true };
  }
  return { compatible: false, implicit: false };
}

/**
 * 特定の型から暗黙変換可能な型の一覧を返す
 */
export function getCompatibleTypes(dataType: string): string[] {
  const result = [dataType];
  const canon = canonicalType(dataType);
  for (const [from, to] of IMPLICIT_CONVERSIONS) {
    if (from === canon) result.push(to);
  }
  return result;
}
