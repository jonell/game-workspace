# Phase 1 MVP — 三角洲陪玩工作室管理系统 设计文档

> 日期：2026-06-29 | 版本：v1.0 | 状态：Design Approved

## 概述

基于需求文档 V30.0「三角洲陪玩工作室管理系统」，在现有「蠢驴电竞陪玩派单管理系统」基础上，分阶段实现 MVP 核心闭环。

**Phase 1 目标：** 建立管理端数据感知 + 陪玩端抢单 + 财务报账的最小可用闭环。

**角色映射：**
- OWNER → 超级管理员（全部门店全部数据）
- ADMIN → 店长/租客（本门店全部数据）
- CS → 客服端（本门店订单 + 监控）
- COMPANION → 陪玩端（本人数据 + 操作）

---

## 模块 1：门店类型 + 数据看板

### 1.1 数据模型变更

**Studio 表新增字段：**
```prisma
model Studio {
  // 新增
  type     String   @default("DIRECT")  // DIRECT | RENTAL
  // ... 现有字段不变
}
```

**新增 StudioDailyStats 表（缓存聚合）：**
```prisma
model StudioDailyStats {
  id              String   @id @default(uuid())
  date            DateTime                     // 统计日期
  studioId        String
  totalRevenue    Float    @default(0)          // 当日总流水
  orderCount      Int      @default(0)          // 当日订单数
  onlineCompanions Int     @default(0)          // 在线陪玩数
  totalCompanions  Int     @default(0)          // 陪玩总数
  acceptRate      Float    @default(0)          // 全店接单率
  entertainmentFee Float   @default(0)          // 娱乐费收入
  createdAt       DateTime @default(now())

  @@unique([date, studioId])
}
```

### 1.2 API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard?studioId=` | 门店数据看板（今日概览 + 7日趋势 + 排行 + 异常预警）|
| GET | `/api/dashboard/companions?studioId=` | 在线陪玩状态列表 |
| GET | `/api/dashboard/trend?studioId=&days=7` | 近N天业绩趋势 |

**Dashboard 响应结构：**
```typescript
{
  today: { totalRevenue, orderCount, onlineCount, totalCount, acceptRate, entertainmentFee },
  trend: [{ date, revenue }],
  ranking: [{ rank, companionName, monthlyRevenue, acceptRate }],
  alerts: [{ companionName, type, message }]
}
```

### 1.3 前端

- **Owner/Admin 首页**（`/` `admin/*`）：展示数据看板（替换当前空白页）
- **组件树：** `DashboardPage → [StatCards, TrendChart, CompanionStatusTable, AlertPanel, RankingTable]`
- **使用 Ant Design Charts**（@ant-design/charts）渲染趋势图和排行

---

## 模块 2：陪玩工作台

### 2.1 数据模型

复用现有 `CompanionTimeLog` 表，聚合计算状态时长。

### 2.2 API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/companions/me/workbench` | 今日统计 + 状态时长 + 解锁进度 |
| PUT | `/api/companions/me/status` | 状态切换（ONLINE/IDLE/OFFLINE）|

**Workbench 响应结构：**
```typescript
{
  todayRevenue: number,
  unlockThreshold: number,      // 流水门槛（默认100元）
  isUnlocked: boolean,
  entertainmentMinutes: number,
  entertainmentFee: number,      // 暂扣娱乐费
  freeThreshold: number,         // 免单门槛（默认300元）
  statusDurations: { entertainment, idle, work, rest },
  onlineCompanions: [{ name, status, machineNo }]
}
```

### 2.3 前端

- **陪玩首页增强**（`/companion`）：今日统计卡片 + 解锁进度条 + 娱乐计时 + 状态切换按钮组 + 在线陪玩列表
- **关键交互：** 状态切换调用 Agent（WebSocket）通知客户端模式变更

---

## 模块 3：抢单池

### 3.1 数据模型

复用现有 `Order` 表，`dispatchType = POOL` 的订单进入抢单池。

### 3.2 核心逻辑

```
陪玩流水 ≥ 100元 → 抢单池解锁（可看见/可抢单）
陪玩流水 < 100元 → 抢单池灰色锁定（只显示"还差XX元解锁"）
```

### 3.3 API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/orders/pool?studioId=` | 获取抢单池（当前可抢订单列表）|
| POST | `/api/orders/:id/grab` | 抢单（校验：流水≥门槛、状态为PENDING、dispatchType为POOL）|
| GET | `/api/orders/pool/status` | 获取当前陪玩是否解锁抢单池 |

### 3.4 前端

- **抢单池页面**（`/companion/pool` 已存在，需改造）：
  - 流水不足 → 锁定状态 + 进度提示
  - 已解锁 → 订单卡片列表（来源/游戏/模式/备注/保护倒计时）+ 抢单按钮
