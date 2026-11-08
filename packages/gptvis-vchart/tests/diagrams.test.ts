import { describe, expect, it } from 'vitest';
import { buildView } from '../src/build';

describe('SVG diagram fallbacks', () => {
  it('renders every relationship chart without VChart', () => {
    const examples = [
      `vis flow-diagram
data
  nodes
    - name 下单
    - name 支付
  edges
    - source 下单
      target 支付
`,
      `vis network-graph
layout circular
data
  nodes
    - name 甲
    - name 乙
  edges
    - source 甲
      target 乙
`,
      `vis mindmap
data
  - name 根
    children
      - name 甲
      - name 乙
`,
      `vis indented-tree
data
  name 公司
  children
    - name 设计
    - name 研发
`,
      `vis organization-chart
data
  name 总经理
  children
    - name 产品
    - name 研发
`,
      `vis fishbone-diagram
data
  - name 利润下降
    children
      - name 成本
        children
          - name 人力
      - name 收入
`,
    ];
    for (const source of examples) {
      const view = buildView(source);
      expect(view.kind).toBe('html');
      if (view.kind === 'html') {
        expect(view.html).toContain('<svg');
        expect(view.html).not.toContain('<script');
      }
    }
  });

  it('positions both sides of a mind map and mirrors an RL tree', () => {
    const both = buildView(
      `vis mindmap
data
  - name 根
    children
      - name 甲
      - name 乙
`,
      { width: 800, height: 480 },
    );
    expect(both.kind).toBe('html');
    if (both.kind === 'html') {
      expect(both.html).toContain('<path');
      expect(both.html.match(/<rect/g)?.length).toBeGreaterThanOrEqual(3);
    }

    const rightToLeft = buildView(`vis indented-tree
direction RL
data
  name 根
  children
    - name 子节点
`);
    expect(rightToLeft.kind).toBe('html');
    if (rightToLeft.kind === 'html') expect(rightToLeft.html).toContain('text-anchor="end"');
  });

  it('draws a violin distribution from repeated observations', () => {
    const view = buildView(`vis violin
title 分数分布
data
  - category A
    value 1
  - category A
    value 2
  - category A
    value 3
  - category B
    value 4
  - category B
    value 6
`);
    expect(view.kind).toBe('html');
    if (view.kind === 'html') {
      expect(view.html).toContain('gpv-violin-shape');
      expect(view.html).toContain('分数分布');
    }
  });

  it('handles force, grid, radial, concentric and dagre network layouts', () => {
    for (const layout of ['force', 'grid', 'radial', 'concentric', 'dagre']) {
      const view = buildView(`vis network-graph
layout ${layout}
data
  nodes
    - name A
    - name B
    - name C
  edges
    - source A
      target B
    - source B
      target C
`);
      expect(view.kind).toBe('html');
      if (view.kind === 'html') expect(view.html).toContain('<circle');
    }
  });
});
