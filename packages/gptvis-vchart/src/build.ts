import { chartLabel, SUPPORTED } from './catalog.js';
import {
  renderFishbone,
  renderFlow,
  renderIndentedTree,
  renderMindmap,
  renderNetwork,
  renderOrganization,
  renderViolin,
} from './diagrams.js';
import { renderPending, renderSummaryView, renderTable, renderUnsupported } from './markup.js';
import { readConfig } from './parser.js';
import { resolveTheme, safeColor, safePalette, type ResolvedThemeTokens, type VisualizationTheme } from './theme.js';
import { escapeHtml } from './text.js';
import {
  clamp,
  formatNumber,
  num,
  percentNumber,
  quantile,
  rowsOf,
  setsOf,
  shortText,
  styleOf,
  text,
  treeOf,
  unique,
  type Row,
} from './util.js';

export interface ViewContext {
  theme?: VisualizationTheme;
  streaming?: boolean;
  width?: number;
  height?: number;
}

export type View =
  | { kind: 'vchart'; spec: Record<string, unknown>; background: string; message: string }
  | { kind: 'html'; html: string; background: string; message: string }
  | { kind: 'pending'; html: string; background: string; message: string }
  | { kind: 'error'; html: string; background: string; message: string };

const HTML_TYPES = new Set([
  'table',
  'summary',
  'violin',
  'flow-diagram',
  'network-graph',
  'mindmap',
  'indented-tree',
  'organization-chart',
  'fishbone-diagram',
]);

export function buildView(input: unknown, context: ViewContext = {}): View {
  const config = readConfig(input, { streaming: context.streaming });
  const theme = resolveTheme(config.theme, context.theme ?? 'default');
  const background = safeColor(styleOf(config).backgroundColor, theme.background) ?? theme.background;

  if (!config.type) {
    return pending(
      context.streaming ? '正在等待 vis 语法…' : '写一行 vis line、vis bar 或其他图表类型。',
      background,
      context.streaming ? undefined : '也支持 JSON、配置对象，以及普通文字摘要。',
    );
  }

  if (!SUPPORTED.has(config.type)) {
    if (context.streaming && typeof input === 'string' && !firstLineClosed(input)) {
      return pending('正在识别图表类型…', background);
    }
    return {
      kind: 'error',
      html: renderUnsupported(config.type),
      background,
      message: `不支持的类型 ${config.type}`,
    };
  }

  if (config.type === 'venn') {
    const sets = unique(
      rowsOf(config.data).flatMap((row) => setsOf(row.sets)),
      (item) => item,
    );
    if (sets.length > 3) {
      return {
        kind: 'error',
        html: renderUnsupportedVenn(sets.length),
        background,
        message: '韦恩图只支持一到三个集合',
      };
    }
  }

  const html = htmlFor(config, theme);
  if (html) {
    return { kind: 'html', html, background, message: `${chartLabel(config.type)} · 已渲染` };
  }
  if (HTML_TYPES.has(config.type)) {
    return pending(`${chartLabel(config.type)}还缺可绘制的数据。`, background);
  }

  const spec = nativeSpec(config, theme);
  if (!spec) return pending(`${chartLabel(config.type)}还缺可绘制的数据。`, background);
  return {
    kind: 'vchart',
    spec,
    background,
    message: `${chartLabel(config.type)} · VChart 原生渲染`,
  };
}

function pending(message: string, background: string, hint?: string): View {
  return { kind: 'pending', html: renderPending(message, hint), background, message };
}

function renderUnsupportedVenn(count: number): string {
  return `
    <div class="gpv-status gpv-status-error">
      <p>韦恩图收到 ${count} 个集合</p>
      <span>VChart 的韦恩图只接受一到三个集合。请合并次要集合，或改用桑基图。</span>
    </div>`;
}

function firstLineClosed(input: string): boolean {
  const body = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trimStart();
  const source = body.startsWith('```') ? body.slice(body.indexOf('\n') + 1) : body;
  return source.includes('\n');
}

