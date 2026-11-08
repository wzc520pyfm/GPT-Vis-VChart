import { registerLiquidChart, registerVennChart, VChart } from '@visactor/vchart';
import { buildView, statusHtml, type ViewContext } from './build.js';
import { readConfig } from './parser.js';
import type { VisualizationTheme } from './theme.js';
import { escapeHtml } from './text.js';
import { copyText, downloadChart, mountVisShell, type VisShell } from './wrapper.js';

type VChartSpec = ConstructorParameters<typeof VChart>[0];
type VChartInstance = InstanceType<typeof VChart>;

VChart.useRegisters([registerLiquidChart, registerVennChart]);

const ZOOMABLE = new Set([
  'flow-diagram',
  'network-graph',
  'mindmap',
  'indented-tree',
  'organization-chart',
  'fishbone-diagram',
  'violin',
]);

export interface GPTVisOptions {
  container: string | HTMLElement;
  width?: number;
  height?: number;
  theme?: VisualizationTheme;
  streaming?: boolean;
  wrapper?: boolean;
  locale?: string;
  onStatus?: (status: RenderStatus) => void;
}

export interface RenderStatus {
  state: 'pending' | 'ready' | 'unsupported' | 'error';
  message: string;
}

export class GPTVis {
  private root: HTMLElement;
  private chartHost: HTMLDivElement;
  private fallback: HTMLDivElement;
  private chart: VChartInstance | null = null;
  private chartType = '';
  private observer: ResizeObserver | null = null;
  private options: GPTVisOptions;
  private shell: VisShell | null = null;
  private sourceText = '';
  private zoom = 1;
  private resizeFrame = 0;

  constructor(options: GPTVisOptions) {
    this.options = options;
    const container = resolveContainer(options.container);
    container.replaceChildren();
    if (options.wrapper) {
      this.shell = mountVisShell(container, options.locale, {
        download: () => downloadChart('gptvis-vchart', this.chart, this.fallback),
        copy: () => {
          void copyText(this.sourceText).catch(() => undefined);
        },
        zoomIn: () => this.zoomTo(this.getZoom() * 1.2),
        zoomOut: () => this.zoomTo(this.getZoom() / 1.2),
      });
    }
    this.root = document.createElement('div');
    this.root.className = 'gpv-root';
    this.chartHost = document.createElement('div');
    this.chartHost.className = 'gpv-chart';
    this.fallback = document.createElement('div');
    this.fallback.className = 'gpv-fallback';
    this.fallback.hidden = true;
    this.root.append(this.chartHost, this.fallback);
    (this.shell?.chartSlot ?? container).append(this.root);
    ensureStyles();
    this.observer = new ResizeObserver(() => this.scheduleResize());
    this.observer.observe(this.root);
  }

  render(input: string | Record<string, unknown>): void {
    this.sourceText = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
    this.shell?.setSource(this.sourceText);
    const config = readConfig(input, { streaming: this.options.streaming });
    this.shell?.setZoomVisible(ZOOMABLE.has(config.type));
    const box = this.root.getBoundingClientRect();
    const context: ViewContext = {
      theme: this.options.theme,
      streaming: this.options.streaming,
      width: this.options.width || box.width || undefined,
      height: this.options.height || box.height || undefined,
    };

    let view;
    try {
      view = buildView(input, context);
    } catch (error) {
      this.fail(error);
      return;
    }

    this.root.style.background = view.background;
    if (view.kind === 'vchart') {
      this.fallback.hidden = true;
      this.fallback.replaceChildren();
      this.chartHost.hidden = false;
      try {
        this.applySpec(view.spec);
        this.applyZoom();
        this.options.onStatus?.({ state: 'ready', message: view.message });
      } catch (error) {
        this.fail(error);
      }
      return;
    }

    this.disposeChart();
    this.showFallback(view.html, view.background);
    this.applyZoom();
    const state = view.kind === 'pending' ? 'pending' : view.kind === 'error' ? 'unsupported' : 'ready';
    this.options.onStatus?.({ state, message: view.message });
  }

  resize(): void {
    this.resizeNow();
  }

  zoomTo(zoom: number): void {
    if (!Number.isFinite(zoom)) return;
    this.zoom = Math.min(4, Math.max(0.35, zoom));
    this.applyZoom();
  }

  getZoom(): number {
    return this.zoom;
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = 0;
    this.disposeChart();
    if (this.shell) this.shell.destroy();
    else this.root.remove();
    this.shell = null;
  }

