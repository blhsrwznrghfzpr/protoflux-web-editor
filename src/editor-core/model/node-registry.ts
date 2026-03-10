export interface NodeDefinition {
  type: string;
  category: string;
  inputs: Array<{ name: string; dataType: string }>;
  outputs: Array<{ name: string; dataType: string }>;
  defaultParams?: Record<string, unknown>;
  capabilities: {
    editable: boolean;
    renderable: boolean;
  };
  validate?: (params: Record<string, unknown>) => string[];
}

export interface NodeRegistry {
  get(type: string): NodeDefinition | undefined;
  list(): NodeDefinition[];
  register(definition: NodeDefinition): void;
  categories(): string[];
}

class NodeRegistryImpl implements NodeRegistry {
  private definitions = new Map<string, NodeDefinition>();

  get(type: string): NodeDefinition | undefined {
    return this.definitions.get(type);
  }

  list(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  register(definition: NodeDefinition): void {
    this.definitions.set(definition.type, definition);
  }

  categories(): string[] {
    const cats = new Set<string>();
    for (const def of this.definitions.values()) {
      cats.add(def.category);
    }
    return Array.from(cats).sort();
  }
}

export const nodeRegistry: NodeRegistry = new NodeRegistryImpl();

// --- MVP Node Definitions ---

// Constants
nodeRegistry.register({
  type: 'Constants/Bool',
  category: 'Constants',
  inputs: [],
  outputs: [{ name: 'value', dataType: 'Bool' }],
  defaultParams: { value: false },
  capabilities: { editable: true, renderable: true },
});

nodeRegistry.register({
  type: 'Constants/Int',
  category: 'Constants',
  inputs: [],
  outputs: [{ name: 'value', dataType: 'Int' }],
  defaultParams: { value: 0 },
  capabilities: { editable: true, renderable: true },
});

nodeRegistry.register({
  type: 'Constants/Float',
  category: 'Constants',
  inputs: [],
  outputs: [{ name: 'value', dataType: 'Float' }],
  defaultParams: { value: 0.0 },
  capabilities: { editable: true, renderable: true },
});

nodeRegistry.register({
  type: 'Constants/String',
  category: 'Constants',
  inputs: [],
  outputs: [{ name: 'value', dataType: 'String' }],
  defaultParams: { value: '' },
  capabilities: { editable: true, renderable: true },
});

// Math
nodeRegistry.register({
  type: 'Math/Add',
  category: 'Math',
  inputs: [
    { name: 'a', dataType: 'Float' },
    { name: 'b', dataType: 'Float' },
  ],
  outputs: [{ name: 'result', dataType: 'Float' }],
  capabilities: { editable: true, renderable: true },
});

nodeRegistry.register({
  type: 'Math/Sub',
  category: 'Math',
  inputs: [
    { name: 'a', dataType: 'Float' },
    { name: 'b', dataType: 'Float' },
  ],
  outputs: [{ name: 'result', dataType: 'Float' }],
  capabilities: { editable: true, renderable: true },
});

nodeRegistry.register({
  type: 'Math/Mul',
  category: 'Math',
  inputs: [
    { name: 'a', dataType: 'Float' },
    { name: 'b', dataType: 'Float' },
  ],
  outputs: [{ name: 'result', dataType: 'Float' }],
  capabilities: { editable: true, renderable: true },
});

nodeRegistry.register({
  type: 'Math/Div',
  category: 'Math',
  inputs: [
    { name: 'a', dataType: 'Float' },
    { name: 'b', dataType: 'Float' },
  ],
  outputs: [{ name: 'result', dataType: 'Float' }],
  capabilities: { editable: true, renderable: true },
});

// Comparison
nodeRegistry.register({
  type: 'Comparison/Equal',
  category: 'Comparison',
  inputs: [
    { name: 'a', dataType: 'Float' },
    { name: 'b', dataType: 'Float' },
  ],
  outputs: [{ name: 'result', dataType: 'Bool' }],
  capabilities: { editable: true, renderable: true },
});

nodeRegistry.register({
  type: 'Comparison/Greater',
  category: 'Comparison',
  inputs: [
    { name: 'a', dataType: 'Float' },
    { name: 'b', dataType: 'Float' },
  ],
  outputs: [{ name: 'result', dataType: 'Bool' }],
  capabilities: { editable: true, renderable: true },
});

nodeRegistry.register({
  type: 'Comparison/Less',
  category: 'Comparison',
  inputs: [
    { name: 'a', dataType: 'Float' },
    { name: 'b', dataType: 'Float' },
  ],
  outputs: [{ name: 'result', dataType: 'Bool' }],
  capabilities: { editable: true, renderable: true },
});

// Control
nodeRegistry.register({
  type: 'Control/Branch',
  category: 'Control',
  inputs: [
    { name: 'condition', dataType: 'Bool' },
    { name: 'trueValue', dataType: 'Float' },
    { name: 'falseValue', dataType: 'Float' },
  ],
  outputs: [{ name: 'result', dataType: 'Float' }],
  capabilities: { editable: true, renderable: true },
});
