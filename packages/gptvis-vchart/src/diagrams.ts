import { escapeHtml } from './text.js';
import type { ResolvedThemeTokens } from './theme.js';
import {
  clamp,
  formatNumber,
  graphOf,
  hashString,
  num,
  recordOf,
  seededRandom,
  shortText,
  styleOf,
  text,
  treeOf,
  type GraphData,
  type GraphEdge,
  type GraphNode,
  type Row,
} from './util.js';

type GraphMode = 'force' | 'circular' | 'grid' | 'radial' | 'concentric' | 'dagre';

interface Point {
  x: number;
  y: number;
}

interface PositionedNode extends Point {
  name: string;
  degree: number;
}

interface GraphSeed {
  name: string;
  degree: number;
}

interface TreeNode {
  id: number;
  label: string;
  description: string;
  depth: number;
  children: TreeNode[];
}

interface LayoutNode extends TreeNode {
  x: number;
  y: number;
  branch: number;
}

const GRAPH_WIDTH = 920;
const GRAPH_HEIGHT = 540;
const FONT = '"IBM Plex Sans", "PingFang SC", "Microsoft YaHei", sans-serif';

export function renderNetwork(
  config: Row,
  theme: ResolvedThemeTokens,
  mode: GraphMode = 'force',
): string | null {
  const graph = graphOf(config.data);
  if (!graph.nodes.length) return null;
  const layoutMode = graphMode(config.layout) ?? mode;
  const placed = placeGraph(graph, layoutMode);
  const positions = new Map(placed.nodes.map((node) => [node.name, node]));
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  const ink = inkOnFill(theme);
  const edgeMarkup = graph.edges
    .map((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return '';
      const mx = (source.x + target.x) / 2;
      const my = (source.y + target.y) / 2;
      return `
        <line x1="${n(source.x)}" y1="${n(source.y)}" x2="${n(target.x)}" y2="${n(target.y)}" stroke="${theme.muted}" stroke-opacity="0.48" stroke-width="1.5"/>
        ${edge.name ? `<text class="gpv-edge-label" x="${n(mx)}" y="${n(my - 7)}" text-anchor="middle">${escapeHtml(shortText(edge.name, 18))}</text>` : ''}`;
    })
    .join('');

  const nodeMarkup = placed.nodes
    .map((node, index) => {
      const color = theme.palette[index % theme.palette.length];
      const radius = clamp(19 + Math.sqrt(node.degree + 1) * 4.8, 22, 34);
      const lines = wrapLabel(node.name, radius > 28 ? 7 : 6, 2);
      const lineHeight = 13;
      const startY = node.y - ((lines.length - 1) * lineHeight) / 2 + 4;
      const label = lines
        .map(
          (line, lineIndex) =>
            `<tspan x="${n(node.x)}" y="${n(startY + lineIndex * lineHeight)}">${escapeHtml(line)}</tspan>`,
        )
        .join('');
      return `
        <g class="gpv-graph-node">
          <title>${escapeHtml(node.name)}</title>
          <circle cx="${n(node.x)}" cy="${n(node.y)}" r="${n(radius)}" fill="${color}" stroke="${theme.background}" stroke-width="3"/>
          <text x="${n(node.x)}" y="${n(node.y)}" text-anchor="middle" fill="${ink}" font-size="16" font-weight="600" font-family='${FONT}'>${label}</text>
        </g>`;
    })
    .join('');

  const svg = `<svg viewBox="0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}" role="img" aria-label="${escapeHtml(title || '网络图')}">${edgeMarkup}${nodeMarkup}</svg>`;
  return frame(title, subtitle, svg, theme, '网络图', GRAPH_WIDTH, 600);
}