function htmlFor(config: Row, theme: ResolvedThemeTokens): string | null {
  switch (config.type) {
    case 'table':
      return renderTable(config, theme);
    case 'summary':
      return renderSummaryView(config, theme);
    case 'violin':
      return renderViolin(config, theme);
    case 'flow-diagram':
      return renderFlow(config, theme);
    case 'network-graph': {
      const layout =
        config.layout === 'circular' ||
        config.layout === 'grid' ||
        config.layout === 'radial' ||
        config.layout === 'concentric' ||
        config.layout === 'dagre'
          ? config.layout
          : 'force';
      return renderNetwork(config, theme, layout);
    }
    case 'mindmap':
      return renderMindmap(config, theme);
    case 'indented-tree':
      return renderIndentedTree(config, theme);
    case 'organization-chart':
      return renderOrganization(config, theme);
    case 'fishbone-diagram':
      return renderFishbone(config, theme);
    default:
      return null;
  }
}

function nativeSpec(config: Row, theme: ResolvedThemeTokens): Record<string, unknown> | null {
  const colors = paletteOf(config, theme);
  switch (config.type) {
    case 'line':
    case 'area':
      return cartesian(config, theme, colors, config.type);
    case 'column':
    case 'bar':
      return cartesian(config, theme, colors, config.type);
    case 'pie':
      return pie(config, theme, colors);
    case 'scatter':
      return scatter(config, theme, colors);
    case 'radar':
      return radar(config, theme, colors);
    case 'funnel':
      return funnel(config, theme, colors);
    case 'waterfall':
      return waterfall(config, theme, colors);
    case 'dual-axes':
      return dualAxes(config, theme, colors);
    case 'histogram':
      return histogram(config, theme, colors);
    case 'boxplot':
      return boxplot(config, theme, colors);
    case 'sankey':
      return sankey(config, theme, colors);
    case 'treemap':
      return treemap(config, theme, colors);
    case 'word-cloud':
      return wordCloud(config, theme, colors);
    case 'liquid':
      return liquid(config, theme, colors);
    case 'venn':
      return venn(config, theme, colors);
    default:
      return null;
  }
}

function paletteOf(config: Row, theme: ResolvedThemeTokens): string[] {
  return safePalette(styleOf(config).palette, theme.palette);
}

function base(
  config: Row,
  theme: ResolvedThemeTokens,
  colors: string[],
  type: string,
  showLegend = false,
): Record<string, unknown> {
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  return {
    type,
    color: colors,
    background: 'transparent',
    autoFit: true,
    animation: false,
    padding: { top: title || subtitle ? 10 : 16, right: 24, bottom: 20, left: 20 },
    title: {
      visible: Boolean(title || subtitle),
      text: title || ' ',
      subtext: subtitle || undefined,
      orient: 'top',
      align: 'left',
      padding: { top: 0, right: 0, bottom: 10, left: 0 },
      textStyle: {
        fill: theme.text,
        fontFamily: theme.fontFamily,
        fontSize: 18,
        fontWeight: 600,
      },
      subtextStyle: {
        fill: theme.muted,
        fontFamily: theme.fontFamily,
        fontSize: 12,
      },
    },
    legends: {
      visible: showLegend,
      orient: 'top',
      position: 'end',
      maxRow: 2,
      padding: { bottom: 4 },
      item: {
        label: {
          style: {
            fill: theme.muted,
            fontFamily: theme.fontFamily,
            fontSize: 11,
          },
        },
      },
    },
    tooltip: {
      visible: true,
      confine: true,
      style: {
        panel: {
          backgroundColor: theme.tooltipBg,
          border: { color: theme.tooltipBg, width: 0, radius: theme.radius + 4 },
          padding: { top: 9, right: 11, bottom: 9, left: 11 },
        },
        titleLabel: { fill: theme.tooltipText, fontFamily: theme.fontFamily, fontWeight: 600 },
        keyLabel: { fill: theme.tooltipText, fontFamily: theme.fontFamily, fillOpacity: 0.72 },
        valueLabel: { fill: theme.tooltipText, fontFamily: theme.fontFamily, fontWeight: 600 },
      },
    },
  };
}

function bandAxis(
  orient: 'bottom' | 'left',
  title: string,
  theme: ResolvedThemeTokens,
  inverse = false,
): Record<string, unknown> {
  return {
    orient,
    type: 'band',
    inverse,
    bandPadding: 0.36,
    label: {
      visible: true,
      autoLimit: true,
      style: { fill: theme.muted, fontFamily: theme.fontFamily, fontSize: 11 },
    },
    domainLine: { visible: true, style: { stroke: theme.grid } },
    tick: { visible: false },
    grid: { visible: false },
    title: axisTitle(title, theme),
  };
}

