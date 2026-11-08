import { describe, expect, it } from 'vitest';
import { buildView } from '../src/build';

function vchartSource(input: string): Record<string, unknown> {
  const view = buildView(input);
  expect(view.kind).toBe('vchart');
  if (view.kind !== 'vchart') throw new Error(view.message);
  return view.spec;
}

describe('native VChart specs', () => {
  it('grouped line and area charts use seriesField and band/linear axes', () => {
    const line = vchartSource(`vis line
title 销售
data
  - time 1月
    value 10
    group 华东
  - time 2月
    value 12
    group 华东
  - time 1月
    value 8
    group 华南
  - time 2月
    value 9
    group 华南
`);
    expect(line).toMatchObject({
      type: 'line',
      xField: 'time',
      yField: 'value',
      seriesField: 'group',
    });
    expect((line.axes as { type: string }[]).map((axis) => axis.type)).toEqual(['band', 'linear']);
    expect(line.line).toMatchObject({ style: { lineWidth: 2 } });

    const area = vchartSource(`vis area
stack true
data
  - time 1月
    value 10
    group 甲
  - time 1月
    value 4
    group 乙
`);
    expect(area).toMatchObject({ type: 'area', stack: true });
    expect(area.area).toMatchObject({ visible: true });
  });

  it('column and bar share VChart bar with the correct direction', () => {
    const column = vchartSource(`vis column
label false
data
  - category 甲
    value 3
  - category 乙
    value 7
`);
    expect(column).toMatchObject({ type: 'bar', direction: 'vertical' });
    expect(column.label).toMatchObject({ visible: false });

    const bar = vchartSource(`vis bar
data
  - category 甲
    value 3
  - category 乙
    value 7
`);
    expect(bar).toMatchObject({
      type: 'bar',
      direction: 'horizontal',
      xField: 'value',
      yField: 'category',
    });
    expect((bar.axes as { orient: string }[]).map((axis) => axis.orient)).toEqual(['bottom', 'left']);

    const grouped = vchartSource(`vis column
data
  - category 甲
    value 3
    group 新签
  - category 甲
    value 2
    group 续约
  - category 乙
    value 4
    group 新签
`);
    expect(grouped).toMatchObject({
      xField: ['category', 'group'],
      yField: 'value',
      stack: false,
      barGapInGroup: 4,
    });

    const groupedBar = vchartSource(`vis bar
data
  - category 甲
    value 3
    group 新签
  - category 甲
    value 2
    group 续约
`);
    expect(groupedBar).toMatchObject({
      xField: 'value',
      yField: ['category', 'group'],
      stack: false,
      barGapInGroup: 4,
    });

    const stacked = vchartSource(`vis column
stack true
data
  - category 甲
    value 3
    group 新签
  - category 甲
    value 2
    group 续约
`);
    expect(stacked).toMatchObject({ xField: 'category', yField: 'value', stack: true });
  });

  it('pie, scatter and radar map their category/value fields', () => {
    const pie = vchartSource(`vis pie
innerRadius 0.62
data
  - category 人力
    value 46
  - category 投放
    value 22
`);
    expect(pie).toMatchObject({
      type: 'pie',
      categoryField: 'category',
      valueField: 'value',
      innerRadius: 0.62,
      centerX: '50%',
      centerY: '50%',
      label: { position: 'outside', rotate: false },
    });

    const scatter = vchartSource(`vis scatter
data
  - x 1
    y 3
    group A
  - x 2
    y 4
    group A
`);
    expect(scatter).toMatchObject({ type: 'scatter', xField: 'x', yField: 'y', seriesField: 'group' });

    const radar = vchartSource(`vis radar
data
  - name 速度
    value 8
    group A
  - name 成本
    value 5
    group A
`);
    expect(radar).toMatchObject({
      type: 'radar',
      categoryField: 'name',
      valueField: 'value',
      seriesField: 'group',
      seriesMark: 'area',
    });
  });

  it('funnel and waterfall use VChart native series', () => {
    const funnel = vchartSource(`vis funnel
conversionRateLabel 转化率
data
  - category 访问
    value 200
  - category 下单
    value 50
`);
    expect(funnel).toMatchObject({
      type: 'funnel',
      categoryField: 'category',
      valueField: 'value',
      isTransform: true,
      transformRatioText: '转化率',
    });

    const waterfall = vchartSource(`vis waterfall
data
  - category 收入
    value 100
    isTotal true
  - category 成本
    value -30
  - category 利润
    isTotal true
`);
    expect(waterfall).toMatchObject({
      type: 'waterfall',
      xField: 'category',
      yField: 'value',
      legends: { visible: false },
      total: {
        type: 'field',
        tagField: 'isTotal',
        valueField: 'value',
      },
    });
    expect((waterfall.data as { values: { value: number | null }[] }[])[0].values.map((row) => row.value)).toEqual([
      100,
      -30,
      null,
    ]);
  });

  it('dual axes builds bound common-chart series', () => {
    const dual = vchartSource(`vis dual-axes
categories
  - 1月
  - 2月
series
  - type column
    axisYTitle 收入
    data
      - 128
      - 116
  - type line
    axisYTitle 订单
    data
      - 420
      - 388
`);
    expect(dual.type).toBe('common');
    expect((dual.series as { id: string; yField: string }[]).map((series) => series.yField)).toEqual(['value0', 'value1']);
    const right = (dual.axes as { orient: string; seriesId?: string }[]).find((axis) => axis.orient === 'right');
    expect(right?.seriesId).toBe('gpv-dual-1');
  });

  it('histogram pre-bins values', () => {
    const histogram = vchartSource(`vis histogram
binNumber 4
data
  - 1
  - 2
  - 2
  - 3
  - 4
`);
    expect(histogram).toMatchObject({ type: 'histogram', xField: 'binStart', x2Field: 'binEnd', yField: 'count' });
    const bins = (histogram.data as { values: { count: number }[] }[])[0].values;
    expect(bins).toHaveLength(4);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(5);
  });

  it('boxplot computes quartiles from raw observations', () => {
    const boxplot = vchartSource(`vis boxplot
data
  - category A
    value 1
  - category A
    value 2
  - category A
    value 3
  - category A
    value 4
  - category A
    value 5
`);
    const row = (boxplot.data as { values: Record<string, number>[] }[])[0].values[0];
    expect(boxplot).toMatchObject({ type: 'boxPlot', minField: 'min', maxField: 'max' });
    expect(row).toEqual({ category: 'A', min: 1, q1: 2, median: 3, q3: 4, max: 5 });
  });

  it('sankey, treemap, word cloud, liquid and venn use their native types', () => {
    const sankey = vchartSource(`vis sankey
data
  - source 搜索
    target 注册
    value 30
  - source 注册
    target 付费
    value 8
`);
    expect(sankey).toMatchObject({
      type: 'sankey',
      categoryField: 'name',
      sourceField: 'source',
      targetField: 'target',
      valueField: 'value',
      nodeKey: 'name',
    });
    const sankeyData = (sankey.data as { values: { nodes: { name: string }[]; links: { source: string; target: string }[] }[] }[])[0].values[0];
    expect(sankeyData.nodes.map((node) => node.name)).toEqual(['搜索', '注册', '付费']);
    expect(sankeyData.links).toEqual([
      { source: '搜索', target: '注册', value: 30 },
      { source: '注册', target: '付费', value: 8 },
    ]);

    const tree = vchartSource(`vis treemap
data
  - name 华东
    value 100
    children
      - name 江苏
        value 60
      - name 浙江
        value 40
`);
    expect(tree).toMatchObject({ type: 'treemap', categoryField: 'name', valueField: 'value' });

    const cloud = vchartSource(`vis word-cloud
data
  - text 增长
    value 40
  - text 成本
    value 12
`);
    expect(cloud).toMatchObject({ type: 'wordCloud', nameField: 'text', valueField: 'value' });

    const liquid = vchartSource('vis liquid\nshape pin\npercent 0.75');
    expect(liquid).toMatchObject({ type: 'liquid', maskShape: 'drop', valueField: 'value' });

    const venn = vchartSource(`vis venn
data
  - sets 甲, 乙
    value 3
  - sets 乙, 丙
    value 5
`);
    expect(venn).toMatchObject({ type: 'venn', categoryField: 'sets', valueField: 'value' });
  });
});

