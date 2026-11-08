# Changelog

## 0.1.0

- 首次发布。对齐 GPT-Vis 1.3 的 `GPTVis`、`parse`、`isVisSyntax` 和 26 个同名构造函数。
- 折线、面积、柱条、饼、散点、雷达、漏斗、瀑布、双轴、直方图、箱线、桑基、矩形树、词云、水波和韦恩图生成原生 VChart spec。
- 网络图、流程图、思维导图、缩进树、组织架构、鱼骨图和小提琴图使用包内 SVG 布局。
- 提供 `default`、`light`、`dark`、`academy` 主题和 GPT-Vis `ThemeSpec` 兼容映射。
- 主入口不依赖 React，`./syntax` 可在服务端或 Worker 中解析而不加载 VChart。
- 流式输出会丢弃未完成的最后一行；所有模型文本在 HTML/SVG 中转义，颜色只接受安全字面量。