function linearAxis(
  orient: 'bottom' | 'left' | 'right',
  title: string,
  theme: ResolvedThemeTokens,
  zero = false,
  seriesId?: string,
): Record<string, unknown> {
  return {
    orient,
    type: 'linear',
    zero,
    nice: true,
    seriesId,
    label: {
      visible: true,
      autoLimit: true,
      style: { fill: theme.muted, fontFamily: theme.fontFamily, fontSize: 11 },
    },
    domainLine: { visible: false },
    tick: { visible: false },
    grid: {
      visible: orient === 'left' || orient === 'right',
      style: { stroke: theme.grid, lineDash: [3, 4] },
    },
    title: axisTitle(title, theme),
  };
}

function axisTitle(value: string, theme: ResolvedThemeTokens): Record<string, unknown> {
  return value
    ? {
        visible: true,
        text: value,
        position: 'middle',
        style: { fill: theme.muted, fontFamily: theme.fontFamily, fontSize: 11 },
      }
    : { visible: false };
}

function valuesData(values: unknown, id = 'gpv-main'): Record<string, unknown> {
  return { id, values };
}

function cartesian(
  config: Row,
  theme: ResolvedThemeTokens,
  colors: string[],
  kind: 'line' | 'area' | 'column' | 'bar',
): Record<string, unknown> | null {
  const horizontal = kind === 'bar';
  const xKey = kind === 'line' || kind === 'area' ? 'time' : 'category';
  const rows = rowsOf(config.data).filter((row) => row[xKey] != null && num(row.value) != null);
  if (!rows.length) return null;
  const groups =
    config.group === false
      ? []
      : unique(
          rows.map((row) => text(row.group)).filter(Boolean),
          (group) => group,
        );
  const seriesField = groups.length ? 'group' : undefined;
  const chartType = kind === 'line' ? 'line' : kind === 'area' ? 'area' : 'bar';
  const labelVisible = (kind === 'column' || kind === 'bar') && config.label !== false && rows.length <= 36;
  const pointVisible = (kind === 'line' || kind === 'area') && rows.length <= 48;
  const groupedBars = (kind === 'column' || kind === 'bar') && Boolean(seriesField) && config.stack !== true;
  const positionField = groupedBars ? [xKey, 'group'] : xKey;
  const spec: Record<string, unknown> = {
    ...base(config, theme, colors, chartType, groups.length > 0),
    data: [valuesData(rows)],
    xField: horizontal ? 'value' : positionField,
    yField: horizontal ? positionField : 'value',
    seriesField,
    direction: horizontal ? 'horizontal' : 'vertical',
    stack: config.stack === true,
    axes: horizontal
      ? [
          linearAxis('bottom', text(config.axisXTitle), theme, true),
          bandAxis('left', text(config.axisYTitle), theme, true),
        ]
      : [
          bandAxis('bottom', text(config.axisXTitle), theme),
          linearAxis('left', text(config.axisYTitle), theme, true),
        ],
  };

  if (kind === 'line' || kind === 'area') {
    spec.line = {
      style: {
        lineWidth: num(styleOf(config).lineWidth) ?? theme.lineWidth,
        lineCap: 'round',
        lineJoin: 'round',
      },
    };
    spec.point = {
      visible: pointVisible,
      style: { size: 7, stroke: theme.background, lineWidth: 1.5 },
    };
  }
  if (kind === 'area') {
    spec.area = {
      visible: true,
      style: { fillOpacity: config.stack === true ? 0.62 : 0.22 },
    };
  }
  if (kind === 'column' || kind === 'bar') {
    spec.bar = {
      style: {
        cornerRadius: 3,
        cornerRadiusTopLeft: 3,
        cornerRadiusTopRight: 3,
      },
    };
    spec.barMaxWidth = 44;
    if (groupedBars) spec.barGapInGroup = 4;
    spec.label = {
      visible: labelVisible,
      position: horizontal ? 'outside' : 'top',
      style: { fill: theme.muted, fontFamily: theme.fontFamily, fontSize: 10 },
    };
  }
  return spec;
}