  private applySpec(spec: Record<string, unknown>): void {
    const type = typeof spec.type === 'string' ? spec.type : '';
    if (this.chart && type !== this.chartType) this.disposeChart();
    if (!this.chart) {
      this.chartHost.replaceChildren();
      this.chart = new VChart(spec as unknown as VChartSpec, {
        dom: this.chartHost,
        autoFit: true,
        animation: false,
        onError: (error: unknown) => this.fail(error),
      });
      this.chart.renderSync();
    } else {
      this.chart.updateSpecSync(spec as unknown as VChartSpec, true);
      this.chart.renderSync();
    }
    this.chartType = type;
  }

  private scheduleResize(): void {
    if (this.resizeFrame) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = 0;
      this.resizeNow();
    });
  }

  private resizeNow(): void {
    if (!this.chart) return;
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    if (width < 2 || height < 2) return;
    const size = this.chart.getCurrentSize();
    if (Math.abs(size.width - width) < 1 && Math.abs(size.height - height) < 1) return;
    void this.chart.resize(width, height).catch(() => undefined);
  }

  private applyZoom(): void {
    const target = this.chart ? this.chartHost : this.fallback;
    target.style.transform = this.zoom === 1 ? '' : `scale(${this.zoom})`;
    target.style.transformOrigin = 'center top';
  }

  private showFallback(html: string, background: string): void {
    this.chartHost.hidden = true;
    this.fallback.hidden = false;
    this.fallback.style.background = background;
    this.fallback.innerHTML = html;
  }

  private fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error || '图表渲染失败');
    this.disposeChart();
    this.showFallback(statusHtml(`VChart 渲染失败：${message}`), this.root.style.background || 'transparent');
    this.options.onStatus?.({ state: 'error', message });
  }

  private disposeChart(): void {
    if (!this.chart) return;
    try {
      this.chart.release();
    } catch {
      // Releasing a chart after a failed render is best-effort.
    }
    this.chart = null;
    this.chartType = '';
    this.chartHost.replaceChildren();
  }
}

export function bindGPTVis(container: string | HTMLElement, options: Omit<GPTVisOptions, 'container'> = {}) {
  const vis = new GPTVis({ container, ...options });
  return {
    update(content: string | Record<string, unknown>) {
      vis.render(content);
    },
    resize() {
      vis.resize();
    },
    zoomTo(zoom: number) {
      vis.zoomTo(zoom);
    },
    getZoom() {
      return vis.getZoom();
    },
    destroy() {
      vis.destroy();
    },
  };
}

function resolveContainer(container: string | HTMLElement): HTMLElement {
  if (typeof container !== 'string') return container;
  const element = document.querySelector(container);
  if (!(element instanceof HTMLElement)) throw new Error(`找不到容器：${escapeHtml(container)}`);
  return element;
}

const STYLE_ID = 'gpv-styles';

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.append(style);
}

