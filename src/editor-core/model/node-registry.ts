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
