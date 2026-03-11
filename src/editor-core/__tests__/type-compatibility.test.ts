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
});

describe('getCompatibleTypes', () => {
  it('returns self type always', () => {
    expect(getCompatibleTypes('Bool')).toContain('Bool');
  });

  it('returns convertible types for Int', () => {
    const types = getCompatibleTypes('Int');
    expect(types).toContain('Int');
    expect(types).toContain('Float');
    expect(types).toContain('Double');
  });

  it('returns no extra types for Bool', () => {
    const types = getCompatibleTypes('Bool');
    expect(types).toEqual(['Bool']);
  });
});
