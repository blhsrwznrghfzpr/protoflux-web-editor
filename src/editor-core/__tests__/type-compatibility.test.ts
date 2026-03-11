import { describe, it, expect } from 'vitest';
import { checkTypeCompatibility, getCompatibleTypes } from '../services/type-compatibility';

describe('checkTypeCompatibility', () => {
  it('returns compatible for exact match', () => {
    const result = checkTypeCompatibility('float', 'float');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(false);
  });

  it('returns compatible with implicit for int -> float', () => {
    const result = checkTypeCompatibility('int', 'float');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(true);
  });

  it('returns incompatible for float -> int (no reverse conversion)', () => {
    const result = checkTypeCompatibility('float', 'int');
    expect(result.compatible).toBe(false);
  });

  it('returns incompatible for completely different types', () => {
    const result = checkTypeCompatibility('bool', 'float');
    expect(result.compatible).toBe(false);
  });

  it('supports int -> double', () => {
    const result = checkTypeCompatibility('int', 'double');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(true);
  });

  it('supports float -> double', () => {
    const result = checkTypeCompatibility('float', 'double');
    expect(result.compatible).toBe(true);
    expect(result.implicit).toBe(true);
  });

  it('rejects mismatched case (data must be consistent)', () => {
    const result = checkTypeCompatibility('colorX', 'ColorX');
    expect(result.compatible).toBe(false);
  });
});

describe('getCompatibleTypes', () => {
  it('returns self type always', () => {
    expect(getCompatibleTypes('bool')).toContain('bool');
  });

  it('returns convertible types for int', () => {
    const types = getCompatibleTypes('int');
    expect(types).toContain('int');
    expect(types).toContain('float');
    expect(types).toContain('double');
  });

  it('returns no extra types for bool', () => {
    const types = getCompatibleTypes('bool');
    expect(types).toEqual(['bool']);
  });
});
