/**
 * Parser for the GPT-Vis markdown-like grammar.
 *
 * This module is deliberately independent from VChart, React and the DOM so
 * servers and workers can validate model output without loading a renderer.
 */

export interface ParsedConfig {
  type: string;
  [key: string]: unknown;
}

export interface ParseOptions {
  /** Drop a trailing partial line so token streams can render before the newline. */
  streaming?: boolean;
}

const ARRAY_SECTIONS = new Set(['data', 'categories', 'series', 'nodes', 'edges']);
const OBJECT_SECTIONS = new Set(['style']);
const NAMED_BLOCK_SECTIONS = new Set(['nodes', 'edges']);

export function isVisSyntax(input: unknown): input is string {
  return typeof input === 'string' && input.trim().startsWith('vis ');
}

export function parse(syntax: string, options: ParseOptions = {}): ParsedConfig {
  const source = unwrapFence(syntax);
  const lines = tokenize(source, Boolean(options.streaming));
  const result: ParsedConfig = { type: '' };
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.indent === 0 && line.text.startsWith('vis ')) {
      result.type = line.text.slice(4).trim();
      index += 1;
      continue;
    }

    if (line.indent === 0 && ARRAY_SECTIONS.has(line.text)) {
      const parsed = readArrayLike(lines, index);
      if (parsed.value !== undefined) result[line.text] = parsed.value;
      index = parsed.next;
      continue;
    }

    if (line.indent === 0 && OBJECT_SECTIONS.has(line.text)) {
      const parsed = readStyle(lines, index);
      result[line.text] = parsed.value;
      index = parsed.next;
      continue;
    }

    if (line.indent === 0) {
      const pair = parseKeyValue(line.text);
      if (pair) result[pair.key] = parseValue(pair.value);
    }
    index += 1;
  }

  return result;
}

/** Accept vis syntax, JSON, or a config object. Incomplete JSON yields an empty type. */
export function readConfig(input: unknown, options: ParseOptions = {}): ParsedConfig {
  if (typeof input !== 'string') {
    if (input && typeof input === 'object') {
      const record = input as Record<string, unknown>;
      return { type: typeof record.type === 'string' ? record.type : '', ...record };
    }
    return { type: '' };
  }

  const trimmed = unwrapFence(input).trim();
  if (!trimmed) return { type: '' };
  if (options.streaming && isPartialVisStart(trimmed)) return { type: '' };
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return readConfig(JSON.parse(trimmed) as unknown, options);
    } catch {
      return { type: '' };
    }
  }
  if (!isVisSyntax(trimmed)) {
    return { type: 'summary', content: input };
  }
  return parse(trimmed, options);
}

function isPartialVisStart(trimmed: string): boolean {
  return trimmed === 'vis' || 'vis '.startsWith(trimmed);
}

function unwrapFence(syntax: string): string {
  const trimmed = syntax.trim();
  const fenced = trimmed.match(/^```[^\n]*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1] : syntax;
}

interface Line {
  text: string;
  indent: number;
}

function tokenize(syntax: string, streaming: boolean): Line[] {
  const normalized = syntax.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const raw = normalized.split('\n');
  if (streaming && raw.length > 0 && !normalized.endsWith('\n')) raw.pop();

  const lines: Line[] = [];
  for (const row of raw) {
    const text = row.trim();
    if (!text || text === '```') continue;
    lines.push({ text, indent: indentOf(row) });
  }
  return lines;
}

function indentOf(row: string): number {
  let width = 0;
  for (const char of row) {
    if (char === ' ') width += 1;
    else if (char === '\t') width += 2;
    else break;
  }
  return width;
}

function isBullet(text: string): boolean {
  return text.startsWith('-');
}

function bulletBody(text: string): string {
  return text.replace(/^-\s*/, '');
}

function isQuoted(value: string): boolean {
  if (value.length < 2) return false;
  const quote = value[0];
  return (quote === '"' || quote === "'") && value.endsWith(quote) && value.indexOf(quote, 1) === value.length - 1;
}

function parseValue(raw: string): unknown {
  const value = raw.trim();
  if (!value) return '';
  if (isQuoted(value)) return value.slice(1, -1);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value.startsWith('[') && value.endsWith(']')) {
    const body = value.slice(1, -1).trim();
    if (!body) return [];
    return body
      .split(',')
      .map((item) => parseValue(item.trim()))
      .filter((item) => item !== '');
  }
  const numeric = Number(value);
  if (value !== '' && Number.isFinite(numeric)) return numeric;
  return value;
}

function parseKeyValue(raw: string): { key: string; value: string } | null {
  const text = raw.trim();
  if (!text) return null;
  const assigned = text.match(/^([^:\s=]+)\s*[:=]\s*(.*)$/);
  if (assigned) return { key: assigned[1], value: assigned[2] };
  const spaced = text.match(/^(\S+)\s+(.*)$/);
  if (spaced) return { key: spaced[1], value: spaced[2] };
  return { key: text, value: '' };
}