function pie(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data)
    .filter((row) => num(row.value) != null)
    .map((row) => ({ category: text(row.category || row.name || row.label), value: num(row.value) ?? 0 }))
    .filter((row) => row.category);
  if (!rows.length) return null;
  const inner = num(config.innerRadius) ?? 0;
  const innerRadius = clamp(inner > 1 ? inner / 100 : inner, 0, 0.86);
  return {
    ...base(config, theme, colors, 'pie', true),
    data: [valuesData(rows)],
    categoryField: 'category',
    valueField: 'value',
    centerX: '50%',
    centerY: '50%',
    outerRadius: 0.6,
    innerRadius,
    label: {
      visible: true,
      position: 'outside',
      rotate: false,
      showRule: 'all',
      line: { visible: true, style: { stroke: theme.grid, lineWidth: 1 } },
      layout: { textAlign: 'labelLine' },
      style: {
        fill: theme.muted,
        fontFamily: theme.fontFamily,
        fontSize: 11,
      },
    },
    pie: { style: { stroke: theme.background, lineWidth: 2 } },
  };
}

function scatter(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data).filter((row) => num(row.x) != null && num(row.y) != null);
  if (!rows.length) return null;
  const groups = unique(
    rows.map((row) => text(row.group)).filter(Boolean),
    (group) => group,
  );
  return {
    ...base(config, theme, colors, 'scatter', groups.length > 0),
    data: [valuesData(rows)],
    xField: 'x',
    yField: 'y',
    seriesField: groups.length ? 'group' : undefined,
    size: 11,
    point: {
      style: {
        size: 11,
        fillOpacity: 0.82,
        stroke: theme.background,
        lineWidth: 1.2,
      },
    },
    axes: [
      linearAxis('bottom', text(config.axisXTitle), theme, false),
      linearAxis('left', text(config.axisYTitle), theme, false),
    ],
  };
}

function radar(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data).filter((row) => text(row.name) && num(row.value) != null);
  if (!rows.length) return null;
  const indicators = unique(
    rows.map((row) => text(row.name)),
    (name) => name,
  );
  const groups = unique(
    rows.map((row) => text(row.group)).filter(Boolean),
    (group) => group,
  );
  const maximum = Math.max(1, ...rows.map((row) => num(row.value) ?? 0));
  return {
    ...base(config, theme, colors, 'radar', groups.length > 1),
    data: [valuesData(rows)],
    categoryField: 'name',
    valueField: 'value',
    seriesField: groups.length ? 'group' : undefined,
    seriesMark: 'area',
    area: { visible: true, style: { fillOpacity: 0.17 } },
    line: { style: { lineWidth: num(styleOf(config).lineWidth) ?? theme.lineWidth } },
    point: { visible: true, style: { size: 6, stroke: theme.background, lineWidth: 1.2 } },
    axes: [
      {
        orient: 'angle',
        type: 'band',
        grid: { visible: false },
        label: { style: { fill: theme.muted, fontFamily: theme.fontFamily, fontSize: 11 } },
        domainLine: { visible: false },
        tick: { visible: false },
      },
      {
        orient: 'radius',
        type: 'linear',
        min: 0,
        max: maximum * 1.12,
        label: { visible: false },
        grid: { visible: true, style: { stroke: theme.grid } },
        domainLine: { visible: false },
        tick: { visible: false },
      },
    ],
    crosshair: { visible: false },
  };
}

function funnel(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data)
    .filter((row) => text(row.category) && num(row.value) != null)
    .map((row) => ({ category: text(row.category), value: num(row.value) ?? 0 }));
  if (!rows.length) return null;
  const transformLabel = text(config.conversionRateLabel);
  return {
    ...base(config, theme, colors, 'funnel', false),
    data: [valuesData(rows)],
    categoryField: 'category',
    valueField: 'value',
    funnelOrient: 'vertical',
    funnelAlign: 'center',
    shape: 'trapezoid',
    gap: 4,
    range: { min: 0.12, max: 0.92 },
    isTransform: Boolean(transformLabel),
    transformRatioText: transformLabel || undefined,
    label: {
      visible: true,
      position: 'inside',
      style: { fill: theme.tooltipText, fontFamily: theme.fontFamily, fontSize: 11, fontWeight: 600 },
    },
    outerLabel: { visible: false },
    transformLabel: {
      visible: Boolean(transformLabel),
      style: { fill: theme.muted, fontFamily: theme.fontFamily, fontSize: 10 },
    },
  };
}

