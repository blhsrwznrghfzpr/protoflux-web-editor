import { z } from 'zod/v4';

export const PortSchema = z.object({
  id: z.string(),
  name: z.string(),
  dataType: z.string(),
});

export const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  displayName: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  inputs: z.array(PortSchema),
  outputs: z.array(PortSchema),
  params: z.record(z.string(), z.unknown()).optional(),
  unknownRaw: z.record(z.string(), z.unknown()).optional(),
});

export const EdgeSchema = z.object({
  id: z.string(),
  from: z.object({ nodeId: z.string(), portId: z.string() }),
  to: z.object({ nodeId: z.string(), portId: z.string() }),
});

export const ProtofluxDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({
    name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    editorVersion: z.string().optional(),
    resoniteVersion: z.string().optional(),
    datasetGeneratedAt: z.string().optional(),
  }),
  graph: z.object({
    nodes: z.array(NodeSchema),
    edges: z.array(EdgeSchema),
  }),
  warnings: z.array(z.string()).optional(),
});
