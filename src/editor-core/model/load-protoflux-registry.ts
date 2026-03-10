import { nodeRegistry } from './node-registry';
import rawData from '@/data/protoflux-node-defs.json';

interface Port { name: string; dataType: string; kind: string; }
interface NodeDef { type: string; category: string; inputs: Port[]; outputs: Port[]; }
const data = rawData as unknown as { nodes: NodeDef[] };

for (const node of data.nodes) {
  nodeRegistry.register({
    type: node.type,
    category: node.category,
    inputs: node.inputs.map((p) => ({ name: p.name, dataType: p.dataType })),
    outputs: node.outputs.map((p) => ({ name: p.name, dataType: p.dataType })),
    capabilities: { editable: false, renderable: true },
  });
}