export function renderFlow(config: Row, theme: ResolvedThemeTokens): string | null {
  const graph = graphOf(config.data);
  if (!graph.nodes.length) return null;
  const layers = layeredGraph(graph);
  const maxCount = Math.max(1, ...layers.map((layer) => layer.length));
  const width = Math.max(760, layers.length * 190 + 100);
  const height = Math.max(430, maxCount * 88 + 100);
  const positions = new Map<string, Point>();
  const columnGap = layers.length > 1 ? (width - 180) / (layers.length - 1) : 0;
  layers.forEach((layer, layerIndex) => {
    const x = 90 + layerIndex * columnGap;
    const rowGap = height / (layer.length + 1);
    layer.forEach((name, rowIndex) => {
      positions.set(name, { x, y: rowGap * (rowIndex + 1) });
    });
  });

  const boxWidth = 138;
  const boxHeight = 52;
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  const markerId = 'gpv-arrow';
  const edgeMarkup = graph.edges
    .map((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return '';
      const x1 = source.x + boxWidth / 2;
      const y1 = source.y;
      const x2 = target.x - boxWidth / 2;
      const y2 = target.y;
      const dx = Math.max(28, Math.abs(x2 - x1) * 0.48);
      const path =
        x2 >= x1
          ? `M ${n(x1)} ${n(y1)} C ${n(x1 + dx)} ${n(y1)}, ${n(x2 - dx)} ${n(y2)}, ${n(x2)} ${n(y2)}`
          : `M ${n(x1)} ${n(y1)} C ${n(x1 + 46)} ${n(y1 + 50)}, ${n(x2 - 46)} ${n(y2 + 50)}, ${n(x2)} ${n(y2)}`;
      const lx = (x1 + x2) / 2;
      const ly = (y1 + y2) / 2 - 7;
      return `
        <path d="${path}" fill="none" stroke="${theme.muted}" stroke-opacity="0.62" stroke-width="1.6" marker-end="url(#${markerId})"/>
        ${edge.name ? `<text class="gpv-edge-label" x="${n(lx)}" y="${n(ly)}" text-anchor="middle">${escapeHtml(shortText(edge.name, 16))}</text>` : ''}`;
    })
    .join('');

  const nodes = graph.nodes
    .map((node, index) => {
      const point = positions.get(node.name);
      if (!point) return '';
      const color = theme.palette[index % theme.palette.length];
      const x = point.x - boxWidth / 2;
      const y = point.y - boxHeight / 2;
      return `
        <g class="gpv-flow-node">
          <title>${escapeHtml(node.name)}</title>
          <rect x="${n(x)}" y="${n(y)}" width="${boxWidth}" height="${boxHeight}" rx="12" fill="${theme.background}" stroke="${color}" stroke-width="2"/>
          <rect x="${n(x)}" y="${n(y)}" width="5" height="${boxHeight}" rx="2.5" fill="${color}"/>
          <text x="${n(point.x + 2)}" y="${n(point.y + 4)}" text-anchor="middle" fill="${theme.text}" font-size="20" font-weight="600" font-family='${FONT}'>${escapeHtml(shortText(node.name, 15))}</text>
        </g>`;
    })
    .join('');

  const svg = `
    <svg viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-label="${escapeHtml(title || '流程图')}">
      <defs>
        <marker id="${markerId}" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L7,3 z" fill="${theme.muted}"/>
        </marker>
      </defs>
      ${edgeMarkup}
      ${nodes}
    </svg>`;
  return frame(title, subtitle, svg, theme, '流程图', width, Math.max(460, height));
}

export function renderMindmap(config: Row, theme: ResolvedThemeTokens): string | null {
  const rootRow = treeOf(config.data);
  if (!rootRow) return null;
  const root = normalizeTree(rootRow);
  if (!root) return null;
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  const direction = config.direction === 'LR' || config.direction === 'RL' ? config.direction : 'H';
  const result =
    direction === 'H'
      ? mindmapBothSides(root, theme, title)
      : mindmapHorizontal(root, theme, title, direction);
  return frame(title, subtitle, result.svg, theme, '思维导图', result.width, result.height);
}

export function renderIndentedTree(config: Row, theme: ResolvedThemeTokens): string | null {
  const rootRow = treeOf(config.data);
  if (!rootRow) return null;
  const root = normalizeTree(rootRow);
  if (!root) return null;
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  const rows = flattenTree(root);
  const rowHeight = 31;
  const width = 860;
  const height = Math.max(360, 86 + rows.length * rowHeight);
  const reverse = config.direction === 'RL';
  const baseX = reverse ? width - 70 : 70;
  const stepX = 30;
  const points = new Map<number, Point>();
  rows.forEach((entry, index) => {
    points.set(entry.node.id, {
      x: baseX + (reverse ? -1 : 1) * entry.depth * stepX,
      y: 64 + index * rowHeight,
    });
  });

  const connectors = rows
    .filter((entry) => entry.parent != null)
    .map((entry) => {
      const point = points.get(entry.node.id);
      const parent = points.get(entry.parent as number);
      if (!point || !parent) return '';
      return `<path d="M ${n(parent.x)} ${n(parent.y + 10)} V ${n(point.y)} H ${n(point.x)}" fill="none" stroke="${theme.grid}" stroke-width="1.5"/>`;
    })
    .join('');

  const labels = rows
    .map((entry, index) => {
      const point = points.get(entry.node.id);
      if (!point) return '';
      const color = theme.palette[(entry.depth + index) % theme.palette.length];
      const anchor = reverse ? 'end' : 'start';
      const tx = point.x + (reverse ? -12 : 12);
      const weight = entry.depth === 0 ? 700 : entry.depth === 1 ? 600 : 500;
      return `
        <g class="gpv-indent-row">
          <title>${escapeHtml(entry.node.label)}</title>
          <circle cx="${n(point.x)}" cy="${n(point.y)}" r="${entry.depth === 0 ? 5 : 3.5}" fill="${entry.depth === 0 ? theme.palette[0] : color}"/>
          <text x="${n(tx)}" y="${n(point.y + 4)}" text-anchor="${anchor}" fill="${theme.text}" font-size="${entry.depth === 0 ? 18 : 17}" font-weight="${weight}" font-family='${FONT}'>${escapeHtml(shortText(entry.node.label, 48))}</text>
          ${entry.node.description ? `<text class="gpv-secondary" x="${n(tx)}" y="${n(point.y + 18)}" text-anchor="${anchor}">${escapeHtml(shortText(entry.node.description, 58))}</text>` : ''}
        </g>`;
    })
    .join('');

  const svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title || '缩进树')}">${connectors}${labels}</svg>`;
  return frame(title, subtitle, svg, theme, '缩进树', width, Math.max(400, height));
}

