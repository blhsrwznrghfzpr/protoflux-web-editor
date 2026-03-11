import { nodeRegistry } from './node-registry';
import rawData from '@/data/protoflux-node-defs.json';

interface Port { name: string; dataType: string; kind: string; }
interface NodeDef {
  type: string;
  category: string;
  displayName: string;
  isGeneric?: boolean;
  genericParamNames?: string[];
  isExpanded?: boolean;
  hasGenericField?: boolean;
  inputs: Port[];
  outputs: Port[];
}
interface DatasetJson {
  generatedAt?: string;
  resoniteVersion?: string;
  nodes: NodeDef[];
}
const data = rawData as unknown as DatasetJson;

// データセットメタ情報を登録
if (data.generatedAt || data.resoniteVersion) {
  nodeRegistry.setDatasetMeta({
    generatedAt: data.generatedAt ?? 'unknown',
    resoniteVersion: data.resoniteVersion ?? 'unknown',
    totalCount: data.nodes.length,
  });
}

for (const node of data.nodes) {
  nodeRegistry.register({
    type: node.type,
    displayName: node.displayName,
    category: node.category,
    isGeneric: node.isGeneric ?? false,
    genericParamNames: node.genericParamNames ?? [],
    isExpanded: node.isExpanded ?? false,
    hasGenericField: node.hasGenericField ?? false,
    inputs: node.inputs.map((p) => ({ name: p.name, dataType: p.dataType })),
    outputs: node.outputs.map((p) => ({ name: p.name, dataType: p.dataType })),
    capabilities: { editable: false, renderable: true },
  });
}
