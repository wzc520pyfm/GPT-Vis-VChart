export type ThemeName = 'default' | 'light' | 'dark' | 'academy';

export type ChartType =
  | 'area'
  | 'bar'
  | 'boxplot'
  | 'column'
  | 'dual-axes'
  | 'fishbone-diagram'
  | 'flow-diagram'
  | 'funnel'
  | 'histogram'
  | 'indented-tree'
  | 'line'
  | 'liquid'
  | 'mindmap'
  | 'network-graph'
  | 'organization-chart'
  | 'pie'
  | 'radar'
  | 'sankey'
  | 'scatter'
  | 'summary'
  | 'table'
  | 'treemap'
  | 'venn'
  | 'violin'
  | 'waterfall'
  | 'word-cloud';

/** Reusable visual theme. Local chart config takes precedence over this spec. */
export interface ThemeSpec {
  /** Stable identifier; does not register a theme name. */
  id: string;
  /** Human-readable theme name. */
  label: string;
  description?: string;
  baseTheme?: string;
  tokens?: ThemeTokens;
  /** Shared visual overrides, applied after token expansion. */
  style?: ThemeStyle;
  /** Additional visual overrides for individual chart types. */
  charts?: Partial<Record<ChartType, { style?: ThemeStyle }>>;
}

/**
 * Visual style namespaces accepted for ThemeSpec compatibility. The renderer
 * consumes backgroundColor, palette and the typography tokens. Other fields
 * remain available to applications that share one spec across visualizers.
 */
export interface ThemeStyle {
  backgroundColor?: string;
  palette?: string[];
  title?: Record<string, unknown>;
  axis?: Record<string, unknown>;
  legend?: Record<string, unknown>;
  label?: Record<string, unknown>;
  mark?: {
    line?: Record<string, unknown>;
    area?: Record<string, unknown>;
    point?: Record<string, unknown>;
    interval?: Record<string, unknown>;
    box?: Record<string, unknown>;
    connector?: Record<string, unknown>;
    path?: Record<string, unknown>;
    density?: Record<string, unknown>;
    link?: Record<string, unknown>;
    liquid?: Record<string, unknown>;
    treemap?: Record<string, unknown>;
    sankey?: Record<string, unknown>;
    wordCloud?: Record<string, unknown>;
  };
  node?: Record<string, unknown>;
  edge?: Record<string, unknown>;
  table?: {
    header?: Record<string, unknown>;
    cell?: Record<string, unknown>;
    border?: Record<string, unknown>;
  };
  summary?: Record<string, unknown>;
  texture?: 'rough' | 'default';
  /** @deprecated Use `mark.line.lineWidth`. */
  lineWidth?: number;
}

/** High-frequency seed tokens from GPT-Vis ThemeSpec. */
export interface ThemeTokens {
  colorDefault?: string;
  colorBackground?: string;
  colorSurface?: string;
  colorText?: string;
  colorTextSecondary?: string;
  colorTextInverse?: string;
  colorStroke?: string;
  colorPositive?: string;
  colorNegative?: string;
  colorNeutral?: string;
  category10?: string[];
  category20?: string[];
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number | 'normal' | 'bold';
  lineHeight?: number;
  spacingSmall?: number;
  spacingMedium?: number;
  lineWidth?: number;
  radius?: number;
}

/** A built-in theme name or an inline GPT-Vis-compatible theme spec. */
export type VisualizationTheme = ThemeName | ThemeSpec;

export interface ResolvedThemeTokens {
  name: Exclude<ThemeName, 'light'>;
  background: string;
  text: string;
  muted: string;
  grid: string;
  tooltipBg: string;
  tooltipText: string;
  palette: string[];
  positive: string;
  negative: string;
  total: string;
  fontFamily: string;
  fontSize: number;
  lineWidth: number;
  radius: number;
}

const DEFAULT_FONT = '"IBM Plex Sans", "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif';
const DEFAULT_PALETTE = ['#0f6e6b', '#d4652f', '#2f5d9f', '#c4a15a', '#6d4c7d', '#3d8b6e', '#b44848', '#4c6b7a'];
const DARK_PALETTE = ['#7dcec6', '#f0a36a', '#8eb4e8', '#e4c98a', '#c9a4d6', '#8dceb0', '#f0a0a0', '#b7c7d1'];
const ACADEMY_PALETTE = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#9c755f'];

export function resolveTheme(theme: unknown, fallback: VisualizationTheme = 'default'): ResolvedThemeTokens {
  const selected = isThemeName(theme) || isThemeSpec(theme) ? theme : fallback;
  if (isThemeSpec(selected)) return applyThemeSpec(namedTheme(selected.baseTheme), selected);
  return namedTheme(selected);
}