function isScalarItem(body: string): boolean {
  if (isQuoted(body.trim())) return true;
  const pair = parseKeyValue(body);
  return !pair || pair.value === '';
}

function readArrayLike(lines: Line[], header: number): { value: unknown; next: number } {
  const base = lines[header].indent;
  const next = lines[header + 1];
  if (!next || next.indent <= base) return { value: undefined, next: header + 1 };

  if (NAMED_BLOCK_SECTIONS.has(next.text) && !isBullet(next.text)) {
    return readNamedBlocks(lines, header + 1, base);
  }

  if (!isBullet(next.text)) {
    return readTree(lines, header + 1, base);
  }

  const list = readList(lines, header + 1, base);
  return { value: list.items.length ? list.items : undefined, next: list.next };
}

function readNamedBlocks(lines: Line[], start: number, base: number): { value: Record<string, unknown>; next: number } {
  const value: Record<string, unknown> = {};
  let index = start;
  while (index < lines.length && lines[index].indent > base) {
    const line = lines[index];
    if (!isBullet(line.text)) {
      const pair = parseKeyValue(line.text);
      if (pair && NAMED_BLOCK_SECTIONS.has(pair.key)) {
        const list = readList(lines, index + 1, line.indent);
        value[pair.key] = list.items;
        index = list.next;
        continue;
      }
    }
    index += 1;
  }
  return { value, next: index };
}

function readTree(lines: Line[], start: number, base: number): { value: Record<string, unknown>; next: number } {
  const node: Record<string, unknown> = {};
  let index = start;
  while (index < lines.length && lines[index].indent > base) {
    const line = lines[index];
    const pair = parseKeyValue(line.text);
    if (!pair) {
      index += 1;
      continue;
    }
    if (pair.value === '') {
      const next = lines[index + 1];
      if (next && next.indent > line.indent) {
        if (isBullet(next.text)) {
          const list = readList(lines, index + 1, line.indent);
          node[pair.key] = list.items;
          index = list.next;
          continue;
        }
        if (pair.key === 'children' || pair.key === 'data') {
          const tree = readTree(lines, index + 1, line.indent);
          node[pair.key] = tree.value;
          index = tree.next;
          continue;
        }
      }
    }
    node[pair.key] = parseValue(pair.value);
    index += 1;
  }
  return { value: node, next: index };
}

function readList(lines: Line[], start: number, base: number): { items: unknown[]; next: number } {
  const items: unknown[] = [];
  let current: Record<string, unknown> | null = null;
  let scalars = false;
  let itemIndent = -1;
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    if (line.indent <= base) break;

    const sameLevel = isBullet(line.text) && (itemIndent === -1 || line.indent === itemIndent);
    if (sameLevel) {
      if (itemIndent === -1) itemIndent = line.indent;
      if (current && !scalars) items.push(current);
      const body = bulletBody(line.text);
      if (!body) {
        current = {};
        scalars = false;
      } else if (isScalarItem(body)) {
        scalars = true;
        current = null;
        items.push(parseValue(body));
      } else {
        scalars = false;
        current = {};
        const pair = parseKeyValue(body);
        if (pair) current[pair.key] = parseValue(pair.value);
      }
      index += 1;
      continue;
    }

    if (current && !scalars) {
      const pair = parseKeyValue(line.text);
      if (pair && pair.value === '' && pair.key === 'children') {
        const nested = readList(lines, index + 1, line.indent);
        current[pair.key] = nested.items;
        index = nested.next;
        continue;
      }
      if (pair && pair.value === '' && pair.key === 'data' && lines[index + 1]?.indent > line.indent) {
        const nested = readList(lines, index + 1, line.indent);
        current[pair.key] = nested.items;
        index = nested.next;
        continue;
      }
      if (pair) current[pair.key] = parseValue(pair.value);
    }
    index += 1;
  }

  if (current && !scalars) items.push(current);
  return { items, next: index };
}

function readStyle(lines: Line[], header: number): { value: Record<string, unknown>; next: number } {
  const value: Record<string, unknown> = {};
  const base = lines[header].indent;
  let index = header + 1;
  while (index < lines.length && lines[index].indent > base) {
    const line = lines[index];
    if (isBullet(line.text)) {
      index += 1;
      continue;
    }
    const pair = parseKeyValue(line.text);
    if (!pair) {
      index += 1;
      continue;
    }
    const upcoming = lines[index + 1];
    if (pair.value === '' && upcoming && upcoming.indent > line.indent) {
      if (isBullet(upcoming.text)) {
        const list = readList(lines, index + 1, line.indent);
        value[pair.key] = list.items;
        index = list.next;
        continue;
      }
      const tree = readStyle(lines, index);
      value[pair.key] = tree.value;
      index = tree.next;
      continue;
    }
    value[pair.key] = parseValue(pair.value);
    index += 1;
  }
  return { value, next: index };
}

