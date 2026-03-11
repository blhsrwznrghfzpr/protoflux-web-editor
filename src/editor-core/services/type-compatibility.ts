/**
 * 型互換性チェック（設計書 6.1 / 6.2 対応）
 *
 * MVP: 厳格型（完全一致）
 * 将来拡張: 限定的暗黙変換を whitelist で管理
 */

/** 暗黙変換ルールのホワイトリスト: [from, to] */
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
 * 2つの型が接続互換かどうか判定する。
 * @returns { compatible, implicit } implicit=true の場合は暗黙変換が発生する
 */
export function checkTypeCompatibility(
  outputType: string,
  inputType: string,
): { compatible: boolean; implicit: boolean } {
  if (outputType === inputType) {
    return { compatible: true, implicit: false };
  }
  if (conversionSet.has(`${outputType}->${inputType}`)) {
    return { compatible: true, implicit: true };
  }
  return { compatible: false, implicit: false };
}

/**
 * 特定の型から暗黙変換可能な型の一覧を返す
 */
export function getCompatibleTypes(dataType: string): string[] {
  const result = [dataType];
  for (const [from, to] of IMPLICIT_CONVERSIONS) {
    if (from === dataType) result.push(to);
  }
  return result;
}
