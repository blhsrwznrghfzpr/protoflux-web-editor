import { describe, it, expect, beforeAll } from 'vitest';
import { nodeRegistry } from '../model/node-registry';

beforeAll(() => {
  nodeRegistry.register({
    type: 'Test/FloatConst',
    category: 'Test/Constants',
    isGeneric: false,
    genericParamNames: [],
    isExpanded: false,
    hasGenericField: false,
    inputs: [],
    outputs: [{ name: 'value', dataType: 'float' }],
    capabilities: { editable: true, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/Add',
    category: 'Test/Math',
    isGeneric: false,
    genericParamNames: [],
    isExpanded: false,
    hasGenericField: false,
    inputs: [
      { name: 'a', dataType: 'float' },
      { name: 'b', dataType: 'float' },
    ],
    outputs: [{ name: 'result', dataType: 'float' }],
    capabilities: { editable: false, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/BoolConst',
    category: 'Test/Constants',
    isGeneric: false,
    genericParamNames: [],
    isExpanded: false,
    hasGenericField: false,
    inputs: [],
    outputs: [{ name: 'value', dataType: 'bool' }],
    capabilities: { editable: true, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/GenericTemplate',
    category: 'Test/Generic',
    isGeneric: true,
    genericParamNames: ['T'],
    isExpanded: false,
    hasGenericField: true,
    inputs: [{ name: 'input', dataType: 'T' }],
    outputs: [{ name: 'output', dataType: 'T' }],
    capabilities: { editable: false, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/GenericExpanded_Float',
    category: 'Test/Generic',
    isGeneric: true,
    genericParamNames: ['T'],
    isExpanded: true,
    hasGenericField: true,
    inputs: [{ name: 'input', dataType: 'float' }],
    outputs: [{ name: 'output', dataType: 'float' }],
    capabilities: { editable: false, renderable: true },
  });
});

describe('nodeRegistry', () => {
  it('has nodes registered', () => {
    expect(nodeRegistry.list().length).toBeGreaterThanOrEqual(3);
  });

  it('retrieves node by type', () => {
    const add = nodeRegistry.get('Test/Add');
    expect(add).toBeDefined();
    expect(add!.inputs).toHaveLength(2);
    expect(add!.outputs).toHaveLength(1);
  });

  it('returns undefined for unknown type', () => {
    expect(nodeRegistry.get('Unknown/Foo')).toBeUndefined();
  });

  it('lists categories', () => {
    const cats = nodeRegistry.categories();
    expect(cats).toContain('Test/Constants');
    expect(cats).toContain('Test/Math');
  });

  it('listPlaceable excludes non-expanded generic templates', () => {
    const placeable = nodeRegistry.listPlaceable();
    const types = placeable.map((d) => d.type);
    // テンプレート（isGeneric=true, isExpanded=false）は除外
    expect(types).not.toContain('Test/GenericTemplate');
    // 展開済み（isGeneric=true, isExpanded=true）は含む
    expect(types).toContain('Test/GenericExpanded_Float');
    // 非ジェネリックは含む
    expect(types).toContain('Test/FloatConst');
  });
});
