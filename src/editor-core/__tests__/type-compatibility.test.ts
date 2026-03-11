import { describe, it, expect } from 'vitest';
import { checkTypeCompatibility, getCompatibleTypes } from '../services/type-compatibility';

describe('checkTypeCompatibility', () => {
  it('returns compatible for exact match', () => {
    const result = checkTypeCompatibility('Float', 'Float');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(false);
  });

  it('returns compatible with implicit for Int -> Float', () => {
    const result = checkTypeCompatibility('Int', 'Float');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(true);
  });

  it('returns incompatible for Float -> Int (no reverse conversion)', () => {
    const result = checkTypeCompatibility('Float', 'Int');
    expect(result.compatible).toBe(false);
  });

  it('returns incompatible for completely different types', () => {
    const result = checkTypeCompatibility('Bool', 'Float');
    expect(result.compatible).toBe(false);
  });

  it('supports Int -> Double', () => {
    const result = checkTypeCompatibility('Int', 'Double');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(true);
  });

  it('supports Float -> Double', () => {
    const result = checkTypeCompatibility('Float', 'Double');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(true);
  });

  it('matches case-insensitively: colorX == ColorX', () => {
    const result = checkTypeCompatibility('colorX', 'ColorX');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(false);
  });

  it('matches case-insensitively: float3 == Float3', () => {
    const result = checkTypeCompatibility('float3', 'Float3');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(false);
  });

  it('supports implicit conversion with mixed case: int -> Float', () => {
    const result = checkTypeCompatibility('int', 'Float');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(true);
  });
});

describe('getCompatibleTypes', () => {
  it('returns self type always', () => {
    expect(getCompatibleTypes('Bool')).toContain('Bool');
  });

  it('returns convertible types for Int', () => {
    const types = getCompatibleTypes('Int');
    expect(types).toContain('Int');
    expect(types).toContain('float');
    expect(types).toContain('double');
  });

  it('returns no extra types for Bool', () => {
    const types = getCompatibleTypes('Bool');
    expect(types).toEqual(['Bool']);
  });
});
