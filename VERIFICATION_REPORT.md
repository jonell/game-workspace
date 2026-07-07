# 需求 vs 代码核查报告

> 📅 2026-07-05 | 🔍 逐项代码验证 | 18 个 TASK

---

## 总览

| 状态 | 数量 | 说明 |
|:--:|:--:|------|
| ✅ 完成 | **5** | 状态改造核心 5 项 + 额外 1 项 |
| ⚠️ 部分 | **2** | 有代码但功能不完整 |
| ❌ 未完成 | **11** | 模块 1-6 完全未动 |

---

## ✅ 已完成（5+1）

| TASK | 内容 | 验证 |
|:--:|------|------|
| T14 | 枚举改造 | `enums.ts` L28-34：AVAILABLE/BUSY/ENTERTAINMENT/RESTING/OFFLINE |
| T15 | StatusBlacklist 表 | `schema.prisma` L418-428：`CompanionStatusBlacklist` 含 unique 约束 |
| T16 | 服务端状态替换 | `ws.gateway.ts` L79=AVAILABLE, L123=STATUS_COMPAT, controller L186=ENTERTAINMENT |
| T18 | 休息自动关机 | `resting-monitor.service.ts` 39行完整实现，controller L201-202 集成 |
| **额外** | ChatMessage 表 | `schema.prisma` L406-416：解决 UX-03 聊天持久化 |

---

## ⚠️ 部分完成（2）

### T07 娱乐模式门槛 — 后端已实现，前端未改

**已完成**：`companions.controller.ts` L186-198 检查 `entertainment.deposit_threshold` 和 `entertainment.revenue_threshold`，不满足返回 `{ blocked: true }`。

**未完成**：前端 `CompanionPage.tsx` 娱乐按钮未根据达标状态置灰，用户点击后才弹阻断 Modal（被动）。应改为按钮直接 disabled + Tooltip 显示差额。

**优化**：`CompanionPage.tsx` L157 的娱乐按钮增加条件：
```tsx
<Button disabled={!data.isEntertainmentUnlocked}
  onClick={() => switchStatus('ENTERTAINMENT')}>
  切换为娱乐中 {data.isEntertainmentUnlocked ? '' : `(还差¥${data.entertainmentGap})`}
</Button>
```

**验证**：流水不足时按钮灰显+提示金额 → 达标后自动启用

---

### T17 状态黑名单 CRUD API — 仅建表，无端点

**已完成**：`CompanionStatusBlacklist` 表已建。

**未完成**：无 `GET/POST/DELETE /companions/:id/status-blacklist` 端点，无前端配置页面。

**优化**：`companions.controller.ts` 新增 3 个端点；`companions.service.ts` 新增 `getStatusBlacklist`/`addStatusBlacklist`/`removeStatusBlacklist`。

**验证**：`POST /api/companions/{cid}/status-blacklist { status:'ENTERTAINMENT', processName:'bilibili.exe' }` → 入库 → 黑名单页面可查看每状态黑名单

---

## ❌ 未完成（11）

### T01 新增 ServiceType 枚举

**需求**：订单区分「陪玩（按小时）」「护航（固定价）」「做任务（按任务量）」三种服务类型。

**优化**：
- `enums.ts` 新增 `ServiceType { PLAY_WITH, ESCORT, DO_TASK }`
- `Order` 模型新增 `serviceType String @default("PLAY_WITH")`
- `CreateOrderModal` 增加服务类型选择

**验证**：创建订单 → 选"护航" → 订单卡片显示橙色"护航"Tag

---

### T02 新增游戏模式字段

**需求**：订单支持选择「机密」「绝密」等游戏模式。

**优化**：`SystemConfig` 预置 `game.modes` JSON；`CreateOrderModal` 增加游戏模式下拉。

**验证**：选游戏"三角洲行动" → 游戏模式下拉出现"机密/绝密"

---

### T03 新增考勤数据模型