describe('HTML and pending views', () => {
  it('renders table, summary and liquid fallbacks without asking VChart', () => {
    const table = buildView(`vis table
data
  - 区域 华东
    收入 10
`);
    expect(table.kind).toBe('html');
    if (table.kind === 'html') expect(table.html).toContain('华东');

    const summary = buildView('收入达到 [174 万](metric_value)。');
    expect(summary.kind).toBe('html');
    if (summary.kind === 'html') expect(summary.html).toContain('gpv-chip');
  });

  it('waits for data and rejects unknown types without throwing', () => {
    expect(buildView('vis line\ntitle 还没有数据').kind).toBe('pending');
    expect(buildView('vis', { streaming: true }).kind).toBe('pending');
    expect(buildView('vis heat', { streaming: true }).kind).toBe('pending');
    const unknown = buildView('vis heatmap\ndata\n  - x 1\n    y 2');
    expect(unknown.kind).toBe('error');
    expect(unknown.message).toContain('heatmap');
  });

  it('does not split a series when group is turned off', () => {
    const spec = vchartSource(`vis column
group false
data
  - category 甲
    value 1
    group 东
  - category 乙
    value 2
    group 西
`);
    expect(spec.seriesField).toBeUndefined();
  });

  it('explains when a venn diagram exceeds three sets', () => {
    const view = buildView(`vis venn
data
  - sets 甲, 乙
    value 1
  - sets 丙, 丁
    value 1
`);
    expect(view.kind).toBe('error');
    expect(view.message).toContain('三个集合');
  });
});