function waterfall(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows: Row[] = [];
  for (const row of rowsOf(config.data)) {
    const category = text(row.category);
    if (!category) continue;
    const total = row.isTotal === true || row.isIntermediateTotal === true;
    const value = num(row.value);
    if (!total && value == null) continue;
    rows.push({
      category,
      value,
      isTotal: total,
    });
  }
  if (!rows.length) return null;
  return {
    ...base(config, theme, colors, 'waterfall', false),
    data: [valuesData(rows)],
    xField: 'category',
    yField: 'value',
    direction: 'vertical',
    total: { type: 'field', tagField: 'isTotal', valueField: 'value' },
    calculationMode: 'increase',
    barMaxWidth: 48,
    stackLabel: {
      visible: true,
      position: 'middle',
      valueType: 'change',
      style: { fill: theme.tooltipText, fontFamily: theme.fontFamily, fontSize: 10, fontWeight: 600 },
    },
    axes: [
      bandAxis('bottom', text(config.axisXTitle), theme),
      linearAxis('left', text(config.axisYTitle), theme, true),
    ],
  };
}

function dualAxes(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rawCategories = Array.isArray(config.categories) ? config.categories.map((item) => text(item)) : [];
  const items = rowsOf(config.series)
    .map((item) => ({
      type: item.type === 'line' ? ('line' as const) : ('column' as const),
      data: Array.isArray(item.data) ? item.data.map((value) => num(value)) : [],
      axisYTitle: text(item.axisYTitle),
    }))
    .filter((item) => item.data.some((value) => value != null));
  if (!items.length) return null;
  const length = Math.max(rawCategories.length, ...items.map((item) => item.data.length));
  if (!length) return null;
  const categories = Array.from({ length }, (_, index) => rawCategories[index] || String(index + 1));
  const rows = categories.map((category, rowIndex) => {
    const row: Row = { category };
    items.forEach((item, seriesIndex) => {
      row[`value${seriesIndex}`] = item.data[rowIndex];
    });
    return row;
  });
  const series = items.map((item, index) => ({
    id: `gpv-dual-${index}`,
    type: item.type === 'line' ? 'line' : 'bar',
    name: item.axisYTitle || `指标 ${index + 1}`,
    xField: 'category',
    yField: `value${index}`,
    dataId: 'gpv-dual-data',
    direction: 'vertical',
    ...(item.type === 'line'
      ? {
          line: { style: { stroke: colors[1 % colors.length], lineWidth: theme.lineWidth } },
          point: {
            visible: true,
            style: { size: 6, fill: colors[1 % colors.length], stroke: theme.background, lineWidth: 1.2 },
          },
        }
      : { barMaxWidth: 34, bar: { style: { fill: colors[0] } } }),
  }));
  const startAtZero = styleOf(config).startAtZero !== false;
  const axes: Record<string, unknown>[] = [
    bandAxis('bottom', text(config.axisXTitle), theme),
    linearAxis('left', items[0].axisYTitle, theme, startAtZero, series[0].id),
  ];
  if (series.length > 1) {
    axes.push(linearAxis('right', items[1].axisYTitle, theme, startAtZero, series[1].id));
  }
  return {
    ...base(config, theme, colors, 'common', true),
    data: [valuesData(rows, 'gpv-dual-data')],
    series,
    axes,
  };
}

function histogram(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const values: number[] = [];
  const raw = Array.isArray(config.data) ? config.data : [];
  for (const item of raw) {
    if (typeof item === 'number' || typeof item === 'string') {
      const value = num(item);
      if (value != null) values.push(value);
      continue;
    }
    const row = item && typeof item === 'object' ? (item as Row) : null;
    const value = row ? num(row.value ?? row.x) : null;
    if (value != null) values.push(value);
  }
  if (!values.length) return null;
  const binCount = clamp(Math.round(num(config.binNumber) ?? 10), 1, 40);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  const step = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    binStart: min + step * index,
    binEnd: min + step * (index + 1),
    count: 0,
  }));
  for (const value of values) {
    const index = Math.min(binCount - 1, Math.max(0, Math.floor((value - min) / step)));
    bins[index].count += 1;
  }
  return {
    ...base(config, theme, colors, 'histogram', false),
    data: [valuesData(bins)],
    xField: 'binStart',
    x2Field: 'binEnd',
    yField: 'count',
    direction: 'vertical',
    bar: { style: { stroke: theme.background, lineWidth: 1 } },
    label: {
      visible: true,
      position: 'top',
      style: { fill: theme.muted, fontFamily: theme.fontFamily, fontSize: 10 },
    },
    axes: [
      linearAxis('bottom', text(config.axisXTitle), theme, false),
      linearAxis('left', text(config.axisYTitle) || '频数', theme, true),
    ],
  };
}

