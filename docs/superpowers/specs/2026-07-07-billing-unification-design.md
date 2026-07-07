# 报账系统统一改造 — 设计方案

> 📅 2026-07-07 | 🎯 四种角色共用一套报账系统

---

## 一、目标

将当前分散在 BillingPage（管理/店长）、CompanionPage 钱包区（陪玩）的报账功能，统一为一个页面 `/billing`。四种角色看到相同的数据、相同的 UI，仅操作按钮根据角色权限不同。

### 当前问题

| 问题 | 说明 |
|------|------|
| CS 无入口 | CS 角色完全看不到任何报账数据 |
| 数据分散 | 陪玩钱包在 CompanionPage，审批在 BillingPage，无关联 |
| 不同步 | 管理员审批后陪玩端不自动刷新 |
| 命名混乱 | Transaction / ExpenseReport / WalletTransaction 三套模型并存 |

---

## 二、统一数据模型

### 2.1 6 个统计字段（所有角色相同）

| 字段 | 计算方式 | 来源 |
|------|---------|------|
| **今日流水** | 今天 DONE 订单金额合计 | `Order WHERE companionId=X AND status='DONE' AND createdAt=today` |
| **总流水** | 全部 DONE 订单金额合计 | `Order WHERE companionId=X AND status='DONE'` |
| **已支取流水** | 已审批通过的支取金额 | `WalletTransaction WHERE type='WITHDRAW' AND status='APPROVED' SUM(amount)` |
| **支取审核中** | 已提交但未审批的支取 | `WalletTransaction WHERE type='WITHDRAW' AND status='PENDING' SUM(amount)` |
| **待支取流水** | 可分账金额 - 已支取 - 审核中 | `totalRevenue × splitRatio - 已支取 - 审核中` |
| **押金** | 陪玩缴纳押金 | `Companion.deposit` |

### 2.2 管理/店长看所有陪玩汇总，陪玩只看自己

- OWNER/ADMIN/CS(授权)：默认显示工作室所有陪玩的汇总数据，可下拉筛选单个陪玩
- COMPANION：只显示自己的数据

---

## 三、统一 UI 布局

```
┌─────────────────────────────────────────────────────────┐
│  📊 报账系统                              [选择陪玩▾] [月份▾] │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  │ 今日流水  │  总流水   │ 已支取   │ 审核中    │ 待支取   │  押金    │
│  │ ¥300     │ ¥5,000   │ ¥2,000   │ ¥500     │ ¥500     │ ¥500    │
│  └──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
├─────────────────────────────────────────────────────────┤
│  支取记录                                               │
│  ┌─────────────────────────────────────────────────────┐│
│  │ 类型 │ 金额 │ 状态  │ 时间  │ 备注    │ 操作       ││
│  │ 支取 │ 2000 │ 已通过 │ 07-01 │         │            ││
│  │ 支取 │ 500  │ 待审核 │ 07-07 │         │ [通过][驳回]││  ← 仅 OWNER/ADMIN
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│  [申请支取]                              [全选] [批量通过] [批量驳回] │
│   ↑ 仅 COMPANION                    ↑ 仅 OWNER/ADMIN            │
└─────────────────────────────────────────────────────────┘
```

### 角色按钮权限

| 按钮 | OWNER | ADMIN | CS(授权) | COMPANION |
|------|:--:|:--:|:--:|:--:|
| 查看 6 卡片 | ✅ | ✅ | ✅ | ✅ |
| 查看支取记录 | ✅ | ✅ | ✅ | ✅ |
| 切换陪玩下拉 | ✅ | ✅ | ✅ | -- |
| 月份筛选 | ✅ | ✅ | ✅ | ✅ |
| 申请支取 | -- | -- | -- | ✅ |
| 单条审批(通过/驳回) | ✅ | ✅ | -- | -- |
| 批量审批 | ✅ | ✅ | -- | -- |
| 执行月结算 | ✅ | ✅ | -- | -- |

---

## 四、后端 API

### 新增：`GET /billing/overview`

```json
{
  "companionId": "xxx",
  "month": "2026-07",
  "todayRevenue": 300,
  "totalRevenue": 5000,
  "totalWithdrawn": 2000,
  "pendingWithdraw": 500,
  "withdrawablePending": 500,
  "deposit": 500,
  "records": [
    {
      "id": "wt1",
      "type": "WITHDRAW",
      "amount": 2000,
      "status": "APPROVED",
      "createdAt": "...",
      "note": "..."
    }
  ]
}
```

### 复用现有 API

| 端点 | 用途 |
|------|------|
| `POST /companions/me/withdraw` | 陪玩申请支取（已有） |
| `PUT /wallet-transactions/:id/review` | 管理员审批支取（已有） |
| `POST /monthly-settlement` | 执行月结算（已有） |

---

## 五、数据同步

| 机制 | 触发 | 延迟 |
|------|------|------|
| **WebSocket 推送** | 任何端修改数据后 → `billing:updated` 广播到 studio → 所有端刷新 | < 1s |
| **30s 定时轮询** | 前端 `setInterval` 兜底 | ≤ 30s |
| **focus/visible 刷新** | 切回标签页时 | 即时 |

---

## 六、CS 权限控制

- `SystemConfig` 新增 key: `billing.cs_access` (boolean, 默认 false)
- OWNER/ADMIN 在设置页开启后，CS 角色可以访问 `/billing` 页面（只读）
- 后端 `RolesGuard` 检查该配置

---

## 七、文件清单

| 文件 | 改动 |
|------|------|
| **新建** `apps/web/src/pages/BillingOverview.tsx` | 统一报账页面（6卡片 + 支取记录表 + 月份筛选） |
| **删除/合并** `apps/web/src/pages/BillingPage.tsx` | 原报账页面功能合并进新页面 |
| **修改** `apps/web/src/pages/CompanionPage.tsx` | 钱包区改为链接跳转到 `/billing` |
| **修改** `apps/web/src/router.tsx` | 统一路由 `/billing`，所有角色可访问 |
| **修改** `apps/web/src/layouts/AppLayout.tsx` | 所有角色菜单加「报账系统」 |
| **新增** `apps/server/src/billing/billing.controller.ts` | `GET /billing/overview` 端点 |
| **修改** `apps/server/src/billing/billing.service.ts` | `getOverview()` 方法 |
| **修改** `apps/server/src/ws/ws.gateway.ts` | 审批/结算后广播 `billing:updated` |

---

## 八、验证

1. OWNER 登录 → `/billing` → 看到工作室所有陪玩的 6 卡片汇总
2. 下拉选择 zhangsan → 切换为 zhangsan 的 6 卡片 + 支取记录
3. zhangsan 申请支取 ¥100 → OWNER 端自动刷新 → 审核中 +¥100
4. OWNER 审批通过 → zhangsan 端自动刷新 → 已支取 +¥100，待支取 -¥100
5. CS（未授权）→ 看不到报账菜单
6. OWNER 开设置授权 CS → CS 刷新 → 可以看到报账菜单和只读面板
7. 切换月份 → 卡片和数据切换到对应月份
