export interface Row {
  [key: string]: unknown;
}

export interface GraphNode {
  name: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  name?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function text(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function rowsOf(data: unknown): Row[] {
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
}

export function recordOf(value: unknown): Row | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : null;
}

export function treeOf(data: unknown): Row | null {
  if (Array.isArray(data)) {
    const nodes = rowsOf(data);
    if (nodes.length === 1) return nodes[0];
    if (nodes.length > 1) return { name: '全部', children: nodes };
    return null;
  }
  const node = recordOf(data);
  if (node && (node.name != null || node.children != null)) return node;
  return null;
}

export function setsOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item).trim()).filter(Boolean);
  return text(value)
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function graphOf(data: unknown): GraphData {
  const record = recordOf(data);
  let rawNodes: unknown = record?.nodes;
  let rawEdges: unknown = record?.edges ?? record?.links;

  if (!record && Array.isArray(data)) {
    for (const item of data) {
      const row = recordOf(item);
      if (!row) continue;
      if (Array.isArray(row.nodes) && Array.isArray(row.edges)) {
        rawNodes = row.nodes;
        rawEdges = row.edges;
        break;
      }
      if (row.source != null && row.target != null) {
        if (!Array.isArray(rawEdges)) rawEdges = [];
        (rawEdges as unknown[]).push(row);
      }
    }
  }

  const nodes: GraphNode[] = [];
  const seen = new Set<string>();
  const add = (name: string) => {
    if (!name || seen.has(name)) return;
    seen.add(name);
    nodes.push({ name });
  };

  for (const item of rowsOf(rawNodes)) add(text(item.name ?? item.id));
  const edges: GraphEdge[] = [];
  for (const item of rowsOf(rawEdges)) {
    const source = text(item.source);
    const target = text(item.target);
    if (!source || !target) continue;
    add(source);
    add(target);
    edges.push({ source, target, name: text(item.name) || undefined });
  }
  return { nodes, edges };
}

export function styleOf(config: Row): Row {
  return recordOf(config.style) ?? {};
}

export function percentNumber(value: unknown): number | null {
  const parsed = num(value);
  if (parsed == null) return null;
  const ratio = parsed > 1 && parsed <= 100 ? parsed / 100 : parsed;
  return Math.max(0, Math.min(1, ratio));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function shortText(value: unknown, max: number): string {
  const raw = text(value).trim();
  if (raw.length <= max) return raw;
  return `${raw.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function quantile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${round(value / 1_000_000)}m`;
  if (abs >= 10_000) return `${round(value / 1000)}k`;
  return round(value);
}

function round(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}