export function renderOrganization(config: Row, theme: ResolvedThemeTokens): string | null {
  const rootRow = treeOf(config.data);
  if (!rootRow) return null;
  const root = normalizeTree(rootRow);
  if (!root) return null;
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  const leafCount = countLeaves(root);
  const width = Math.max(760, leafCount * 168 + 60);
  const depth = treeDepth(root);
  const height = Math.max(420, 94 + depth * 106);
  const nodes: LayoutNode[] = [];
  placeOrganization(root, 0, 30, width - 60, 0, nodes);
  const nodeWidth = 150;
  const nodeHeight = 62;
  const positions = new Map(nodes.map((node) => [node.id, node]));
  const connectors = nodes
    .filter((node) => node.depth > 0)
    .map((node) => {
      const parent = nodes.find((candidate) => candidate.depth === node.depth - 1 && descendantOf(root, node.id, candidate.id));
      if (!parent) return '';
      const x1 = parent.x;
      const y1 = parent.y + nodeHeight / 2;
      const x2 = node.x;
      const y2 = node.y - nodeHeight / 2;
      const mid = (y1 + y2) / 2;
      return `<path d="M ${n(x1)} ${n(y1)} V ${n(mid)} H ${n(x2)} V ${n(y2)}" fill="none" stroke="${theme.grid}" stroke-width="1.6"/>`;
    })
    .join('');

  const boxes = nodes
    .map((node) => {
      const color = theme.palette[node.depth % theme.palette.length];
      const strong = node.depth === 0;
      const fill = strong ? color : theme.background;
      const ink = strong ? inkOnFill(theme) : theme.text;
      const x = node.x - nodeWidth / 2;
      const y = node.y - nodeHeight / 2;
      return `
        <g class="gpv-org-node">
          <title>${escapeHtml(node.label)}${node.description ? ` · ${escapeHtml(node.description)}` : ''}</title>
          <rect x="${n(x)}" y="${n(y)}" width="${nodeWidth}" height="${nodeHeight}" rx="12" fill="${fill}" stroke="${color}" stroke-width="${strong ? 0 : 1.7}"/>
          <text x="${n(node.x)}" y="${n(node.y + (node.description ? -5 : 4))}" text-anchor="middle" fill="${ink}" font-size="17" font-weight="600" font-family='${FONT}'>${escapeHtml(shortText(node.label, 16))}</text>
          ${node.description ? `<text x="${n(node.x)}" y="${n(node.y + 16)}" text-anchor="middle" fill="${strong ? ink : theme.muted}" fill-opacity="${strong ? 0.82 : 1}" font-size="14" font-family='${FONT}'>${escapeHtml(shortText(node.description, 22))}</text>` : ''}
        </g>`;
    })
    .join('');

  const svg = `<svg viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-label="${escapeHtml(title || '组织架构')}">${connectors}${boxes}</svg>`;
  const minWidth = Math.min(1180, width);
  return frame(title, subtitle, svg, theme, '组织架构', width, Math.max(430, height), minWidth);
}