- **抢单成功 →** 显示客户联系方式弹窗

---

## 模块 4：报账财务

### 4.1 数据模型 — 新增 ExpenseReport 表

```prisma
model ExpenseReport {
  id              String   @id @default(uuid())
  companionId     String
  studioId        String
  type            String                       // EXPENSE（报账）| WITHDRAW（支取）
  amount          Float
  screenshotUrl   String?                      // 转账截图
  description     String?
  status          String   @default("PENDING") // PENDING | APPROVED | REJECTED
  reviewedById    String?
  reviewedAt      DateTime?
  reviewNote      String?
  createdAt       DateTime @default(now())

  companion       Companion @relation(fields: [companionId], references: [id])
  studio          Studio    @relation(fields: [studioId], references: [id])
}
```

### 4.2 API

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/expenses` | 陪玩提交报账/支取申请 |
| GET | `/api/expenses?studioId=&status=` | 查询报账单列表（管理端）|
| GET | `/api/companions/me/expenses` | 查看本人报账记录 |
| PUT | `/api/expenses/:id/review` | 审核报账单（通过/驳回）|
| GET | `/api/expenses/monthly-summary?studioId=&month=` | 月度汇总 |

### 4.3 前端

- **陪玩端：** 报账表单（金额 + 截图上传 + 类型选择：报账/支取） + 历史记录列表
- **管理端：** 审核列表（状态筛选 + 通过/驳回操作） + 月度汇总

---

## 模块 5：系统配置

### 5.1 数据模型

复用现有 `SystemConfig` 表（key-value JSON 结构）。

### 5.2 配置项定义

| Key | 类型 | 默认值 | 说明 |
|-----|------|--------|------|
| `revenue.unlock_threshold` | number | 100 | 流水解锁门槛（元）|
| `revenue.free_threshold` | number | 300 | 娱乐费免单门槛（元）|
| `revenue.low_warning` | number | 300 | 低流水预警线（元）|
| `revenue.share_tiers` | JSON | `[{min:0,max:5999.9,studio:50,companion:50},...]` | 阶梯分成 |
| `withdraw.advance_ratio` | number | 50 | 支取预发比例（%）|
| `withdraw.default_deposit` | number | 500 | 默认押金（元）|
| `timeout.grace_minutes` | number | 10 | 超时宽容时间（分）|
| `timeout.rest_shutdown` | number | 60 | 休息超时关机（分）|
| `timeout.idle_shutdown` | number | 60 | 等单无操作关机（分）|
| `options.contact_results` | JSON | `["现在玩","改天玩","未回消息",...]` | 联系结果选项 |
| `options.finish_results` | JSON | `["正常完成","客户续单",...]` | 上钟结果选项 |
| `options.fail_reasons` | JSON | `["抢单未加微信","好友未通过",...]` | 失败原因选项 |
| `prompts.first_order` | JSON | `{line1:"",line2:""}` | 首单提示语 |
| `prompts.renew_order` | JSON | `{line1:"",line2:""}` | 续单提示语 |
| `prompts.repurchase` | JSON | `{line1:"",line2:""}` | 复购提示语 |

### 5.3 API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/config?keys=revenue.unlock_threshold,...` | 获取配置 |
| PUT | `/api/config` | 批量更新配置 |
| GET | `/api/config/all` | 获取全部配置 |

### 5.4 前端

- **Settings 页面增强**（`/admin/settings` 已存在）：
  - 分区表单：流水与价格 / 结算规则 / 支取与押金 / 超时设置 / 下拉选项 / 提示语配置
  - 保存按钮触发批量更新

---

## 实施顺序（推荐）

```
模块 5（系统配置）→ 模块 1（数据看板）→ 模块 2（陪玩工作台）→ 模块 3（抢单池）→ 模块 4（报账财务）
```

**理由：** 系统配置是最底层依赖（其他模块的规则都来自配置）；数据看板和订单独看面板排在前面让管理端可感知；陪玩工作台和抢单池提供陪玩端核心操作；报账财务作为闭环最后一步。

---

## 技术约束

- **后端：** Nest.js + Prisma + PostgreSQL，保持现有模块结构
- **前端：** React + Ant Design，Apple-inspired light theme
- **实时通信：** 抢单/状态同步通过 Socket.IO（已有 ws.gateway）
- **图表：** @ant-design/charts（Ant Design 官方图表库）
- **文件上传：** 报账截图使用 multer + 本地存储

---

## 不包含（Phase 2+）

- AI 客户分析 + 话术生成
- 客户画像（20+字段）
- 双陪搭档流程
- 流量池管理
- 工作微信管理
- 黑名单管理
- 陪玩离职流程
- 月底结算自动化
- 租客授权管理
- 客户跟进记录
