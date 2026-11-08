export type Renderer = 'VChart' | 'SVG' | 'HTML';

export interface Example {
  id: string;
  label: string;
  type: string;
  renderer: Renderer;
  source: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'line',
    label: '月度销售',
    type: 'line',
    renderer: 'VChart',
    source: `vis line
title 2026 年上半年销售额
subtitle 按大区分组
axisXTitle 月份
axisYTitle 万元
data
  - time 1月
    value 128
    group 华东
  - time 2月
    value 116
    group 华东
  - time 3月
    value 143
    group 华东
  - time 4月
    value 151
    group 华东
  - time 5月
    value 162
    group 华东
  - time 6月
    value 174
    group 华东
  - time 1月
    value 96
    group 华南
  - time 2月
    value 101
    group 华南
  - time 3月
    value 110
    group 华南
  - time 4月
    value 108
    group 华南
  - time 5月
    value 121
    group 华南
  - time 6月
    value 133
    group 华南
`,
  },
  {
    id: 'area',
    label: '流量结构',
    type: 'area',
    renderer: 'VChart',
    source: `vis area
title 自然流量与付费流量
axisXTitle 周
axisYTitle 访问量
stack true
data
  - time W1
    value 42
    group 自然
  - time W2
    value 48
    group 自然
  - time W3
    value 45
    group 自然
  - time W4
    value 55
    group 自然
  - time W1
    value 18
    group 付费
  - time W2
    value 22
    group 付费
  - time W3
    value 25
    group 付费
  - time W4
    value 21
    group 付费
`,
  },
  {
    id: 'column',
    label: '渠道对比',
    type: 'column',
    renderer: 'VChart',
    source: `vis column
title 各渠道签约额
axisXTitle 渠道
axisYTitle 万元
data
  - category 直销
    value 86
    group 新签
  - category 直销
    value 42
    group 续约
  - category 伙伴
    value 54
    group 新签
  - category 伙伴
    value 37
    group 续约
  - category 电商
    value 29
    group 新签
  - category 电商
    value 18
    group 续约
`,
  },
  {
    id: 'bar',
    label: '地区排名',
    type: 'bar',
    renderer: 'VChart',
    source: `vis bar
title 区域收入排名
axisXTitle 万元
axisYTitle 区域
data
  - category 华东
    value 174
  - category 华南
    value 133
  - category 华北
    value 121
  - category 西南
    value 92
  - category 西北
    value 78
`,
  },
  {
    id: 'pie',
    label: '费用结构',
    type: 'pie',
    renderer: 'VChart',
    source: `vis pie
title 本季费用结构
subtitle 研发投入占比继续上升
innerRadius 0.62
data
  - category 人力
    value 46
  - category 投放
    value 22
  - category 云资源
    value 14
  - category 差旅
    value 8
  - category 其他
    value 10
`,
  },
  {
    id: 'scatter',
    label: '投入与转化',
    type: 'scatter',
    renderer: 'VChart',
    source: `vis scatter
title 投放金额与转化率
axisXTitle 投放金额（万元）
axisYTitle 转化率（%）
data
  - x 12
    y 2.8
    group 搜索
  - x 18
    y 3.2
    group 搜索
  - x 24
    y 3.7
    group 搜索
  - x 31
    y 4.1
    group 搜索
  - x 14
    y 2.1
    group 信息流
  - x 22
    y 2.6
    group 信息流
  - x 30
    y 2.9
    group 信息流
  - x 39
    y 3.4
    group 信息流
`,
  },
  {
    id: 'radar',
    label: '方案画像',
    type: 'radar',
    renderer: 'VChart',
    source: `vis radar
title 两个方案的能力画像
data
  - name 交付速度
    value 8
    group 方案 A
  - name 成本
    value 6
    group 方案 A
  - name 可扩展
    value 7
    group 方案 A
  - name 体验
    value 8
    group 方案 A
  - name 风险
    value 5
    group 方案 A
  - name 交付速度
    value 5
    group 方案 B
  - name 成本
    value 8
    group 方案 B
  - name 可扩展
    value 6
    group 方案 B
  - name 体验
    value 6
    group 方案 B
  - name 风险
    value 7
    group 方案 B
`,
  },
  {
    id: 'funnel',
    label: '转化漏斗',
    type: 'funnel',
    renderer: 'VChart',
    source: `vis funnel
title 官网线索转化
conversionRateLabel 相邻转化
data
  - category 访问
    value 18200
  - category 注册
    value 2460
  - category 试用
    value 980
  - category 商机
    value 310
  - category 成交
    value 86
`,
  },
  {
    id: 'waterfall',
    label: '利润桥',
    type: 'waterfall',
    renderer: 'VChart',
    source: `vis waterfall
title 从收入到经营利润
axisYTitle 万元
data
  - category 营业收入
    value 860
    isTotal true
  - category 履约成本
    value -310
  - category 销售费用
    value -96
  - category 研发费用
    value -140
  - category 其他收益
    value 28
  - category 经营利润
    isTotal true
`,
  },
  {
    id: 'dual-axes',
    label: '收入与订单',
    type: 'dual-axes',
    renderer: 'VChart',
    source: `vis dual-axes
title 收入与订单
axisXTitle 月份
categories
  - 1月
  - 2月
  - 3月
  - 4月
  - 5月
  - 6月
series
  - type column
    axisYTitle 收入（万元）
    data
      - 128
      - 116
      - 143
      - 151
      - 162
      - 174
  - type line
    axisYTitle 订单数
    data
      - 420
      - 388
      - 455
      - 470
      - 512
      - 540
`,
  },
  {
    id: 'histogram',
    label: '成绩分布',
    type: 'histogram',
    renderer: 'VChart',
    source: `vis histogram
title 期末成绩分布
axisXTitle 分数
axisYTitle 人数
binNumber 8
data
  - 55
  - 61
  - 63
  - 66
  - 68
  - 69
  - 71
  - 72
  - 74
  - 75
  - 76
  - 77
  - 78
  - 79
  - 80
  - 81
  - 82
  - 84
  - 85
  - 86
  - 87
  - 88
  - 89
  - 90
  - 91
  - 92
  - 94
  - 95
  - 96
  - 98
`,
  },
  {
    id: 'boxplot',
    label: '班级分布',
    type: 'boxplot',
    renderer: 'VChart',
    source: `vis boxplot
title 三个班级的成绩分布
axisYTitle 分数
data
  - category A 班
    value 58
  - category A 班
    value 66
  - category A 班
    value 72
  - category A 班
    value 78
  - category A 班
    value 81
  - category A 班
    value 88
  - category B 班
    value 64
  - category B 班
    value 70
  - category B 班
    value 75
  - category B 班
    value 79
  - category B 班
    value 84
  - category B 班
    value 91
  - category C 班
    value 52
  - category C 班
    value 61
  - category C 班
    value 67
  - category C 班
    value 73
  - category C 班
    value 77
  - category C 班
    value 82
`,
  },
  {
    id: 'violin',
    label: '小提琴分布',
    type: 'violin',
    renderer: 'SVG',
    source: `vis violin
title 每周使用时长分布
axisXTitle 用户群
axisYTitle 分钟
data
  - category 轻度
    value 8
  - category 轻度
    value 11
  - category 轻度
    value 13
  - category 轻度
    value 14
  - category 轻度
    value 16
  - category 轻度
    value 19
  - category 中度
    value 18
  - category 中度
    value 22
  - category 中度
    value 24
  - category 中度
    value 27
  - category 中度
    value 29
  - category 中度
    value 33
  - category 重度
    value 31
  - category 重度
    value 36
  - category 重度
    value 39
  - category 重度
    value 42
  - category 重度
    value 48
  - category 重度
    value 53
`,
  },
  {
    id: 'venn',
    label: '用户交集',
    type: 'venn',
    renderer: 'VChart',
    source: `vis venn
title 三类活跃用户的重叠
data
  - sets 内容
    value 42
    label 内容用户
  - sets 社交
    value 36
    label 社交用户
  - sets 消费
    value 28
    label 消费用户
  - sets 内容, 社交
    value 16
  - sets 内容, 消费
    value 11
  - sets 社交, 消费
    value 9
  - sets 内容, 社交, 消费
    value 6
`,
  },
  {
    id: 'sankey',
    label: '流量去向',
    type: 'sankey',
    renderer: 'VChart',
    source: `vis sankey
title 投放流量去向
nodeAlign justify
data
  - source 信息流
    target 落地页
    value 4200
  - source 搜索
    target 落地页
    value 2600
  - source 内容
    target 落地页
    value 1800
  - source 落地页
    target 注册
    value 3900
  - source 落地页
    target 离开
    value 4700
  - source 注册
    target 试用
    value 1400
  - source 注册
    target 沉默
    value 2500
`,
  },
  {
    id: 'treemap',
    label: '收入构成',
    type: 'treemap',
    renderer: 'VChart',
    source: `vis treemap
title 产品收入构成
data
  - name 订阅
    value 520
    children
      - name 企业版
        value 300
      - name 团队版
        value 140
      - name 个人版
        value 80
  - name 服务
    value 260
    children
      - name 实施
        value 120
      - name 培训
        value 70
      - name 定制开发
        value 70
  - name 生态
    value 120
    children
      - name 应用市场
        value 75
      - name API
        value 45
`,
  },
  {
    id: 'word-cloud',
    label: '反馈词云',
    type: 'word-cloud',
    renderer: 'VChart',
    source: `vis word-cloud
title 用户反馈高频词
data
  - text 效率
    value 58
  - text 稳定
    value 43
  - text 报表
    value 36
  - text 协作
    value 31
  - text 移动端
    value 26
  - text 上手快
    value 24
  - text 权限
    value 21
  - text 导出
    value 18
  - text 通知
    value 15
  - text 搜索
    value 14
  - text 模板
    value 12
  - text 自定义
    value 11
`,
  },
  {
    id: 'liquid',
    label: '目标进度',
    type: 'liquid',
    renderer: 'VChart',
    source: `vis liquid
title 季度签约目标
shape circle
percent 0.73
`,
  },
  {
    id: 'flow-diagram',
    label: '订单流程',
    type: 'flow-diagram',
    renderer: 'SVG',
    source: `vis flow-diagram
title 订单履约流程
data
  nodes
    - name 下单
    - name 风控
    - name 库存锁定
    - name 支付
    - name 发货
    - name 签收
  edges
    - source 下单
      target 风控
      name 校验
    - source 风控
      target 库存锁定
      name 通过
    - source 库存锁定
      target 支付
    - source 支付
      target 发货
      name 成功
    - source 发货
      target 签收
`,
  },
  {
    id: 'network-graph',
    label: '关系网络',
    type: 'network-graph',
    renderer: 'SVG',
    source: `vis network-graph
title 项目协作关系
layout force
data
  nodes
    - name 产品
    - name 设计
    - name 前端
    - name 后端
    - name 数据
    - name 测试
    - name 运维
  edges
    - source 产品
      target 设计
    - source 产品
      target 前端
    - source 产品
      target 后端
    - source 设计
      target 前端
    - source 后端
      target 数据
    - source 后端
      target 测试
    - source 前端
      target 测试
    - source 后端
      target 运维
`,
  },
  {
    id: 'mindmap',
    label: '问题拆解',
    type: 'mindmap',
    renderer: 'SVG',
    source: `vis mindmap
title 销售额异常怎么拆
data
  - name 销售额下滑
    children
      - name 量
        children
          - name 线索减少
          - name 转化变差
      - name 价
        children
          - name 折扣加深
          - name 产品结构
      - name 结构
        children
          - name 大客户流失
          - name 区域不均
`,
  },
  {
    id: 'indented-tree',
    label: '指标树',
    type: 'indented-tree',
    renderer: 'SVG',
    source: `vis indented-tree
title 北极星指标拆解
data
  name 活跃收入
  children
    - name 付费用户
      children
        - name 新客付费
        - name 老客续费
    - name 客单价
      children
        - name 产品结构
        - name 折扣控制
    - name 付费频次
`,
  },
  {
    id: 'organization-chart',
    label: '组织架构',
    type: 'organization-chart',
    renderer: 'SVG',
    source: `vis organization-chart
title 产品技术中心
data
  name 林然
  description 产品技术负责人
  children
    - name 周宁
      description 产品总监
      children
        - name 苏禾
          description 增长产品
        - name 顾言
          description 商业产品
    - name 陈一
      description 研发总监
      children
        - name 许墨
          description 前端团队
        - name 赵清
          description 后端团队
    - name 沈溪
      description 数据负责人
`,
  },
  {
    id: 'fishbone-diagram',
    label: '鱼骨分析',
    type: 'fishbone-diagram',
    renderer: 'SVG',
    source: `vis fishbone-diagram
title 交付延期原因
data
  - name 交付延期
    children
      - name 需求
        children
          - name 范围膨胀
          - name 验收模糊
      - name 研发
        children
          - name 联调阻塞
          - name 技术债
      - name 测试
        children
          - name 环境不稳
          - name 用例不足
      - name 协作
        children
          - name 信息断层
          - name 决策缓慢
`,
  },
  {
    id: 'table',
    label: '区域明细',
    type: 'table',
    renderer: 'HTML',
    source: `vis table
title 区域经营快照
data
  - 区域 华东
    收入 174
    订单 540
    毛利率 38%
  - 区域 华南
    收入 133
    订单 410
    毛利率 34%
  - 区域 华北
    收入 121
    订单 366
    毛利率 41%
  - 区域 西部
    收入 78
    订单 240
    毛利率 29%
`,
  },
  {
    id: 'summary',
    label: '经营摘要',
    type: 'summary',
    renderer: 'HTML',
    source: `# 6 月经营摘要

华东收入 [174 万](metric_value)，环比 [+7%](delta_value, assessment="positive")；华南 [133 万](metric_value)，基本持平。

- 直销新签是主要增量
- 电商续约低于预期
- 经营利润被研发费用吃掉一块，但合计仍为正
`,
  },
];