const STYLES = `
.gpv-root, .gpv-chart, .gpv-fallback { width: 100%; height: 100%; min-height: 280px; }
.gpv-root [hidden], .gpv-shell [hidden] { display: none !important; }
.gpv-root { position: relative; overflow: hidden; color: #1c1916; }
.gpv-chart { position: relative; }
.gpv-fallback { overflow: auto; box-sizing: border-box; }
.gpv-fallback *, .gpv-shell * { box-sizing: border-box; }
.gpv-markup-head { padding: 18px 20px 4px; }
.gpv-markup-head h3 { margin: 0; color: var(--gpv-ink, #1c1916); font: 600 17px/1.35 "IBM Plex Sans", "PingFang SC", "Microsoft YaHei", sans-serif; letter-spacing: -0.01em; }
.gpv-markup-head p { margin: 4px 0 0; color: var(--gpv-muted, #6e675f); font: 400 12px/1.45 "IBM Plex Sans", "PingFang SC", "Microsoft YaHei", sans-serif; }
.gpv-status { min-height: 280px; display: grid; place-items: center; align-content: center; gap: 7px; padding: 30px; text-align: center; color: #6e675f; font-family: "IBM Plex Sans", "PingFang SC", "Microsoft YaHei", sans-serif; }
.gpv-status p { max-width: 50ch; margin: 0; color: inherit; font-size: 15px; line-height: 1.55; }
.gpv-status span { max-width: 48ch; color: inherit; opacity: 0.72; font-size: 12px; line-height: 1.5; }
.gpv-status-error p { color: #a33b32; font-weight: 600; }
.gpv-table, .gpv-summary, .gpv-svgplot { min-height: 100%; color: var(--gpv-ink); }
.gpv-table-scroll { overflow: auto; padding: 10px 16px 18px; }
.gpv-table table { width: 100%; border-collapse: collapse; font: 400 13px/1.4 "IBM Plex Sans", "PingFang SC", "Microsoft YaHei", sans-serif; }
.gpv-table th, .gpv-table td { padding: 10px 12px; border-bottom: 1px solid var(--gpv-line); text-align: left; white-space: nowrap; }
.gpv-table th { color: var(--gpv-muted); font-size: 11px; font-weight: 600; letter-spacing: 0.04em; }
.gpv-table tbody tr:hover td { background: color-mix(in srgb, var(--gpv-line) 52%, transparent); }
.gpv-empty { color: var(--gpv-muted); opacity: 0.7; }
.gpv-summary-body { padding: 2px 20px 24px; font: 400 14px/1.7 "IBM Plex Sans", "PingFang SC", "Microsoft YaHei", sans-serif; }
.gpv-summary-body p, .gpv-summary-body ul { margin: 10px 0; }
.gpv-summary-body h3, .gpv-summary-body h4, .gpv-summary-body h5 { margin: 18px 0 8px; color: var(--gpv-ink); font-weight: 600; line-height: 1.35; }
.gpv-summary-body h3 { font-size: 18px; } .gpv-summary-body h4 { font-size: 16px; } .gpv-summary-body h5 { font-size: 14px; }
.gpv-summary-body code { padding: 1px 4px; border-radius: 4px; background: color-mix(in srgb, var(--gpv-line) 55%, transparent); font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 0.92em; }
.gpv-chip { display: inline-flex; align-items: center; gap: 4px; margin: 0 2px; padding: 0 6px; border-radius: 999px; background: color-mix(in srgb, var(--gpv-accent) 15%, transparent); color: var(--gpv-accent); font-weight: 600; }
.gpv-chip.pos { background: color-mix(in srgb, #2f7d4a 16%, transparent); color: #2f7d4a; }
.gpv-chip.neg { background: color-mix(in srgb, #a33b32 16%, transparent); color: #a33b32; }
.gpv-chip.eq, .gpv-chip.meta { background: color-mix(in srgb, var(--gpv-muted) 16%, transparent); color: var(--gpv-ink); }
.gpv-spark { display: inline-block; vertical-align: middle; }
.gpv-svg-scroll { overflow: auto; max-width: 100%; padding: 8px 16px 18px; }
.gpv-svgplot svg { display: block; width: 100%; height: auto; max-height: 100%; overflow: visible; }
.gpv-svgplot text { font-family: "IBM Plex Sans", "PingFang SC", "Microsoft YaHei", sans-serif; }
.gpv-edge-label { fill: var(--gpv-muted); font-size: 17px; stroke: var(--gpv-ink); stroke-width: 4px; stroke-opacity: 0.16; paint-order: stroke; }
.gpv-secondary { fill: var(--gpv-muted); font-size: 13px; }
.gpv-bone { font-size: 15px; font-weight: 650; }
.gpv-graph-node, .gpv-flow-node, .gpv-mind-node, .gpv-org-node, .gpv-violin-shape { transition: opacity 160ms ease; }
.gpv-graph-node:hover, .gpv-flow-node:hover, .gpv-mind-node:hover, .gpv-org-node:hover, .gpv-violin-shape:hover { opacity: 0.82; }
.gpv-shell { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 320px; overflow: hidden; border: 1px solid rgba(27,23,20,.13); border-radius: 16px; background: #fff; }
.gpv-shell-bar { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 8px 10px; border-bottom: 1px solid rgba(27,23,20,.08); }
.gpv-shell-tabs, .gpv-shell-actions { display: flex; gap: 6px; align-items: center; }
.gpv-shell-tab, .gpv-shell-icon { border: 0; background: transparent; color: #5c564e; border-radius: 999px; padding: 6px 10px; font: 600 12px/1 "IBM Plex Sans", sans-serif; cursor: pointer; }
.gpv-shell-tab.on { background: #1b1714; color: #f7f1e8; }
.gpv-shell-icon:hover { background: rgba(27,23,20,.06); }
.gpv-shell-chart { flex: 1; min-height: 280px; }
.gpv-shell-code { flex: 1; min-height: 280px; margin: 0; padding: 16px 18px; overflow: auto; white-space: pre-wrap; background: #faf8f4; font: 12px/1.6 "IBM Plex Mono", ui-monospace, monospace; }
@media (prefers-reduced-motion: reduce) { .gpv-graph-node, .gpv-flow-node, .gpv-mind-node, .gpv-org-node, .gpv-violin-shape { transition: none; } }
`;
