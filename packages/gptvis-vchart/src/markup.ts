import { escapeHtml, renderSummary } from './text.js';
import type { ResolvedThemeTokens } from './theme.js';
import { rowsOf, text, type Row } from './util.js';

export function renderTable(config: Row, theme: ResolvedThemeTokens): string | null {
  const rows = rowsOf(config.data);
  if (!rows.length) return null;

  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  const head = columns.map((key) => `<th scope="col">${escapeHtml(key)}</th>`).join('');
  const body = rows
    .map((row) => {
      const cells = columns.map((key) => `<td>${cell(row[key])}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <div class="gpv-table" style="--gpv-ink:${theme.text};--gpv-muted:${theme.muted};--gpv-line:${theme.grid};--gpv-accent:${theme.palette[0]}">
      ${header(title, subtitle)}
      <div class="gpv-table-scroll">
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </div>`;
}

export function renderSummaryView(config: Row, theme: ResolvedThemeTokens): string | null {
  const content = text(config.content ?? config.summary ?? config.markdown);
  if (!content.trim()) return null;
  const title = text(config.title);
  const subtitle = text(config.subtitle);
  return `
    <div class="gpv-summary" style="--gpv-ink:${theme.text};--gpv-muted:${theme.muted};--gpv-line:${theme.grid};--gpv-accent:${theme.palette[0]}">
      ${header(title, subtitle)}
      <div class="gpv-summary-body">${renderSummary(content)}</div>
    </div>`;
}

export function renderPending(message: string, hint?: string): string {
  return `<div class="gpv-status"><p>${escapeHtml(message)}</p>${hint ? `<span>${escapeHtml(hint)}</span>` : ''}</div>`;
}

export function renderUnsupported(type: string): string {
  const label = type.trim() || '未知';
  return `
    <div class="gpv-status gpv-status-error">
      <p>不支持 ${escapeHtml(label)} 图</p>
      <span>可用的类型见 chart-visualization skill，或改用 line、column、table。</span>
    </div>`;
}

function header(title: string, subtitle: string): string {
  if (!title && !subtitle) return '';
  return `<header class="gpv-markup-head">${title ? `<h3>${escapeHtml(title)}</h3>` : ''}${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}</header>`;
}

function cell(value: unknown): string {
  if (value == null || value === '') return '<span class="gpv-empty">—</span>';
  if (typeof value === 'object') {
    try {
      return escapeHtml(JSON.stringify(value));
    } catch {
      return '—';
    }
  }
  return escapeHtml(text(value));
}
