export interface WrapperLabels {
  chart: string;
  code: string;
  download: string;
  copy: string;
  copied: string;
  zoomIn: string;
  zoomOut: string;
}

const LABELS: Record<string, WrapperLabels> = {
  'zh-CN': { chart: '图表', code: '代码', download: '下载', copy: '复制', copied: '已复制', zoomIn: '放大', zoomOut: '缩小' },
  'en-US': { chart: 'Chart', code: 'Code', download: 'Download', copy: 'Copy', copied: 'Copied', zoomIn: 'Zoom in', zoomOut: 'Zoom out' },
};

export function wrapperLabels(locale: string | undefined): WrapperLabels {
  if (locale?.toLowerCase().startsWith('zh')) return LABELS['zh-CN'];
  return LABELS['en-US'];
}

export interface VisShell {
  chartSlot: HTMLElement;
  setSource(source: string): void;
  setZoomVisible(visible: boolean): void;
  destroy(): void;
}

export function mountVisShell(
  container: HTMLElement,
  locale: string | undefined,
  actions: { download(): void | Promise<void>; copy(): void; zoomIn(): void; zoomOut(): void },
): VisShell {
  const labels = wrapperLabels(locale);
  const shell = document.createElement('div');
  shell.className = 'gpv-shell';
  shell.innerHTML = `
    <div class="gpv-shell-bar">
      <div class="gpv-shell-tabs" role="tablist">
        <button type="button" class="gpv-shell-tab on" data-tab="chart" role="tab" aria-selected="true">${labels.chart}</button>
        <button type="button" class="gpv-shell-tab" data-tab="code" role="tab" aria-selected="false">${labels.code}</button>
      </div>
      <div class="gpv-shell-actions">
        <button type="button" class="gpv-shell-icon" data-action="zoom-out" aria-label="${labels.zoomOut}" hidden>${labels.zoomOut}</button>
        <button type="button" class="gpv-shell-icon" data-action="zoom-in" aria-label="${labels.zoomIn}" hidden>${labels.zoomIn}</button>
        <button type="button" class="gpv-shell-icon" data-action="download">${labels.download}</button>
        <button type="button" class="gpv-shell-icon" data-action="copy" hidden>${labels.copy}</button>
      </div>
    </div>
    <div class="gpv-shell-chart" data-panel="chart"></div>
    <pre class="gpv-shell-code" data-panel="code" hidden></pre>
  `;
  container.append(shell);
  const chartSlot = shell.querySelector('.gpv-shell-chart') as HTMLElement;
  const code = shell.querySelector('.gpv-shell-code') as HTMLElement;
  const copyButton = shell.querySelector('[data-action="copy"]') as HTMLButtonElement;
  const downloadButton = shell.querySelector('[data-action="download"]') as HTMLButtonElement;
  const zoomButtons = [...shell.querySelectorAll<HTMLButtonElement>('[data-action="zoom-in"], [data-action="zoom-out"]')];
  let copyTimer = 0;
  let zoomVisible = false;

  shell.addEventListener('click', (event) => {
    const target = event.target instanceof HTMLElement ? event.target.closest('button') : null;
    if (!(target instanceof HTMLButtonElement)) return;
    const tab = target.dataset.tab;
    if (tab === 'chart' || tab === 'code') {
      const showCode = tab === 'code';
      shell.querySelectorAll<HTMLButtonElement>('.gpv-shell-tab').forEach((button) => {
        const selected = button.dataset.tab === tab;
        button.classList.toggle('on', selected);
        button.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      chartSlot.hidden = showCode;
      code.hidden = !showCode;
      copyButton.hidden = !showCode;
      downloadButton.hidden = showCode;
      syncZoom();
      return;
    }
    if (target.dataset.action === 'download') void actions.download();
    if (target.dataset.action === 'zoom-in') actions.zoomIn();
    if (target.dataset.action === 'zoom-out') actions.zoomOut();
    if (target.dataset.action === 'copy') {
      actions.copy();
      copyButton.textContent = labels.copied;
      window.clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => {
        copyButton.textContent = labels.copy;
      }, 1200);
    }
  });

  function syncZoom(): void {
    const hide = chartSlot.hidden || !zoomVisible;
    for (const button of zoomButtons) button.hidden = hide;
  }

  return {
    chartSlot,
    setSource(source: string) {
      code.textContent = source;
    },
    setZoomVisible(visible: boolean) {
      zoomVisible = visible;
      syncZoom();
    },
    destroy() {
      window.clearTimeout(copyTimer);
      shell.remove();
    },
  };
}

export async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement('textarea');
  area.value = value;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

export interface ExportableChart {
  getDataURL(): Promise<string>;
}

export async function downloadChart(filename: string, chart: ExportableChart | null, fallback: HTMLElement): Promise<void> {
  if (chart) {
    const url = await chart.getDataURL();
    if (url) saveUrl(url, `${filename}.png`);
    return;
  }
  const svg = fallback.querySelector('svg');
  if (svg) {
    const source = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}`], { type: 'image/svg+xml' });
    saveObjectUrl(URL.createObjectURL(blob), `${filename}.svg`);
    return;
  }
  const markup = fallback.innerHTML || '';
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${markup}</div></foreignObject></svg>`;
  const blob = new Blob([wrapped], { type: 'image/svg+xml' });
  saveObjectUrl(URL.createObjectURL(blob), `${filename}.svg`);
}

function saveObjectUrl(url: string, filename: string): void {
  saveUrl(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function saveUrl(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
}
