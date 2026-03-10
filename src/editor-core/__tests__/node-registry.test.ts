import { describe, it, expect, beforeAll } from 'vitest';
import { nodeRegistry } from '../model/node-registry';

beforeAll(() => {
  nodeRegistry.register({
    type: 'Test/FloatConst',
    category: 'Test/Constants',
    inputs: [],
    outputs: [{ name: 'value', dataType: 'Float' }],
    capabilities: { editable: true, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/Add',
    category: 'Test/Math',
    inputs: [
      { name: 'a', dataType: 'Float' },
      { name: 'b', dataType: 'Float' },
    ],
    outputs: [{ name: 'result', dataType: 'Float' }],
    capabilities: { editable: false, renderable: true },
  });
  nodeRegistry.register({
    type: 'Test/BoolConst',
    category: 'Test/Constants',
    inputs: [],
    outputs: [{ name: 'value', dataType: 'Bool' }],
    capabilities: { editable: true, renderable: true },
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
});
