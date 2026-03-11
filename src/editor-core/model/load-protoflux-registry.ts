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
const data = rawData as unknown as { nodes: NodeDef[] };

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
