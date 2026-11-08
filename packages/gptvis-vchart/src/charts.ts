import { GPTVis, type GPTVisOptions } from './runtime.js';

const CHART_TYPES = [
  'line',
  'area',
  'column',
  'bar',
  'pie',
  'scatter',
  'radar',
  'funnel',
  'waterfall',
  'dual-axes',
  'histogram',
  'boxplot',
  'violin',
  'venn',
  'sankey',
  'treemap',
  'word-cloud',
  'liquid',
  'flow-diagram',
  'network-graph',
  'mindmap',
  'indented-tree',
  'organization-chart',
  'fishbone-diagram',
  'table',
] as const;

export type ChartTypeName = (typeof CHART_TYPES)[number];

export interface ChartHandle<Config = Record<string, unknown>> {
  render(config: Config | string): void;
  resize(): void;
  destroy(): void;
  zoomTo(zoom: number): void;
  getZoom(): number;
}

function createChart<Config>(type: ChartTypeName, options: GPTVisOptions): ChartHandle<Config> {
  const vis = new GPTVis(options);
  return {
    render(config) {
      if (typeof config === 'string') {
        vis.render(config);
        return;
      }
      vis.render({ type, ...(config as Record<string, unknown>) });
    },
    resize() {
      vis.resize();
    },
    destroy() {
      vis.destroy();
    },
    zoomTo(zoom: number) {
      vis.zoomTo(zoom);
    },
    getZoom() {
      return vis.getZoom();
    },
  };
}

export const Line = (options: GPTVisOptions) => createChart('line', options);
export const Area = (options: GPTVisOptions) => createChart('area', options);
export const Column = (options: GPTVisOptions) => createChart('column', options);
export const Bar = (options: GPTVisOptions) => createChart('bar', options);
export const Pie = (options: GPTVisOptions) => createChart('pie', options);
export const Scatter = (options: GPTVisOptions) => createChart('scatter', options);
export const Radar = (options: GPTVisOptions) => createChart('radar', options);
export const Funnel = (options: GPTVisOptions) => createChart('funnel', options);
export const Waterfall = (options: GPTVisOptions) => createChart('waterfall', options);
export const DualAxes = (options: GPTVisOptions) => createChart('dual-axes', options);
export const Histogram = (options: GPTVisOptions) => createChart('histogram', options);
export const Boxplot = (options: GPTVisOptions) => createChart('boxplot', options);
export const Violin = (options: GPTVisOptions) => createChart('violin', options);
export const Venn = (options: GPTVisOptions) => createChart('venn', options);
export const Sankey = (options: GPTVisOptions) => createChart('sankey', options);
export const Treemap = (options: GPTVisOptions) => createChart('treemap', options);
export const WordCloud = (options: GPTVisOptions) => createChart('word-cloud', options);
export const Liquid = (options: GPTVisOptions) => createChart('liquid', options);
export const FlowDiagram = (options: GPTVisOptions) => createChart('flow-diagram', options);
export const NetworkGraph = (options: GPTVisOptions) => createChart('network-graph', options);
export const Mindmap = (options: GPTVisOptions) => createChart('mindmap', options);
export const IndentedTree = (options: GPTVisOptions) => createChart('indented-tree', options);
export const OrganizationChart = (options: GPTVisOptions) => createChart('organization-chart', options);
export const FishboneDiagram = (options: GPTVisOptions) => createChart('fishbone-diagram', options);
export const Table = (options: GPTVisOptions) => createChart('table', options);

export function Summary(options: GPTVisOptions): ChartHandle<string | Record<string, unknown>> {
  const vis = new GPTVis(options);
  return {
    render(config) {
      if (typeof config === 'string') {
        vis.render(config);
        return;
      }
      vis.render({ type: 'summary', ...config });
    },
    resize() {
      vis.resize();
    },
    destroy() {
      vis.destroy();
    },
    zoomTo(zoom: number) {
      vis.zoomTo(zoom);
    },
    getZoom() {
      return vis.getZoom();
    },
  };
}
