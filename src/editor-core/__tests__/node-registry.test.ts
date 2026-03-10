import { describe, it, expect } from 'vitest';
import { nodeRegistry } from '../model/node-registry';

describe('nodeRegistry', () => {
  it('has MVP nodes registered', () => {
    const all = nodeRegistry.list();
    expect(all.length).toBeGreaterThanOrEqual(12);
  });

  it('retrieves node by type', () => {
    const add = nodeRegistry.get('Math/Add');
    expect(add).toBeDefined();
    expect(add!.inputs).toHaveLength(2);
    expect(add!.outputs).toHaveLength(1);
  });

  it('returns undefined for unknown type', () => {
    expect(nodeRegistry.get('Unknown/Foo')).toBeUndefined();
  });

  it('lists categories', () => {
    const cats = nodeRegistry.categories();
    expect(cats).toContain('Constants');
    expect(cats).toContain('Math');
    expect(cats).toContain('Comparison');
    expect(cats).toContain('Control');
  });
});