export function renderFishbone(config: Row, theme: ResolvedThemeTokens): string | null {
  const rootRow = treeOf(config.data);
  if (!rootRow) return null;
  const root = normalizeTree(rootRow);
  if (!root) return null;
  const causes = root.children.slice(0, 9);
  const width = 980;
  const height = 540;
  const spineY = height / 2;
  const tailX = 48;
  const headX = 788;
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  const bones: string[] = [];
  const spacing = causes.length ? (headX - 160) / Math.max(1, causes.length) : 0;

  causes.forEach((cause, index) => {
    const up = index % 2 === 0;
    const x = 112 + spacing * index;
    const endX = Math.min(headX - 70, x + 84);
    const endY = up ? 112 : height - 112;
    const color = theme.palette[(index + 1) % theme.palette.length];
    bones.push(
      `<line x1="${n(x)}" y1="${spineY}" x2="${n(endX)}" y2="${n(endY)}" stroke="${color}" stroke-width="2.3"/>`,
    );
    const anchor = up ? 'start' : 'start';
    bones.push(
      `<text class="gpv-bone" x="${n(endX + 6)}" y="${n(endY + (up ? -8 : 18))}" text-anchor="${anchor}" fill="${theme.text}">${escapeHtml(shortText(cause.label, 18))}</text>`,
    );
    cause.children.slice(0, 5).forEach((child, childIndex) => {
      const fraction = 0.28 + childIndex * 0.14;
      const px = x + (endX - x) * fraction;
      const py = spineY + (endY - spineY) * fraction;
      const side = up ? -1 : 1;
      const tick = 34;
      bones.push(
        `<line x1="${n(px)}" y1="${n(py)}" x2="${n(px + tick)}" y2="${n(py + side * 11)}" stroke="${color}" stroke-opacity="0.72" stroke-width="1.2"/>`,
        `<text class="gpv-secondary" x="${n(px + tick + 5)}" y="${n(py + side * 11 + 4)}" fill="${theme.muted}">${escapeHtml(shortText(child.label, 18))}</text>`,
      );
    });
  });

  const rootColor = theme.palette[0];
  const rootText = wrapLabel(root.label || '结果', 6, 2);
  const rootLines = rootText
    .map(
      (line, index) =>
        `<tspan x="${width - 74}" y="${spineY - 2 + (index - (rootText.length - 1) / 2) * 15}">${escapeHtml(line)}</tspan>`,
    )
    .join('');
  const svg = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title || '鱼骨图')}">
      <line x1="${tailX}" y1="${spineY}" x2="${headX + 16}" y2="${spineY}" stroke="${rootColor}" stroke-width="3.4"/>
      <circle cx="${tailX}" cy="${spineY}" r="7" fill="${rootColor}"/>
      ${bones.join('')}
      <ellipse cx="${width - 74}" cy="${spineY}" rx="74" ry="40" fill="${rootColor}"/>
      <text x="${width - 74}" y="${spineY}" text-anchor="middle" fill="${inkOnFill(theme)}" font-size="17" font-weight="700" font-family='${FONT}'>${rootLines}</text>
    </svg>`;
  return frame(title, subtitle, svg, theme, '鱼骨图', width, 580, 760);
}

export function renderViolin(config: Row, theme: ResolvedThemeTokens): string | null {
  const grouped = new Map<string, number[]>();
  for (const row of Array.isArray(config.data) ? config.data : []) {
    const record = recordOf(row);
    if (!record) continue;
    const category = text(record.category || record.name || '未分组');
    const group = text(record.group);
    const value = num(record.value);
    if (!category || value == null) continue;
    const key = group ? `${category} · ${group}` : category;
    const bucket = grouped.get(key) ?? [];
    bucket.push(value);
    grouped.set(key, bucket);
  }
  if (!grouped.size) return null;

  const width = 900;
  const height = 480;
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  const all = [...grouped.values()].flat();
  const forceZero = styleOf(config).startAtZero === true;
  let min = forceZero ? 0 : Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const span = max - min;
  const pad = { left: 74, right: 24, top: 34, bottom: 58 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const slot = plotWidth / grouped.size;
  const yOf = (value: number) => pad.top + ((max - value) / span) * plotHeight;
  const ticks = Array.from({ length: 6 }, (_, index) => min + (span * index) / 5);
  const grid = ticks
    .map((tick) => {
      const y = yOf(tick);
      return `<line x1="${pad.left}" y1="${n(y)}" x2="${width - pad.right}" y2="${n(y)}" stroke="${theme.grid}"/><text x="${pad.left - 12}" y="${n(y + 4)}" text-anchor="end" fill="${theme.muted}" font-size="14" font-family='${FONT}'>${escapeHtml(formatNumber(tick))}</text>`;
    })
    .join('');

  const shapes: string[] = [];
  let index = 0;
  for (const [category, values] of grouped) {
    const center = pad.left + slot * index + slot / 2;
    const color = theme.palette[index % theme.palette.length];
    const density = kde(values, Math.max(2, values.length), min, max);
    const peak = Math.max(...density, 1e-6);
    const half = slot * 0.38;
    const left: Point[] = [];
    const right: Point[] = [];
    density.forEach((value, densityIndex) => {
      const y = pad.top + (densityIndex / (density.length - 1)) * plotHeight;
      const widthAtY = (value / peak) * half;
      left.push({ x: center - widthAtY, y });
      right.push({ x: center + widthAtY, y });
    });
    const outline = [...left, ...right.reverse()]
      .map((point, pointIndex) => `${pointIndex === 0 ? 'M' : 'L'} ${n(point.x)} ${n(point.y)}`)
      .join(' ');
    const median = [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) / 2)];
    shapes.push(`
      <g class="gpv-violin-shape">
        <title>${escapeHtml(category)}: n=${values.length}, median=${escapeHtml(formatNumber(median))}</title>
        <path d="${outline} Z" fill="${color}" fill-opacity="0.66" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/>
        <line x1="${n(center - half * 0.62)}" y1="${n(yOf(median))}" x2="${n(center + half * 0.62)}" y2="${n(yOf(median))}" stroke="${theme.background}" stroke-width="2.4"/>
        <text x="${n(center)}" y="${height - 30}" text-anchor="middle" fill="${theme.text}" font-size="15" font-family='${FONT}'>${escapeHtml(shortText(category, Math.max(7, Math.floor(slot / 11))))}</text>
      </g>`);
    index += 1;
  }

  const xTitle = text(config.axisXTitle);
  const yTitle = text(config.axisYTitle);
  const axisTitles = `
    ${xTitle ? `<text x="${pad.left + plotWidth / 2}" y="${height - 8}" text-anchor="middle" fill="${theme.muted}" font-size="14" font-family='${FONT}'>${escapeHtml(xTitle)}</text>` : ''}
    ${yTitle ? `<text transform="translate(16 ${pad.top + plotHeight / 2}) rotate(-90)" text-anchor="middle" fill="${theme.muted}" font-size="14" font-family='${FONT}'>${escapeHtml(yTitle)}</text>` : ''}`;
  const svg = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title || '小提琴图')}">${grid}${shapes.join('')}${axisTitles}</svg>`;
  return frame(title, subtitle, svg, theme, '小提琴图', width, 540);
}

