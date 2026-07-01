# Spec: 陪玩端客户画像录入 + AI 分析全角色展示

## Context

陪玩服务客户后需要录入客户画像信息，数据汇总到客户管理模块，并基于现有 AI 规则引擎进行分析，结果对所有角色可见。现有基础设施已就绪（CustomerProfile 17字段、AI 端点、CustomerDetailPage），前端需接入。

## Requirements

| 项目 | 决策 |
|------|------|
| 录入场景 | 陪玩服务后填写画像（客户列表快捷按钮入口） |
| AI 分析 | 复用现有后端规则引擎 |
| 角色范围 | OWNER/ADMIN + COMPANION |

## Design

### 1. 陪玩端客户列表 (`CompanionCustomersPage`)

当前：只读表格，无操作。改为每行增加快捷操作按钮：

| 按钮 | 行为 |
|------|------|
| 📝 填写画像 | 弹出 Modal，CustomerProfile 编辑表单（17字段），调用 `customersApi.updateProfile()` |
| 📋 查看详情 | `navigate(/companion/customers/:id)` |
| 💰 消费记录 | 弹出 Modal，展示订单列表（日期、金额、类型、状态），调用 `customersApi.getOrders()` |

### 2. 客户详情页 AI 分析 (`CustomerDetailPage`)

替换 "AI 分析功能即将上线" 占位符为真实面板：
- 调用 `aiApi.analyzeCustomer(customerId)` 
- 展示：消费能力(1-5星)、忠诚度(1-5星)、活跃度(标签)、个性特征、跟进建议、沟通话术(3套)

### 3. 后端

无需改动。现有端点满足需求。

## Affected Files

| File | Operation |
|------|-----------|
| `apps/web/src/pages/companion/CustomersPage.tsx` | 重写：操作按钮 + 画像 Modal + 消费 Modal |
| `apps/web/src/pages/CustomerDetailPage.tsx` | AI 分析面板接入真实数据 |
