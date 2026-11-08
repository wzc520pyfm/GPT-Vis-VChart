import { describe, expect, it } from 'vitest';
import * as api from '../src/index';

const CONSTRUCTORS = [
  'GPTVis',
  'bindGPTVis',
  'parse',
  'isVisSyntax',
  'Area',
  'Bar',
  'Boxplot',
  'Column',
  'DualAxes',
  'FishboneDiagram',
  'FlowDiagram',
  'Funnel',
  'Histogram',
  'IndentedTree',
  'Line',
  'Liquid',
  'Mindmap',
  'NetworkGraph',
  'OrganizationChart',
  'Pie',
  'Radar',
  'Sankey',
  'Scatter',
  'Summary',
  'Table',
  'Treemap',
  'Venn',
  'Violin',
  'Waterfall',
  'WordCloud',
];

describe('GPT-Vis VChart entry', () => {
  it('exports the same constructors and keeps React out of the main entry', () => {
    const surface = api as unknown as Record<string, unknown>;
    for (const name of CONSTRUCTORS) expect(typeof surface[name]).toBe('function');
    expect(api.CHARTS).toHaveLength(26);
    expect('GPTVisChart' in surface).toBe(false);
  });

  it('describes a view without touching the DOM', () => {
    expect(api.describeView('vis line\ntitle 趋势')).toBe('折线图：趋势');
    expect(api.describeView('vis unknown')).toContain('不支持');
  });

  it('keeps a summary status layer escaped', () => {
    expect(api.statusHtml('<script>x</script>')).not.toContain('<script');
  });
});