function frame(
  title: string,
  subtitle: string,
  svg: string,
  theme: ResolvedThemeTokens,
  fallback: string,
  width: number,
  height: number,
  _minWidth = 0,
): string {
  const style = `--gpv-ink:${theme.text};--gpv-muted:${theme.muted};--gpv-line:${theme.grid};--gpv-accent:${theme.palette[0]}`;
  const heading = title || subtitle
    ? `<header class="gpv-markup-head">${title ? `<h3>${escapeHtml(title)}</h3>` : ''}${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</header>`
    : '';
  return `
    <div class="gpv-svgplot" style="${style}">
      ${heading}
      <div class="gpv-svg-scroll" role="img" aria-label="${escapeHtml(title || fallback)}">
        ${svg.replace('<svg ', `<svg style="width:100%;max-width:${width}px;max-height:${height}px" `)}
      </div>
    </div>`;
}

function graphMode(value: unknown): GraphMode | null {
  return value === 'force' ||
    value === 'circular' ||
    value === 'grid' ||
    value === 'radial' ||
    value === 'concentric' ||
    value === 'dagre'
    ? value
    : null;
}

function placeGraph(graph: GraphData, mode: GraphMode): { nodes: PositionedNode[] } {
  const degrees = new Map(graph.nodes.map((node) => [node.name, 0]));
  for (const edge of graph.edges) {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  }
  const source = graph.nodes.map((node) => ({
    name: node.name,
    degree: degrees.get(node.name) ?? 0,
  }));
  if (mode === 'force') return { nodes: forceLayout(source, graph.edges) };
  if (mode === 'circular') return { nodes: circularLayout(source) };
  if (mode === 'grid') return { nodes: gridLayout(source) };
  if (mode === 'concentric') return { nodes: concentricLayout(source) };
  if (mode === 'radial') return { nodes: radialLayout(source, graph.edges) };
  const layers = layeredGraph(graph);
  const positioned: PositionedNode[] = [];
  const gapX = Math.max(150, (GRAPH_WIDTH - 160) / Math.max(1, layers.length - 1));
  layers.forEach((layer, layerIndex) => {
    const rowGap = Math.min(92, (GRAPH_HEIGHT - 90) / Math.max(1, layer.length));
    layer.forEach((name, rowIndex) => {
      positioned.push({
        name,
        degree: degrees.get(name) ?? 0,
        x: 80 + layerIndex * gapX,
        y: (GRAPH_HEIGHT - rowGap * (layer.length - 1)) / 2 + rowIndex * rowGap,
      });
    });
  });
  return { nodes: positioned };
}

function forceLayout(nodes: GraphSeed[], edges: GraphEdge[]): PositionedNode[] {
  const count = nodes.length;
  if (count === 1) return [{ ...nodes[0], x: GRAPH_WIDTH / 2, y: GRAPH_HEIGHT / 2 }];
  const random = seededRandom(hashString(nodes.map((node) => node.name).join('|')));
  const points = nodes.map((node, index) => {
    const angle = (index / count) * Math.PI * 2;
    const radius = Math.min(205, 250 - count * 2) + random() * 18;
    return {
      node,
      x: GRAPH_WIDTH / 2 + Math.cos(angle) * radius,
      y: GRAPH_HEIGHT / 2 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });
  const byName = new Map(points.map((point) => [point.node.name, point]));
  const links: [(typeof points)[number], (typeof points)[number]][] = [];
  for (const edge of edges) {
    const source = byName.get(edge.source);
    const target = byName.get(edge.target);
    if (source && target) links.push([source, target]);
  }
  const centerX = GRAPH_WIDTH / 2;
  const centerY = GRAPH_HEIGHT / 2;
  const ideal = clamp(380 / Math.sqrt(count), 62, 120);

  for (let iteration = 0; iteration < 280; iteration += 1) {
    for (let first = 0; first < points.length; first += 1) {
      for (let second = first + 1; second < points.length; second += 1) {
        const a = points[first];
        const b = points[second];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 0.01) {
          dx = random() - 0.5;
          dy = random() - 0.5;
          distance = Math.sqrt(dx * dx + dy * dy);
        }
        const force = Math.min(14, (ideal * ideal) / Math.max(1, distance * distance));
        a.vx += (dx / distance) * force;
        a.vy += (dy / distance) * force;
        b.vx -= (dx / distance) * force;
        b.vy -= (dy / distance) * force;
      }
    }
    for (const [a, b] of links) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
      const spring = (distance - ideal) * 0.018;
      const fx = (dx / distance) * spring;
      const fy = (dy / distance) * spring;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }
    for (const point of points) {
      point.vx += (centerX - point.x) * 0.0024;
      point.vy += (centerY - point.y) * 0.0024;
      point.vx *= 0.83;
      point.vy *= 0.83;
      point.x = clamp(point.x + point.vx, 48, GRAPH_WIDTH - 48);
      point.y = clamp(point.y + point.vy, 48, GRAPH_HEIGHT - 48);
    }
  }
  return points.map((point) => ({
    ...point.node,
    x: point.x,
    y: point.y,
  }));
}