function isThemeName(value: unknown): value is ThemeName {
  return value === 'default' || value === 'light' || value === 'dark' || value === 'academy';
}

function isThemeSpec(value: unknown): value is ThemeSpec {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const spec = value as Partial<ThemeSpec>;
  return typeof spec.id === 'string' || typeof spec.label === 'string';
}

function namedTheme(theme: unknown): ResolvedThemeTokens {
  const name: Exclude<ThemeName, 'light'> = theme === 'dark' || theme === 'academy' ? theme : 'default';
  if (name === 'dark') {
    return {
      name,
      background: '#14191a',
      text: '#f3efe6',
      muted: '#b7b1a6',
      grid: '#2c3436',
      tooltipBg: '#243031',
      tooltipText: '#f6f3ec',
      palette: DARK_PALETTE,
      positive: '#7dce9a',
      negative: '#f0a0a0',
      total: '#8eb4e8',
      fontFamily: DEFAULT_FONT,
      fontSize: 14,
      lineWidth: 2,
      radius: 3,
    };
  }
  if (name === 'academy') {
    return {
      name,
      background: '#f6f3ec',
      text: '#1d2a33',
      muted: '#5d6c75',
      grid: '#e3dccc',
      tooltipBg: '#1d2a33',
      tooltipText: '#f6f3ec',
      palette: ACADEMY_PALETTE,
      positive: '#59a14f',
      negative: '#e15759',
      total: '#4e79a7',
      fontFamily: DEFAULT_FONT,
      fontSize: 14,
      lineWidth: 2,
      radius: 3,
    };
  }
  return {
    name: 'default',
    background: '#fbf9f6',
    text: '#1c1916',
    muted: '#6e675f',
    grid: '#e6e0d6',
    tooltipBg: '#1c1916',
    tooltipText: '#fbf9f6',
    palette: DEFAULT_PALETTE,
    positive: '#2f7d4a',
    negative: '#b44848',
    total: '#2f5d9f',
    fontFamily: DEFAULT_FONT,
    fontSize: 14,
    lineWidth: 2,
    radius: 3,
  };
}

function applyThemeSpec(base: ResolvedThemeTokens, spec: ThemeSpec): ResolvedThemeTokens {
  const tokens = spec.tokens ?? {};
  const style = spec.style ?? {};
  return {
    ...base,
    background: safeColor(style.backgroundColor, safeColor(tokens.colorBackground, base.background)) ?? base.background,
    text: safeColor(tokens.colorText, base.text) ?? base.text,
    muted: safeColor(tokens.colorTextSecondary ?? tokens.colorNeutral, base.muted) ?? base.muted,
    grid: safeColor(tokens.colorStroke, base.grid) ?? base.grid,
    tooltipBg: safeColor(tokens.colorSurface, base.tooltipBg) ?? base.tooltipBg,
    tooltipText: safeColor(tokens.colorTextInverse, base.tooltipText) ?? base.tooltipText,
    palette: safePalette(style.palette, safePalette(tokens.category10 ?? tokens.category20, base.palette)),
    positive: safeColor(tokens.colorPositive, base.positive) ?? base.positive,
    negative: safeColor(tokens.colorNegative, base.negative) ?? base.negative,
    total: safeColor(tokens.colorDefault, base.total) ?? base.total,
    fontFamily: cleanFont(tokens.fontFamily) ?? base.fontFamily,
    fontSize: safePositive(tokens.fontSize, base.fontSize),
    lineWidth: safePositive(tokens.lineWidth, base.lineWidth),
    radius: safeNonNegative(tokens.radius, base.radius),
  };
}

const COLOR_LITERAL =
  /^(?:#[0-9a-f]{3,8}|rgba?\([\d.%\s,/+-]+\)|hsla?\([\d.%\s,/+-]+\)|(?:transparent|currentColor|[a-z]{3,24}))$/i;

/** Keep model-supplied colors inside CSS color syntax. Never accept urls or expressions. */
export function safeColor(value: unknown, fallback?: string): string | undefined {
  if (typeof value !== 'string') return fallback;
  const color = value.trim();
  if (!COLOR_LITERAL.test(color)) return fallback;
  if (/url|expression|javascript|var|env/i.test(color)) return fallback;
  return color;
}

export function safePalette(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const colors = value.map((item) => safeColor(item)).filter((item): item is string => Boolean(item));
  return colors.length ? colors.slice(0, 24) : fallback;
}

function cleanFont(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const font = value.trim();
  if (!font || font.length > 160 || /[;{}<>\\]|url\s*\(|expression\s*\(/i.test(font)) return undefined;
  return font;
}

function safePositive(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.min(96, value) : fallback;
}

function safeNonNegative(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(64, value) : fallback;
}
