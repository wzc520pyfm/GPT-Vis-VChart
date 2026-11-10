# GPTVis VChart

[![npm version](https://img.shields.io/npm/v/gptvis-vchart.svg)](https://www.npmjs.com/package/gptvis-vchart)
[![npm](https://img.shields.io/npm/v/gptvis-vchart/latest.svg?label=latest)](https://www.npmjs.com/package/gptvis-vchart)
[![npm downloads](https://img.shields.io/npm/dm/gptvis-vchart.svg)](https://www.npmjs.com/package/gptvis-vchart)

让 [GPT-Vis](https://github.com/antvis/GPT-Vis) 的 `vis` 语法直接驱动 [VisActor VChart](https://github.com/VisActor/VChart)。公开入口与 `@antv/gpt-vis` 对齐：`GPTVis`、`parse`、`isVisSyntax`，以及 26 个同名构造函数。模型继续写声明式语法，统计图由 VChart 原生绘制。

流式输出时，没写完的最后一行先不画，已经完整的部分照常出图。主题有默认、浅色、学院和深色，也可以传入 GPT-Vis 1.3 风格的 `ThemeSpec`。

## 安装

`@visactor/vchart` 是 peer dependency，应用需要和本包一起安装：

```bash
npm install gptvis-vchart @visactor/vchart
```

当前适配目标是 `@visactor/vchart@^2.2.1`。React 入口还需要 React 18+；主包和 `gptvis-vchart/syntax` 不需要 React。

## 快速开始

```ts
import { GPTVis } from 'gptvis-vchart';

const vis = new GPTVis({ container: '#chart', theme: 'academy' });

vis.render(`
vis column
title 各渠道签约额
axisXTitle 渠道
axisYTitle 万元
data
  - category 直销
    value 86
  - category 伙伴
    value 54
`);

vis.destroy();
```

流式生成时，每次把当前缓冲区交给同一个实例，并打开 `streaming`：

```ts
const vis = new GPTVis({
  container: '#chart',
  streaming: true,
});

for await (const chunk of stream) {
  buffer += chunk;
  if (buffer.trim().startsWith('vis ')) vis.render(buffer);
}
```

`render` 也接受已经解析好的对象或 JSON 字符串。不以 `vis ` 开头的普通正文按摘要排版。

## React

React 组件在独立入口中，主包不会加载 React：

```tsx
import { GPTVisChart } from 'gptvis-vchart/react';

<GPTVisChart
  content={buffer}
  theme="dark"
  streaming
  onStatus={(status) => console.log(status.state, status.message)}
/>
```

## Vue、Svelte 与普通 DOM

`bindGPTVis` 返回一个简单的、与框架无关的句柄：

```ts
import { bindGPTVis } from 'gptvis-vchart';

const chart = bindGPTVis(el.value, { theme: 'default' });
chart.update(syntax);
chart.resize();
chart.destroy();
```

## 服务端解析

只校验或解析模型输出时，从语法入口导入，避免加载 VChart：

```ts
import { isVisSyntax, parse, readConfig } from 'gptvis-vchart/syntax';

if (isVisSyntax(buffer)) {
  const config = parse(buffer);
  // readConfig 还接受 JSON 字符串和配置对象。
}
```

## 26 种图表

| 类型 | 渲染方式 |
| --- | --- |
| `line` `area` `column` `bar` `pie` `scatter` `radar` `funnel` `waterfall` `dual-axes` `histogram` `boxplot` `sankey` `treemap` `word-cloud` `liquid` `venn` | VChart 原生 spec |
| `network-graph` `flow-diagram` `mindmap` `indented-tree` `organization-chart` `fishbone-diagram` `violin` | 包内确定性 SVG 布局 |
| `table` `summary` | 安全 HTML |

网络图支持 `force`、`circular`、`grid`、`radial`、`concentric`、`dagre`。思维导图默认中心向两侧展开，可用 `direction LR` 或 `RL` 改成单向。流程图按依赖层级从左到右排列。

字段和选图规则见 [`skills/chart-visualization/SKILL.md`](skills/chart-visualization/SKILL.md)。

## 构造函数

只用一种图时，可以使用与 GPT-Vis 同名的构造函数。配置对象里不用再写 `type`：

```ts
import { Pie } from 'gptvis-vchart';

const pie = Pie({ container: '#chart', theme: 'academy' });
pie.render({
  data: [
    { category: '人力', value: 46 },
    { category: '投放', value: 22 },
  ],
  innerRadius: 0.6,
});
```

可用构造函数：`Line`、`Area`、`Column`、`Bar`、`Pie`、`Scatter`、`Radar`、`Funnel`、`Waterfall`、`DualAxes`、`Histogram`、`Boxplot`、`Violin`、`Venn`、`Sankey`、`Treemap`、`WordCloud`、`Liquid`、`FlowDiagram`、`NetworkGraph`、`Mindmap`、`IndentedTree`、`OrganizationChart`、`FishboneDiagram`、`Table`、`Summary`。

返回的实例都有 `render`、`resize`、`destroy`、`zoomTo` 和 `getZoom`。

## 主题

内置 `default`、`light`、`dark`、`academy`。也可以传入不依赖 GPT-Vis 的 `ThemeSpec`：

```ts
import type { ThemeSpec } from 'gptvis-vchart';

const brand: ThemeSpec = {
  id: 'brand',
  label: '品牌主题',
  baseTheme: 'light',
  tokens: {
    colorBackground: '#ffffff',
    colorText: '#1c1916',
    colorTextSecondary: '#6e675f',
    colorStroke: '#e6e0d6',
    category10: ['#0f6e6b', '#d4652f', '#2f5d9f'],
    colorSurface: '#1c1916',
    colorTextInverse: '#fbf9f6',
  },
};
```

`ThemeSpec.tokens` 映射到渲染 token：背景、正文、次级文字、网格、分类色板、提示框和语义色。`style.backgroundColor` 与 `style.palette` 会覆盖 token 展开结果。

## 外层工具条

默认关闭。打开后可以切换图表/代码、复制语法、下载图片，并缩放关系图：

```ts
const vis = new GPTVis({
  container: '#chart',
  wrapper: true,
  locale: 'zh-CN',
});

vis.zoomTo(1.2);
```

原生 VChart 图下载 PNG，SVG 回退图下载 SVG，表格和摘要下载带 HTML 的 SVG。

## 渲染与安全

- 模型不能提交任意 VChart spec、函数或 JavaScript，适配层只把白名单字段映射成 spec。
- HTML 与 SVG 中的所有模型文本都会转义。
- 颜色只接受安全 CSS 颜色字面量，拒绝 `url()`、`expression()`、CSS 变量和事件处理内容。
- 韦恩图限制为一到三个集合。
- 原生组件使用 `animation: false`，避免流式更新时反复播放动画。

## 开发

```bash
npm install
npm test
npm run build
npm run typecheck
```

仓库内演示页运行在 http://127.0.0.1:4320 。

## 许可

MIT。`vis` 文法的设计来自 [AntV GPT-Vis](https://github.com/antvis/GPT-Vis)；本仓库独立实现解析器、VChart spec 生成器和回退渲染器。