function boxplot(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const grouped = new Map<string, { category: string; values: number[] }>();
  for (const row of rowsOf(config.data)) {
    const value = num(row.value);
    const category = text(row.category);
    if (value == null || !category) continue;
    const group = text(row.group);
    const key = group ? `${category} · ${group}` : category;
    const bucket = grouped.get(key) ?? { category: key, values: [] };
    bucket.values.push(value);
    grouped.set(key, bucket);
  }
  if (!grouped.size) return null;
  const rows = [...grouped.values()].map(({ category, values }) => ({
    category,
    min: Math.min(...values),
    q1: quantile(values, 0.25),
    median: quantile(values, 0.5),
    q3: quantile(values, 0.75),
    max: Math.max(...values),
  }));
  return {
    ...base(config, theme, colors, 'boxPlot', false),
    data: [valuesData(rows)],
    xField: 'category',
    minField: 'min',
    q1Field: 'q1',
    medianField: 'median',
    q3Field: 'q3',
    maxField: 'max',
    direction: 'vertical',
    boxWidth: 38,
    boxPlot: { style: { lineWidth: 1.5, boxFillOpacity: 0.2 } },
    axes: [
      bandAxis('bottom', text(config.axisXTitle), theme),
      linearAxis('left', text(config.axisYTitle), theme, false),
    ],
  };
}

function sankey(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const links: { source: string; target: string; value: number }[] = [];
  const configData = config.data;
  const record = configData && typeof configData === 'object' && !Array.isArray(configData) ? (configData as Row) : null;
  const rawLinks = record && Array.isArray(record.links) ? record.links : configData;
  for (const item of rowsOf(rawLinks)) {
    const source = text(item.source);
    const target = text(item.target);
    const value = num(item.value);
    if (!source || !target || value == null) continue;
    links.push({ source, target, value });
  }
  if (!links.length) return null;
  const nodeNames = unique(
    links.flatMap((link) => [link.source, link.target]),
    (name) => name,
  );
  const align =
    config.nodeAlign === 'left' ||
    config.nodeAlign === 'right' ||
    config.nodeAlign === 'center' ||
    config.nodeAlign === 'justify'
      ? config.nodeAlign
      : 'justify';
  return {
    ...base(config, theme, colors, 'sankey', false),
    data: [
      valuesData(
        [{
          nodes: nodeNames.map((name) => ({ name })),
          links,
        }],
        'gpv-sankey-data',
      ),
    ],
    categoryField: 'name',
    valueField: 'value',
    sourceField: 'source',
    targetField: 'target',
    nodeKey: 'name',
    direction: 'horizontal',
    nodeAlign: align,
    nodeGap: 10,
    nodeWidth: 12,
    node: { style: { cornerRadius: 2 } },
    link: { style: { fillOpacity: 0.26 } },
    label: {
      visible: true,
      position: 'outside',
      style: { fill: theme.text, fontFamily: theme.fontFamily, fontSize: 11 },
    },
  };
}

function treemap(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const root = treeOf(config.data);
  if (!root) return null;
  return {
    ...base(config, theme, colors, 'treemap', false),
    data: [valuesData([root], 'gpv-treemap-data')],
    categoryField: 'name',
    valueField: 'value',
    gapWidth: 2,
    nodePadding: 2,
    roam: false,
    drill: false,
    leaf: { style: { cornerRadius: 2 } },
    nonLeaf: { style: { fillOpacity: 0.12, stroke: theme.background, lineWidth: 1 } },
    label: {
      visible: true,
      style: { fill: theme.tooltipText, fontFamily: theme.fontFamily, fontSize: 11, fontWeight: 600 },
    },
    nonLeafLabel: {
      visible: true,
      position: 'top',
      style: { fill: theme.text, fontFamily: theme.fontFamily, fontSize: 11, fontWeight: 600 },
    },
  };
}