function circularLayout(nodes: GraphSeed[]): PositionedNode[] {
  const cx = GRAPH_WIDTH / 2;
  const cy = GRAPH_HEIGHT / 2;
  const radius = Math.min(215, 75 + nodes.length * 5.4);
  return nodes.map((node, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, nodes.length)) * Math.PI * 2;
    return { ...node, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
}

function gridLayout(nodes: GraphSeed[]): PositionedNode[] {
  const columns = Math.ceil(Math.sqrt(Math.max(1, nodes.length) * 1.35));
  const rows = Math.ceil(nodes.length / columns);
  const gapX = (GRAPH_WIDTH - 130) / Math.max(1, columns);
  const gapY = (GRAPH_HEIGHT - 100) / Math.max(1, rows);
  return nodes.map((node, index) => ({
    ...node,
    x: 65 + gapX * (index % columns) + gapX / 2,
    y: 50 + gapY * Math.floor(index / columns) + gapY / 2,
  }));
}

function concentricLayout(nodes: GraphSeed[]): PositionedNode[] {
  const groups = new Map<number, GraphSeed[]>();
  for (const node of nodes) {
    const ring = Math.min(4, Math.floor(Math.sqrt(node.degree)));
    const bucket = groups.get(ring) ?? [];
    bucket.push(node);
    groups.set(ring, bucket);
  }
  const rings = [...groups.entries()].sort((a, b) => a[0] - b[0]);
  const cx = GRAPH_WIDTH / 2;
  const cy = GRAPH_HEIGHT / 2;
  const result: PositionedNode[] = [];
  rings.forEach(([ring, ringNodes], ringIndex) => {
    const radius = ringIndex === 0 ? 0 : 52 + ringIndex * Math.min(52, 150 / rings.length);
    ringNodes.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, ringNodes.length)) * Math.PI * 2;
      result.push({
        ...node,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      });
    });
    void ring;
  });
  return result;
}

