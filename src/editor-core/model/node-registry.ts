export interface NodeDefinition {
  type: string;
  /** パレットや UI に表示する名前。省略時は type をそのまま使う */
  displayName?: string;
  category: string;
  /** ジェネリックテンプレートか（デフォルト: false） */
  isGeneric?: boolean;
  /** ジェネリック型パラメータ名（デフォルト: []） */
  genericParamNames?: string[];
  /** 展開済みジェネリック具体型か（デフォルト: false） */
  isExpanded?: boolean;
  /** ジェネリックフィールドを持つか（デフォルト: false） */
  hasGenericField?: boolean;
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
  /** 配置可能なノードのみ返す（isGeneric=true かつ isExpanded=false のテンプレートを除外） */
  listPlaceable(): NodeDefinition[];
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

  listPlaceable(): NodeDefinition[] {
    return this.list().filter((d) => !(d.isGeneric === true && d.isExpanded !== true));
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
