import type { ThemeStyle, VisualizationTheme } from './theme.js';

export interface BaseChartConfig {
  type?: string;
  title?: string;
  subtitle?: string;
  theme?: VisualizationTheme;
  style?: ThemeStyle;
}

export interface LineDataItem {
  time: string | number;
  value: number;
  group?: string;
}

export interface LineConfig extends BaseChartConfig {
  type?: 'line';
  data: LineDataItem[];
  axisXTitle?: string;
  axisYTitle?: string;
}

export interface AreaDataItem {
  time: string | number;
  value: number;
  group?: string;
}

export interface AreaConfig extends BaseChartConfig {
  type?: 'area';
  data: AreaDataItem[];
  stack?: boolean;
  axisXTitle?: string;
  axisYTitle?: string;
}

export interface ColumnDataItem {
  category: string;
  value: number;
  group?: string;
}

export interface ColumnConfig extends BaseChartConfig {
  type?: 'column';
  data: ColumnDataItem[];
  group?: boolean;
  stack?: boolean;
  label?: boolean;
  axisXTitle?: string;
  axisYTitle?: string;
}

export interface BarDataItem {
  category: string;
  value: number;
  group?: string;
}

export interface BarConfig extends BaseChartConfig {
  type?: 'bar';
  data: BarDataItem[];
  group?: boolean;
  stack?: boolean;
  label?: boolean;
  axisXTitle?: string;
  axisYTitle?: string;
}

export interface PieDataItem {
  category: string;
  value: number;
}

export interface PieConfig extends BaseChartConfig {
  type?: 'pie';
  data: PieDataItem[];
  innerRadius?: number;
}

export interface ScatterDataItem {
  x: number;
  y: number;
  group?: string;
}

export interface ScatterConfig extends BaseChartConfig {
  type?: 'scatter';
  data: ScatterDataItem[];
  axisXTitle?: string;
  axisYTitle?: string;
}

export interface RadarDataItem {
  name: string;
  value: number;
  group?: string;
}

export interface RadarConfig extends BaseChartConfig {
  type?: 'radar';
  data: RadarDataItem[];
  align?: boolean;
}

export interface FunnelDataItem {
  category: string;
  value: number;
}

export interface FunnelConfig extends BaseChartConfig {
  type?: 'funnel';
  data: FunnelDataItem[];
  conversionRateLabel?: string;
}

export interface WaterfallDataItem {
  category: string;
  value?: number;
  isIntermediateTotal?: boolean;
  isTotal?: boolean;
}

export interface WaterfallConfig extends BaseChartConfig {
  type?: 'waterfall';
  data: WaterfallDataItem[];
  axisXTitle?: string;
  axisYTitle?: string;
}

export interface DualAxesSeriesItem {
  type: 'line' | 'column';
  data: number[];
  axisYTitle?: string;
}

export interface DualAxesConfig extends BaseChartConfig {
  type?: 'dual-axes';
  categories: string[];
  series: DualAxesSeriesItem[];
  axisXTitle?: string;
}

export interface HistogramConfig extends BaseChartConfig {
  type?: 'histogram';
  data: number[];
  binNumber?: number;
  axisXTitle?: string;
  axisYTitle?: string;
}

export interface BoxplotDataItem {
  category: string;
  value: number;
  group?: string;
}

export interface BoxplotConfig extends BaseChartConfig {
  type?: 'boxplot';
  data: BoxplotDataItem[];
  axisXTitle?: string;
  axisYTitle?: string;
}

export interface ViolinDataItem {
  category: string;
  value: number;
  group?: string;
}

export interface ViolinConfig extends BaseChartConfig {
  type?: 'violin';
  data: ViolinDataItem[];
  axisXTitle?: string;
  axisYTitle?: string;
}

export interface VennDataItem {
  sets: string[] | string;
  value: number;
  label?: string;
}

export interface VennConfig extends BaseChartConfig {
  type?: 'venn';
  data: VennDataItem[];
}

export interface SankeyDataItem {
  source: string;
  target: string;
  value: number;
}

export interface SankeyConfig extends BaseChartConfig {
  type?: 'sankey';
  data: SankeyDataItem[];
  nodeAlign?: 'left' | 'center' | 'right' | 'justify';
}

export interface TreemapDataItem {
  name: string;
  value: number;
  children?: TreemapDataItem[];
}

export interface TreemapConfig extends BaseChartConfig {
  type?: 'treemap';
  data: TreemapDataItem[];
}

export interface WordCloudDataItem {
  text: string;
  value: number;
}

export interface WordCloudConfig extends BaseChartConfig {
  type?: 'word-cloud';
  data: WordCloudDataItem[];
  locale?: string;
}

export interface LiquidConfig extends BaseChartConfig {
  type?: 'liquid';
  percent: number;
  shape?: 'circle' | 'rect' | 'pin' | 'triangle';
}

export interface TreeGraphData {
  name: string;
  description?: string;
  children?: TreeGraphData[];
}

export interface NetworkGraphNode {
  name: string;
}

export interface NetworkGraphEdge {
  source: string;
  target: string;
  name?: string;
}

export interface NetworkGraphData {
  nodes: NetworkGraphNode[];
  edges: NetworkGraphEdge[];
}

export interface NetworkGraphConfig extends BaseChartConfig {
  type?: 'network-graph';
  data: NetworkGraphData;
  layout?: 'force' | 'circular' | 'grid' | 'radial' | 'concentric' | 'dagre';
}

export interface FlowDiagramConfig extends BaseChartConfig {
  type?: 'flow-diagram';
  data: NetworkGraphData;
}

export interface MindmapConfig extends BaseChartConfig {
  type?: 'mindmap';
  data: TreeGraphData;
  direction?: 'H' | 'LR' | 'RL';
}

export interface IndentedTreeConfig extends BaseChartConfig {
  type?: 'indented-tree';
  data: TreeGraphData;
  direction?: 'LR' | 'RL' | 'H';
}

export interface OrganizationChartConfig extends BaseChartConfig {
  type?: 'organization-chart';
  data: TreeGraphData;
}

export interface FishboneNode {
  name: string;
  children?: FishboneNode[];
}

export interface FishboneDiagramConfig extends BaseChartConfig {
  type?: 'fishbone-diagram';
  data: FishboneNode;
}

export interface TableConfig extends BaseChartConfig {
  type?: 'table';
  data: Record<string, unknown>[];
}

export type SummaryConfig = string;

export type VisConfig =
  | LineConfig
  | AreaConfig
  | ColumnConfig
  | BarConfig
  | PieConfig
  | ScatterConfig
  | RadarConfig
  | FunnelConfig
  | WaterfallConfig
  | DualAxesConfig
  | HistogramConfig
  | BoxplotConfig
  | ViolinConfig
  | VennConfig
  | SankeyConfig
  | TreemapConfig
  | WordCloudConfig
  | LiquidConfig
  | NetworkGraphConfig
  | FlowDiagramConfig
  | MindmapConfig
  | IndentedTreeConfig
  | OrganizationChartConfig
  | FishboneDiagramConfig
  | TableConfig;