function radialLayout(nodes: GraphSeed[], edges: GraphEdge[]): PositionedNode[] {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.name, []);
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    adjacency.get(edge.target)?.push(edge.source);
  }
  const start = [...nodes].sort((a, b) => b.degree - a.degree || a.name.localeCompare(b.name))[0]?.name;
  if (!start) return [];
  const depth = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift() as string;
    for (const next of adjacency.get(current) ?? []) {
      if (depth.has(next)) continue;
      depth.set(next, (depth.get(current) ?? 0) + 1);
      queue.push(next);
    }
  }
  for (const node of nodes) if (!depth.has(node.name)) depth.set(node.name, 1);
  const groups = new Map<number, GraphSeed[]>();
  for (const node of nodes) {
    const d = depth.get(node.name) ?? 1;
    const bucket = groups.get(d) ?? [];
    bucket.push(node);
    groups.set(d, bucket);
  }
  const maxDepth = Math.max(1, ...groups.keys());
  const cx = GRAPH_WIDTH / 2;
  const cy = GRAPH_HEIGHT / 2;
  const result: PositionedNode[] = [];
  for (const [d, group] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    const radius = d === 0 ? 0 : 68 + (d / maxDepth) * 175;
    group.forEach((node, index) => {
      const angle = -Math.PI / 2 + (index / Math.max(1, group.length)) * Math.PI * 2;
      result.push({ ...node, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
    });
  }
  return result;
}

function layeredGraph(graph: GraphData): string[][] {
  const names = graph.nodes.map((node) => node.name);
  const valid = new Set(names);
  const outgoing = new Map<string, string[]>(names.map((name) => [name, []]));
  const indegree = new Map<string, number>(names.map((name) => [name, 0]));
  for (const edge of graph.edges) {
    if (!valid.has(edge.source) || !valid.has(edge.target) || edge.source === edge.target) continue;
    outgoing.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  const rank = new Map<string, number>(names.map((name) => [name, 0]));
  const queue = names.filter((name) => (indegree.get(name) ?? 0) === 0);
  const visited: string[] = [];
  while (queue.length) {
    const current = queue.shift() as string;
    visited.push(current);
    for (const next of outgoing.get(current) ?? []) {
      rank.set(next, Math.max(rank.get(next) ?? 0, (rank.get(current) ?? 0) + 1));
      indegree.set(next, (indegree.get(next) ?? 1) - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  const remaining = names.filter((name) => !visited.includes(name));
  if (remaining.length) {
    const maxRank = Math.max(0, ...rank.values()) + 1;
    remaining.forEach((name, index) => rank.set(name, maxRank + (index % 2)));
  }
  const layers = new Map<number, string[]>();
  for (const name of names) {
    const index = rank.get(name) ?? 0;
    const bucket = layers.get(index) ?? [];
    bucket.push(name);
    layers.set(index, bucket);
  }
  return [...layers.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1]);
}

function normalizeTree(row: Row, depth = 0, counter = { value: 0 }): TreeNode | null {
  const label = text(row.name ?? row.title ?? row.label);
  if (!label && !Array.isArray(row.children)) return null;
  const children = Array.isArray(row.children)
    ? row.children
        .map((child) => recordOf(child))
        .filter((child): child is Row => Boolean(child))
        .map((child) => normalizeTree(child, depth + 1, counter))
        .filter((child): child is TreeNode => Boolean(child))
    : [];
  return {
    id: counter.value++,
    label: label || '未命名',
    description: text(row.description),
    depth,
    children,
  };
}

function flattenTree(root: TreeNode): { node: TreeNode; parent: number | null; depth: number }[] {
  const result: { node: TreeNode; parent: number | null; depth: number }[] = [];
  const visit = (node: TreeNode, parent: number | null) => {
    result.push({ node, parent, depth: node.depth });
    for (const child of node.children) visit(child, node.id);
  };
  visit(root, null);
  return result;
}

function mindmapHorizontal(
  root: TreeNode,
  theme: ResolvedThemeTokens,
  title: string,
  direction: 'LR' | 'RL',
): { svg: string; width: number; height: number } {
  const rowGap = 47;
  const depthGap = 178;
  const maxDepth = treeDepth(root);
  const width = Math.max(720, 260 + maxDepth * depthGap);
  let cursor = 66;
  const positioned: LayoutNode[] = [];

  const place = (node: TreeNode, depth: number, branch: number): LayoutNode => {
    let y: number;
    if (!node.children.length) {
      y = cursor;
      cursor += rowGap;
    } else {
      const children = node.children.map((child, index) => place(child, depth + 1, depth === 0 ? index : branch));
      y = (children[0].y + children[children.length - 1].y) / 2;
    }
    const x = 74 + depth * depthGap;
    const layout = { ...node, x, y, branch };
    positioned.push(layout);
    return layout;
  };
  place(root, 0, 0);
  const height = Math.max(400, cursor + 32);
  const points = new Map(positioned.map((node) => [node.id, node]));
  const connectors: string[] = [];
  const nodes: string[] = [];
  const reversed = direction === 'RL';

  for (const node of positioned) {
    const px = reversed ? width - node.x : node.x;
    if (node.depth > 0) {
      const parent = findParent(positioned, root, node.id);
      if (parent) {
        const parentX = reversed ? width - parent.x : parent.x;
        const x1 = parentX;
        const y1 = parent.y;
        const x2 = px;
        const y2 = node.y;
        const bend = (x2 - x1) * 0.52;
        connectors.push(
          `<path d="M ${n(x1 + (reversed ? -1 : 1) * 68)} ${n(y1)} C ${n(x1 + (reversed ? -1 : 1) * (68 + Math.abs(bend)))} ${n(y1)}, ${n(x2 - (reversed ? -1 : 1) * 50)} ${n(y2)}, ${n(x2 - (reversed ? -1 : 1) * 64)} ${n(y2)}" fill="none" stroke="${theme.palette[node.branch % theme.palette.length]}" stroke-opacity="0.64" stroke-width="1.8"/>`,
        );
      }
    }
    nodes.push(mindNodeSvg(node, px, node.y, theme, node.depth === 0));
  }
  void points;
  return {
    svg: `<svg viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-label="${escapeHtml(title || '思维导图')}">${connectors.join('')}${nodes.join('')}</svg>`,
    width,
    height: Math.max(430, height),
  };
}

function mindmapBothSides(
  root: TreeNode,
  theme: ResolvedThemeTokens,
  title: string,
): { svg: string; width: number; height: number } {
  const children = root.children.map((child, index) => ({ child, side: index % 2 === 0 ? 1 : -1 }));
  const rowGap = 46;
  const depthGap = 174;
  const maxDepth = Math.max(1, treeDepth(root));
  const width = Math.max(820, 300 + maxDepth * depthGap);
  const leftCount = children.filter((entry) => entry.side < 0).reduce((sum, entry) => sum + countLeaves(entry.child), 0);
  const rightCount = children.filter((entry) => entry.side > 0).reduce((sum, entry) => sum + countLeaves(entry.child), 0);
  const height = Math.max(500, Math.max(leftCount, rightCount) * rowGap + 120);
  const rootX = width / 2;
  const rootY = height / 2;
  const positioned: LayoutNode[] = [{ ...root, x: rootX, y: rootY, branch: 0 }];

  for (const side of [-1, 1] as const) {
    const sideChildren = children.filter((entry) => entry.side === side);
    let cursor = 0;
    const local: LayoutNode[] = [];
    const place = (node: TreeNode, depth: number, branch: number): LayoutNode => {
      let localY: number;
      if (!node.children.length) {
        localY = cursor;
        cursor += rowGap;
      } else {
        const placed = node.children.map((child, index) => place(child, depth + 1, depth === 0 ? branch : branch));
        localY = (placed[0].y + placed[placed.length - 1].y) / 2;
      }
      const x = rootX + side * (112 + depth * depthGap);
      const layout = { ...node, x, y: localY, branch };
      local.push(layout);
      return layout;
    };
    sideChildren.forEach((entry, branch) => place(entry.child, 0, branch));
    const minY = local.length ? Math.min(...local.map((node) => node.y)) : 0;
    const maxY = local.length ? Math.max(...local.map((node) => node.y)) : 0;
    const centerOffset = rootY - (minY + maxY) / 2;
    for (const node of local) {
      node.y += centerOffset;
      positioned.push(node);
    }
  }

  const connectors: string[] = [];
  const nodes: string[] = [];
  for (const node of positioned) {
    if (node.depth > 0) {
      const parent = findParent(positioned, root, node.id);
      if (parent) {
        const side = node.x >= rootX ? 1 : -1;
        const x1 = parent.x + side * (parent.depth === 0 ? 82 : 68);
        const x2 = node.x - side * (node.depth === 1 ? 72 : 66);
        const mid = (x1 + x2) / 2;
        connectors.push(
          `<path d="M ${n(x1)} ${n(parent.y)} C ${n(mid)} ${n(parent.y)}, ${n(mid)} ${n(node.y)}, ${n(x2)} ${n(node.y)}" fill="none" stroke="${theme.palette[(node.branch + (side < 0 ? 3 : 1)) % theme.palette.length]}" stroke-opacity="0.65" stroke-width="1.8"/>`,
        );
      }
    }
    nodes.push(mindNodeSvg(node, node.x, node.y, theme, node.depth === 0));
  }
  return {
    svg: `<svg viewBox="0 0 ${n(width)} ${n(height)}" role="img" aria-label="${escapeHtml(title || '思维导图')}">${connectors.join('')}${nodes.join('')}</svg>`,
    width,
    height,
  };
}

function mindNodeSvg(node: LayoutNode, x: number, y: number, theme: ResolvedThemeTokens, root: boolean): string {
  const color = theme.palette[node.branch % theme.palette.length];
  const width = root ? 156 : 138;
  const height = root ? 42 : 34;
  const fill = root ? theme.palette[0] : theme.background;
  const ink = root ? inkOnFill(theme) : theme.text;
  return `
    <g class="gpv-mind-node">
      <title>${escapeHtml(node.label)}</title>
      <rect x="${n(x - width / 2)}" y="${n(y - height / 2)}" width="${width}" height="${height}" rx="${root ? 14 : 10}" fill="${fill}" stroke="${color}" stroke-width="${root ? 0 : 1.5}"/>
      <rect x="${n(x - width / 2 + 8)}" y="${n(y - height / 2 + 8)}" width="3" height="${height - 16}" rx="1.5" fill="${color}"/>
      <text x="${n(x + 3)}" y="${n(y + 4)}" text-anchor="middle" fill="${ink}" font-size="${root ? 18 : 16}" font-weight="${root ? 700 : 600}" font-family='${FONT}'>${escapeHtml(shortText(node.label, root ? 18 : 17))}</text>
    </g>`;
}

function placeOrganization(
  node: TreeNode,
  depth: number,
  left: number,
  width: number,
  branch: number,
  result: LayoutNode[],
): number {
  const x = left + width / 2;
  const y = 55 + depth * 106;
  result.push({ ...node, x, y, branch });
  if (!node.children.length) return x;
  let cursor = left;
  for (const child of node.children) {
    const childWidth = (width * countLeaves(child)) / Math.max(1, countLeaves(node));
    placeOrganization(child, depth + 1, cursor, childWidth, branch + 1, result);
    cursor += childWidth;
  }
  return x;
}

function findParent(nodes: LayoutNode[], root: TreeNode, id: number): LayoutNode | null {
  const target = findTreeNode(root, id);
  if (!target) return null;
  const parent = findTreeParent(root, id);
  if (!parent) return null;
  return nodes.find((node) => node.id === parent.id) ?? null;
}

function findTreeNode(root: TreeNode, id: number): TreeNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findTreeNode(child, id);
    if (found) return found;
  }
  return null;
}

function findTreeParent(root: TreeNode, id: number): TreeNode | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findTreeParent(child, id);
    if (found) return found;
  }
  return null;
}