function wordCloud(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data)
    .filter((row) => text(row.text) && num(row.value) != null)
    .map((row) => ({ text: text(row.text), value: num(row.value) ?? 0 }));
  if (!rows.length) return null;
  const largest = Math.max(...rows.map((row) => row.value), 1);
  return {
    ...base(config, theme, colors, 'wordCloud', false),
    data: [valuesData(rows)],
    nameField: 'text',
    valueField: 'value',
    colorList: colors,
    fontSizeRange: [14, Math.max(28, Math.min(64, 18 + Math.sqrt(largest) * 3.4))],
    rotateAngles: [0, 0, 0, -45, 45],
    random: false,
    wordCloudConfig: {
      layoutMode: 'default',
      drawOutOfBound: 'hidden',
      zoomToFit: { shrink: true, enlarge: true },
    },
    word: {
      style: {
        fontFamily: theme.fontFamily,
        fontWeight: 600,
        padding: 2,
      },
    },
  };
}

function liquid(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const ratio = percentNumber(config.percent);
  if (ratio == null) return null;
  const shape =
    config.shape === 'rect' || config.shape === 'triangle' || config.shape === 'pin' || config.shape === 'circle'
      ? config.shape
      : 'circle';
  const maskShape = shape === 'pin' ? 'drop' : shape;
  return {
    ...base(config, theme, colors, 'liquid', false),
    data: [valuesData([{ value: ratio }])],
    valueField: 'value',
    maskShape,
    outerRadius: 0.76,
    centerX: 0.5,
    centerY: 0.54,
    liquid: { style: { fill: colors[0] } },
    liquidBackground: { style: { fill: theme.grid, fillOpacity: 0.38 } },
    liquidOutline: { style: { stroke: colors[0], lineWidth: 2 } },
    indicator: {
      visible: true,
      trigger: 'none',
      limitRatio: 0.7,
      title: { visible: false },
      content: {
        visible: true,
        style: {
          fill: theme.text,
          fontFamily: theme.fontFamily,
          fontSize: 30,
          fontWeight: 700,
          text: (datum: unknown) => {
            const value = datum && typeof datum === 'object' ? num((datum as Row).value) : ratio;
            return `${Math.round((value ?? ratio) * 100)}%`;
          },
        },
      },
    },
    padding: { top: text(config.title) ? 58 : 16, right: 20, bottom: 20, left: 20 },
  };
}

function venn(config: Row, theme: ResolvedThemeTokens, colors: string[]): Record<string, unknown> | null {
  const rows = rowsOf(config.data)
    .map((row) => ({
      sets: setsOf(row.sets),
      value: num(row.value) ?? 0,
      label: text(row.label) || undefined,
    }))
    .filter((row) => row.sets.length > 0);
  if (!rows.length) return null;
  return {
    ...base(config, theme, colors, 'venn', false),
    data: [valuesData(rows)],
    categoryField: 'sets',
    valueField: 'value',
    circle: { style: { fillOpacity: 0.22, strokeWidth: 2 } },
    overlap: { style: { fillOpacity: 0.34 } },
    label: {
      visible: true,
      style: { fill: theme.text, fontFamily: theme.fontFamily, fontSize: 12, fontWeight: 600 },
    },
    overlapLabel: {
      visible: true,
      style: { fill: theme.text, fontFamily: theme.fontFamily, fontSize: 11 },
    },
  };
}

/**
 * Human-readable one-line description of a VChart view. Kept in the same
 * module as buildView so callers do not need to inspect the generated spec.
 */
export function describeView(input: unknown): string {
  const config = readConfig(input);
  if (!config.type) return '等待 vis 语法';
  if (!SUPPORTED.has(config.type)) return `不支持 ${config.type}`;
  const title = text(config.title);
  return title ? `${chartLabel(config.type)}：${shortText(title, 42)}` : chartLabel(config.type);
}

/** Escape a diagnostic string before putting it inside the runtime status layer. */
export function statusHtml(message: string): string {
  return renderPending(message);
}

/** Exposed for integrations that want to display parsed numbers consistently. */
export { escapeHtml, formatNumber };
