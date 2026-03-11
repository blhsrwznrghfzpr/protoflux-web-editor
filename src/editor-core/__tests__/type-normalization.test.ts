import { describe, it, expect } from 'vitest';
import { normalizeDataType, normalizeDisplayName } from '../services/type-normalization';

describe('normalizeDataType', () => {
  it('maps System types to short names (lowercase)', () => {
    expect(normalizeDataType('System.Single')).toBe('float');
    expect(normalizeDataType('System.Int32')).toBe('int');
    expect(normalizeDataType('System.Boolean')).toBe('bool');
    expect(normalizeDataType('System.String')).toBe('string');
  });

  it('extracts generic argument types', () => {
    expect(normalizeDataType('ProtoFlux.Core.ObjectInput`1[System.Single]')).toBe('float');
    expect(normalizeDataType('ProtoFlux.Core.ValueOutput`1[System.Boolean]')).toBe('bool');
  });

  it('extracts short name from namespace', () => {
    expect(normalizeDataType('FrooxEngine.float3')).toBe('float3');
    expect(normalizeDataType('Elements.Core.color')).toBe('color');
  });

  it('returns short name for unknown types', () => {
    expect(normalizeDataType('Some.Custom.MyType')).toBe('MyType');
  });
});

describe('normalizeDisplayName', () => {
  it('converts full type to display name', () => {
    expect(normalizeDisplayName('FrooxEngine.ProtoFlux.GlobalValue`1[System.Single]')).toBe('GlobalValue<float>');
  });

  it('removes generic arity notation', () => {
    expect(normalizeDisplayName('FrooxEngine.ProtoFlux.ValueAdd`1[System.Int32]')).toBe('ValueAdd<int>');
  });

  it('handles non-generic types', () => {
    expect(normalizeDisplayName('FrooxEngine.ProtoFlux.If')).toBe('If');
  });
});