function descendantOf(root: TreeNode, id: number, ancestorId: number): boolean {
  const ancestor = findTreeNode(root, ancestorId);
  if (!ancestor) return false;
  return Boolean(findTreeNode(ancestor, id));
}

function countLeaves(node: TreeNode): number {
  return node.children.length ? node.children.reduce((sum, child) => sum + countLeaves(child), 0) : 1;
}

function treeDepth(node: TreeNode): number {
  return node.children.length ? 1 + Math.max(...node.children.map(treeDepth)) : 0;
}

function kde(values: number[], fallbackPoints: number, min: number, max: number): number[] {
  const points = 52;
  const span = max - min || 1;
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length);
  const std = Math.sqrt(variance);
  const bandwidth = Math.max(span / 120, 1.06 * (std || span / 6) * Math.pow(Math.max(2, fallbackPoints), -0.2));
  return Array.from({ length: points }, (_, index) => {
    const value = min + (index / (points - 1)) * span;
    return values.reduce((density, sample) => {
      const z = (value - sample) / bandwidth;
      return density + Math.exp(-0.5 * z * z);
    }, 0);
  });
}

function wrapLabel(value: string, max: number, maxLines: number): string[] {
  const chars = Array.from(value.trim());
  if (!chars.length) return [''];
  const lines: string[] = [];
  for (let index = 0; index < chars.length && lines.length < maxLines; index += max) {
    lines.push(chars.slice(index, index + max).join(''));
  }
  if (chars.length > max * maxLines) {
    const last = lines[maxLines - 1] ?? '';
    lines[maxLines - 1] = `${Array.from(last).slice(0, Math.max(1, max - 1)).join('')}…`;
  }
  return lines;
}

function inkOnFill(theme: ResolvedThemeTokens): string {
  return theme.name === 'dark' ? '#14191a' : '#ffffff';
}

function n(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return String(Math.round(value * 100) / 100);
}
