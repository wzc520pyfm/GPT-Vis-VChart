# GPT-Vis VChart

[![npm version](https://img.shields.io/npm/v/gptvis-vchart.svg)](https://www.npmjs.com/package/gptvis-vchart)
[![npm](https://img.shields.io/npm/v/gptvis-vchart/latest.svg?label=latest)](https://www.npmjs.com/package/gptvis-vchart)
[![npm downloads](https://img.shields.io/npm/dm/gptvis-vchart.svg)](https://www.npmjs.com/package/gptvis-vchart)

让 [GPT-Vis](https://github.com/antvis/GPT-Vis) 的 `vis` 语法直接驱动 [VisActor VChart](https://github.com/VisActor/VChart)。

```vis
vis line
title 月度销售额
axisXTitle 月份
axisYTitle 万元
data
  - time 1月
    value 128
    group 华东
  - time 2月
    value 116
    group 华东
```

模型继续输出与 GPT-Vis 相同的声明式语法，应用不再依赖 AntV。包提供与 GPT-Vis 对齐的 `GPTVis`、`parse`、`isVisSyntax` 和 26 个同名构造函数，核心图表由 VChart 原生渲染。

- `packages/gptvis-vchart`：可发布适配层，用法见 [README](packages/gptvis-vchart/README.md)。
- `playground`：可交互的语法编辑器和渲染演示。

## 安装

应用侧安装已发布的包，并一并安装 peer dependency `@visactor/vchart`（`^2.2.1`）：

```bash
npm install gptvis-vchart @visactor/vchart
```

React 入口还需要 React 18+；主包与 `gptvis-vchart/syntax` 不需要 React。完整用法见 [包 README](packages/gptvis-vchart/README.md)。

## 本地开发

```bash
npm install
npm run dev
npm test
npm run build
```

演示默认打开 http://127.0.0.1:4320 。

## 设计边界

- VChart 原生支持折线、面积、柱条、饼、散点、雷达、漏斗、瀑布、双轴、直方图、箱线、桑基、矩形树、词云、水波和韦恩。
- 网络图、流程图、思维导图、缩进树、组织架构和鱼骨图使用包内可预测的 SVG 布局；小提琴图同样使用 SVG 分布轮廓。
- 表格与摘要不需要图表引擎。
- 模型不能提交任意 VChart spec，也不能注入脚本、事件处理器或 URL 颜色。

## 许可

MIT。`vis` 文法来自 AntV GPT-Vis；本仓库独立实现解析器、VChart spec 生成器和回退渲染器。