**需求**：`CompanionAttendance` 表记录每日上班/下班/时长/迟到/早退。

**优化**：`schema.prisma` 新增表（含 `@@unique([companionId, date])`），执行 `db:migrate`。

**验证**：数据库出现 `CompanionAttendance` 表

---

### T04 考勤自动记录逻辑

**需求**：Agent 首次心跳=上班，最后断开=下班。

**优化**：`ws.gateway.ts` `handleConnection` 检查当日无记录 → 创建；`handleDisconnect` → 更新下班时间。

**验证**：陪玩 09:30 登录 → `loginAt=09:30, isLate=true`；18:00 断开 → `logoutAt=18:00, workMinutes=510`

---

### T05 考勤管理页面

**需求**：管理端查看陪玩考勤表。

**优化**：新建 `AttendancePage.tsx` + `GET /api/companions/attendance` API；路由 `/admin/attendance`。

**验证**：ADMIN 登录 → 考勤页 → 按日期筛选 → 迟到行红色高亮

---

### T06 开机引导弹窗

**需求**：Agent 登录后弹出引导"优先处理私域客户"。

**优化**：Electron `main.ts` 登录后发送 `ws:bootGuide` → `WorkbenchPage.tsx` 弹 Modal。

**验证**：登录 Electron → 弹出引导 → 点击"去客户管理"→ 跳转

---

### T08 无客户时的升级路径

**需求**：陪玩无客户时上传沟通截图 → 管理员审核 → 临时解锁订单池。

**优化**：`CompanionPage` 增加"申请解锁"按钮 → 上传截图 → 管理员审核通过 → 解锁。

**验证**：陪玩上传截图 → 管理员通过 → 陪玩可接订单池订单

---

### T09 CS 上传客户信息增强

**需求**：CreateOrderModal 增加 YY号/KOOK号/来源平台/来源账号等字段。

**优化**：`CreateOrderModal.tsx` 表单增加选填字段 → `Order.customFields` 扩展。

**验证**：CS 创建订单 → 填写微信号+来源"小红书"→ 订单池卡片显示 💬+📡

---

### T10 陪玩→客户管理闭环

**需求**：陪玩接单后客户自动归属；CRM 中维护跟进。

**优化**：`grab()`/`complete()` 自动赋值 `customer.companionId`；`CompanionPage` 增加"待跟进客户"区块。

**验证**：陪玩接单完成 → 客户自动归属 → 客户列表可见 → 可添加跟进

---

### T11 双陪订单辅助请求

**需求**：陪玩无客户时可请求参与双陪订单。

**优化**：WebSocket `order:dual-request` → 工作室广播 → 其他陪玩可响应邀请。

**验证**：陪玩A点"请求双陪"→ 陪玩B收到通知 → B邀请 → 自动创建双陪订单

---

### T12 Studio 分账模式配置

**需求**：线下=阶梯分成，线上=固定比例（80/20）。

**优化**：`Studio` 模型新增 `splitMode String @default("TIERED")`；`BillingService` 按模式结算。

**验证**：创建线上俱乐部 → 固定分账 → 月结算按 80/20

---

## 📊 汇总

| 模块 | TASK | 完成 |
|------|:--:|:--:|
| 1. 服务类型+游戏模式 | T01,T02 | 0/2 |
| 2. 考勤系统 | T03-T05 | 0/3 |
| 3. 开机流程管控 | T06-T08 | 0/3 |
| 4. 客户获取闭环 | T09,T10 | 0/2 |
| 5. 双陪订单升级 | T11 | 0/1 |
| 6. 分成差异化 | T12,T13 | 0/2 |
| 7. 6态改造 | T14-T18 | 4/5 |
| **合计** | **18** | **5 ✅ + 2 ⚠️ + 11 ❌** |

> 实施建议：先完成 2 个 ⚠️ 项（T07 前端 + T17 CRUD API），再按 Phase 1→2→3 顺序推进模块 1-6。
