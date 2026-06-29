# Phase 2 — 全部缺失功能实施计划

> **For agentic workers:** Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 实现三角洲陪玩工作室管理系统需求文档V30.0中所有缺失功能（11模块）

**Architecture:** 按依赖关系分组实施：财务核心(钱包+结算) → 客户智能(画像+类型+跟进) → 绩效看板 → 服务结算增强 → 双陪协作 → AI分析 → 运营工具(流量池+离职+授权+微信)

**Tech Stack:** Nest.js + Prisma + PostgreSQL, React + Ant Design, @ant-design/charts

## Global Constraints
- API: `{ code, message, data }` 格式
- 权限: `@Roles()` + `RolesGuard`
- 前端: Ant Design Apple-inspired theme, `React.createElement` icon pattern
- 提交: Conventional Commits
- 文件上传: multer + 本地存储

---

## 实施顺序
```
M1(钱包Schema) → M2(钱包API+前端) → M3(月底结算) → M4(客户画像Schema) → M5(客户类型识别) 
→ M6(客户跟进) → M7(绩效看板) → M8(服务结算增强) → M9(双陪流程) → M10(AI分析) 
→ M11(流量池) → M12(离职处理) → M13(授权管理) → M14(工作微信)
```

---

### Task M1: Companion Wallet Schema

**Files:** Modify `apps/server/prisma/schema.prisma`

Add to Companion model:
```prisma
deposit       Float    @default(0)   // 押金
balance       Float    @default(0)   // 可支取余额
frozen        Float    @default(0)   // 冻结金额(存单未打)
```

Add new model:
```prisma
model WalletTransaction {
  id            String   @id @default(uuid())
  companionId   String
  type          String   // DEPOSIT | WITHDRAW | FREEZE | UNFREEZE | SETTLEMENT
  amount        Float
  balanceBefore Float
  balanceAfter  Float
  note          String?
  reviewedById  String?
  status        String   @default("PENDING") // PENDING | APPROVED | REJECTED
  createdAt     DateTime @default(now())

  companion Companion @relation(fields: [companionId], references: [id])
}
```

- [ ] Run `npx prisma migrate dev --name add_wallet_fields`
- [ ] Commit: `feat: add companion wallet fields and WalletTransaction model`

### Task M2: Wallet API + Frontend

**Backend — Modify `apps/server/src/companions/companions.service.ts`:**
Add methods:
- `getWallet(companionId)` → returns `{ deposit, balance, frozen, monthlyRevenue, shareTier, transactions[] }`
- `requestWithdraw(companionId, amount)` → validates amount ≤ balance, creates PENDING WalletTransaction
- `getWalletTransactions(companionId)` → lists all wallet transactions

Withdraw calculation: `可支取 = (当月累计业绩 × 支取预发比例%) - 已支取 - 存单未打预留`

**Backend — Modify `apps/server/src/companions/companions.controller.ts`:**
```typescript
@Get('me/wallet')
@Roles(UserRole.COMPANION)
async getWallet(@Req() req) { ... }

@Post('me/withdraw')
@Roles(UserRole.COMPANION)
async requestWithdraw(@Req() req, @Body() dto: { amount: number }) { ... }
```

**Backend — Modify `apps/server/src/billing/billing.controller.ts`:**
Add wallet transaction review endpoint:
```typescript
@Put('wallet-transactions/:id/review')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async reviewWalletTransaction(@Param('id') id, @Req() req, @Body() dto: { status: string }) { ... }
```

**Frontend — Add to `apps/web/src/api/companions.ts`:**
```typescript
wallet: () => http.get('/companions/me/wallet'),
requestWithdraw: (amount: number) => http.post('/companions/me/withdraw', { amount }),
```

**Frontend — Create wallet display in `apps/web/src/pages/CompanionPage.tsx`:**
Add wallet section with 4 stat cards (总账户/押金/可支取/冻结) + 申请支取 button + transaction history table.

- [ ] `cd apps/server && npx nest build`
- [ ] `cd apps/web && npx tsc --noEmit`
- [ ] Commit: `feat: add companion wallet with deposit, balance, withdraw workflow`

### Task M3: Monthly Settlement

**Backend — Add to `apps/server/src/billing/billing.service.ts`:**
```typescript
async monthlySettlement(studioId: string, month: string) {
  // For each companion: calculate monthly revenue, apply share tiers, compute studio/companion shares
  // Create WalletTransaction (SETTLEMENT) for each companion
  // Update companion.balance, companion.frozen
  // Return settlement summary
}
```

**Backend — Add to `apps/server/src/billing/billing.controller.ts`:**
```typescript
@Post('monthly-settlement')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async runMonthlySettlement(@Req() req, @Body() dto: { month: string }) { ... }

@Get('monthly-settlement')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async getMonthlySettlement(@Req() req, @Query('month') month?) { ... }
```

**Frontend — Add settlement section to `apps/web/src/pages/admin/BillingPage.tsx`:**
Settlement button + results table (companion/revenue/shareTier/studioShare/companionShare/status).

- [ ] Build verify + commit: `feat: add monthly settlement with share tier calculation`

### Task M4: Customer Profiles Schema + API

**Backend — Add to `apps/server/prisma/schema.prisma`:**
```prisma
model CustomerProfile {
  id                  String   @id @default(uuid())
  customerId          String   @unique
  age                 Int?
  address             String?
  occupation          String?
  preferredGame       String?
  preferredMode       String?
  preferredSingleDouble String? // 单 | 双
  preferredTime       String?
  playFrequency       String?
  pricePreference     String?
  relationshipStatus  String?  // 有女朋友 | 已婚 | 单身
  afraidWechatCheck   Boolean  @default(false)
  likedVoice          String?
  myVoice             String?
  likesTalkative      Boolean  @default(false)
  likesSkill          Boolean  @default(false)
  likesBoth           Boolean  @default(false)
  customNotes         String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  customer Customer @relation(fields: [customerId], references: [id])
}

model CustomerFollowUp {
  id          String   @id @default(uuid())
  customerId  String
  playerId    String?
  adminId     String?
  content     String
  nextAction  String?
  createdAt   DateTime @default(now())

  customer Customer @relation(fields: [customerId], references: [id])
}
```

**Backend — Create `apps/server/src/customers/profiles.service.ts`:**
CRUD for CustomerProfile + CustomerFollowUp.

**Backend — Add to `apps/server/src/customers/customers.controller.ts`:**
```typescript
@Get(':id/profile')
async getProfile(@Param('id') id) { ... }

@Put(':id/profile')
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.COMPANION)
async updateProfile(@Param('id') id, @Body() dto) { ... }

@Get(':id/follow-ups')
async getFollowUps(@Param('id') id) { ... }

@Post(':id/follow-ups')
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.COMPANION)
async addFollowUp(@Param('id') id, @Body() dto) { ... }
```

- [ ] Run migration + build + commit: `feat: add customer profiles and follow-up records`

### Task M5: Customer Type & Status Detection

**Backend — Add to `apps/server/src/customers/customers.service.ts`:**
```typescript
async detectCustomerType(customerId: string, wechatId: string): Promise<'FIRST' | 'RENEW' | 'REPURCHASE'> {
  const count = await this.prisma.order.count({
    where: { customerId, status: 'DONE' }
  });
  if (count === 0) return 'FIRST';
  // Check if this specific wechat has been used before
  const wechatOrders = await this.prisma.order.count({
    where: { customerId, status: 'DONE' }
  });
  return wechatOrders <= 1 ? 'FIRST' : 'REPURCHASE';
}

async updateCustomerStatus(customerId: string) {
  const lastOrder = await this.prisma.order.findFirst({
    where: { customerId, status: 'DONE' },
    orderBy: { createdAt: 'desc' }
  });
  const daysSinceLastOrder = lastOrder
    ? Math.floor((Date.now() - lastOrder.createdAt.getTime()) / 86400000)
    : Infinity;

  let status: string;
  if (!lastOrder) status = 'PENDING_DEVELOPMENT'; // 待开发
  else if (daysSinceLastOrder <= 7) status = 'ACTIVE';      // 活跃
  else if (daysSinceLastOrder <= 30) status = 'FOLLOW_UP';  // 待跟进
  else status = 'LOST';                                      // 流失

  await this.prisma.customer.update({ where: { id: customerId }, data: { 
    // Store status in notes or add a custom field
  }});
  return status;
}
```

Add `GET /api/customers/:id/type?wechatId=` endpoint.

**Frontend — Add to customer detail view:**
Status badge + type label + "添加跟进" button + profile edit form.

- [ ] Build + commit: `feat: add customer type detection and status auto-classification`

### Task M6: Customer Detail Page (with Profile + Follow-ups)

**Frontend — Create `apps/web/src/pages/CustomerDetailPage.tsx`:**
Full customer detail page with:
- Basic info section (code, name, wechat, platform)
- Profile section (20 fields, editable grid)
- AI analysis section (placeholder → M10 fills in)
- Service history table (orders)
- Follow-up records timeline
- Edit profile modal

**Router:** Add `admin/customers/:id` and `companion/customers/:id` routes.

- [ ] Build + commit: `feat: add customer detail page with profile and follow-ups`

### Task M7: Performance Dashboard

**Backend — Create `apps/server/src/dashboard/performance.service.ts` (or add to dashboard.service.ts):**

Core KPIs:
```typescript
// 接单率 = work duration / (work + idle) duration
// 续单率 = renew orders / total orders  
// 复购率 = repurchase customers / total served customers
// 首单占比 / 续单占比 / 复购占比
```

Methods:
- `getDailyPerformance(studioId, date)` — per-companion daily stats
- `getMonthlyPerformance(studioId, month)` — monthly aggregate
- `getCompanionDetail(companionId, month)` — single companion revenue breakdown

**Backend — Add to `apps/server/src/dashboard/dashboard.controller.ts`:**
```typescript
@Get('performance/daily')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async getDailyPerformance(@Req() req, @Query('date') date?) { ... }

@Get('performance/monthly')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async getMonthlyPerformance(@Req() req, @Query('month') month?) { ... }

@Get('performance/companion/:id')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async getCompanionPerformance(@Param('id') id, @Query('month') month?) { ... }
```

**Frontend — Create `apps/web/src/pages/admin/PerformancePage.tsx`:**
Tabs: 每日排行 / 全月排行 / 陪玩详情
- Ranking table with: rank, name, online time, work time, accept rate, renew rate, repurchase rate, daily/monthly revenue
- Revenue structure chart (first/renew/repurchase breakdown)
- Low performance alerts section

**Router:** Add `admin/performance` route.

- [ ] Build + commit: `feat: add performance dashboard with KPI rankings and revenue analysis`

### Task M8: Service Settlement Enhancement (首单/续单/复购)

**Backend — Modify `apps/server/src/orders/orders.service.ts`:**
Add `completeWithBilling(orderId, billingData)` method:
```typescript
interface BillingData {
  customerId: string;
  companionId: string;
  wechatId: string;
  firstOrder?: { duration: number; price: number };  // 首单(必填)
  hasRenew?: boolean;
  renewOrder?: { duration: number; price: number };    // 续单(可选)
  gameName: string;
  gameMode: string;
  type: 'COMPANION' | 'ESCORT';
  screenshotUrl?: string;
}
```

Logic:
1. Detect customer+wechat type (FIRST vs REPURCHASE)
2. If FIRST: create NEW order + optionally RENEW order
3. If REPURCHASE: create REPURCHASE order
4. Update customer totalSpent
5. Update companion monthlyRevenue

**Backend — Add to `apps/server/src/orders/orders.controller.ts`:**
```typescript
@Post(':id/complete-billing')
@Roles(UserRole.COMPANION)
async completeWithBilling(@Param('id') id, @Req() req, @Body() dto: BillingData) { ... }

@Get('customer-type/:customerId')
async getCustomerType(@Param('customerId') customerId, @Query('wechatId') wechatId) { ... }
```

**Frontend — Modify settlement flow in companion:**
When companion clicks "结束服务":
1. Input customer code → auto-detect type
2. If FIRST: show first-order form + "是否续单?" checkbox + renew form (conditional)
3. If REPURCHASE: show repurchase form
4. Show total calculation
5. Submit with screenshot

- [ ] Build + commit: `feat: add service settlement with first-order/renew/repurchase detection`

### Task M9: Dual Companion Flow

**Backend — Modify `apps/server/src/orders/orders.service.ts`:**
```typescript
async callPartner(orderId: string, companionId: string) {
  // Broadcast partner invitation via WebSocket to all ONLINE companions
  this.wsGateway.broadcastToStudio(studioId, 'order:partner_call', {
    orderId, callerId: companionId, order: {...}
  });
}

async acceptPartner(orderId: string, partnerId: string) {
  // Record partner, update order
  return this.prisma.order.update({
    where: { id: orderId },
    data: { customFields: { ...order.customFields, partnerId } }
  });
}
```

**Backend — Add WebSocket events to `apps/server/src/ws/ws.gateway.ts`:**
- `order:partner_call` — broadcast to studio
- `order:partner_accept` — notify caller
- `order:partner_reject` — notify caller

**Frontend — Modify PoolPage or add modal:**
- After grabbing a 双陪 order → show "呼叫搭档" dialog
- List available (ONLINE) companions with "邀请" buttons
- Partner receives invitation popup with order details + accept/reject
- On accept → both enter BUSY status, start service

**Frontend — Create partner invitation component:**
- Popup for partner: shows caller name, customer, game, price
- Accept → auto-fill partner info in service form
- Reject → notify caller

- [ ] Build + commit: `feat: add dual companion flow with partner call and invitation`

### Task M10: AI Customer Analysis + Script Generation

**Backend — Create `apps/server/src/ai/ai.module.ts` + `ai.service.ts` + `ai.controller.ts`:**

AI Service supports multiple providers:
```typescript
@Injectable()
export class AiService {
  async analyzeCustomer(customerId: string): Promise<CustomerAnalysis> {
    const profile = await this.prisma.customerProfile.findUnique({ where: { customerId } });
    const orders = await this.prisma.order.findMany({ where: { customerId, status: 'DONE' } });
    
    // Build prompt from profile + order data + custom notes
    // Call AI API (OpenAI compatible)
    // Parse response into structured analysis
    return {
      spendingPower: { rating, description },
      loyalty: { rating, description },
      activity: { level, description },
      personality: string,
      interests: string,
      bestContactTime: string,
      recommendedStyle: string,
      nextRecommendation: string,
      scripts: {
        booking: string,    // 约单话术
        deposit: string,    // 存单话术
        maintenance: string // 维护话术
      }
    };
  }
}
```

**Backend — SystemConfig for AI settings:**
```typescript
'ai.provider': 'openai',      // openai | qwen | deepseek | ernie
'ai.api_key': 'sk-...',
'ai.base_url': 'https://api.openai.com/v1',
'ai.model': 'gpt-4',
```

**Backend — Controller:**
```typescript
@Controller('ai')
export class AiController {
  @Post('analyze/:customerId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.COMPANION)
  async analyzeCustomer(@Param('customerId') id) { ... }

  @Post('regenerate-script/:customerId')
  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.COMPANION)
  async regenerateScript(@Param('customerId') id, @Body() dto: { type: string }) { ... }
}
```

**Frontend — Add to customer detail page:**
- AI Analysis card with: spending/loyalty/activity ratings, personality, interests
- Maintenance suggestions
- Script cards (约单/存单/维护) with copy/regenerate/thumbs up/down buttons
- Loading skeleton while AI generates

- [ ] Build + commit: `feat: add AI customer analysis with multi-model support and script generation`

### Task M11: Traffic Pool (流量池)

**Backend — Add to `apps/server/src/customers/customers.service.ts`:**
```typescript
async getTrafficPool(studioId: string, platform?: string) {
  const where: any = { studioId };
  if (platform) where.platform = platform;
  return this.prisma.customer.findMany({
    where,
    select: { id: true, customerCode: true, platform: true, platformAccount: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
}

async getChannelStats(studioId: string) {
  const customers = await this.prisma.customer.findMany({
    where: { studioId },
    select: { platform: true }
  });
  const stats: Record<string, number> = {};
  for (const c of customers) {
    stats[c.platform || '未知'] = (stats[c.platform || '未知'] || 0) + 1;
  }
  return stats;
}
```

**Frontend — Create `apps/web/src/pages/admin/TrafficPoolPage.tsx`:**
- Filter tabs: 全部/小红书/抖音/快手/转介绍
- Table: customer code, platform, platform ID, source account, add time
- Channel stats summary at top

**Router:** Add `admin/traffic` route.

- [ ] Build + commit: `feat: add traffic pool with channel tracking and stats`

### Task M12: Companion Resignation

**Backend — Add to `apps/server/src/companions/companions.service.ts`:**
```typescript
async resignCompanion(companionId: string) {
  // 1. Clear companion data (orders/transactions/balance)
  // 2. Release workstation (status = OFFLINE, billingCode freed)
  // 3. Release work wechat (if exists)
  // 4. Optionally preserve account record
  return this.prisma.companion.update({
    where: { id: companionId },
    data: {
      status: 'OFFLINE',
      balance: 0,
      deposit: 0,
      frozen: 0,
      monthlyRevenue: 0,
      billingCode: null, // free up
    }
  });
}
```

**Backend — Add to `apps/server/src/companions/companions.controller.ts`:**
```typescript
@Post(':id/resign')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async resignCompanion(@Param('id') id) { ... }
```

**Frontend — Add to companions management page:**
"离职处理" button with confirmation dialog showing what will be cleared.

- [ ] Build + commit: `feat: add companion resignation workflow`

### Task M13: Tenant Authorization Management

**Backend — New table via SystemConfig or dedicated model:**
```prisma
model TenantAuthorization {
  id         String   @id @default(uuid())
  studioId   String
  csUserId   String
  canViewPlayers    Boolean @default(false)
  canViewOrders     Boolean @default(false)
  canViewAlerts     Boolean @default(false)
  canHandleOrders   Boolean @default(false)
  canDispatchOrders Boolean @default(false)
  createdAt  DateTime @default(now())

  @@unique([studioId, csUserId])
}
```

**Backend — Create `apps/server/src/auth/authorization.service.ts` + controller:**
```typescript
@Get('tenant/authorizations')
@Roles(UserRole.ADMIN)
async getAuthorizations(@Req() req) { ... }

@Put('tenant/authorizations')
@Roles(UserRole.ADMIN)
async updateAuthorizations(@Req() req, @Body() dto) { ... }
```

**Frontend — Add to admin settings or new page:**
- Toggle for "平台客服访问权限"
- Checkbox list for authorization scope
- CS whitelist management

- [ ] Build + commit: `feat: add tenant authorization management for CS access control`

### Task M14: Work WeChat Management

**Backend — Add to schema:**
```prisma
model WorkWechat {
  id          String   @id @default(uuid())
  studioId    String
  wechatId    String   @unique
  companionId String?  @unique
  status      String   @default("AVAILABLE") // AVAILABLE | BOUND | BANNED
  createdAt   DateTime @default(now())
}
```

**Backend — Add to companions module:**
```typescript
@Get('work-wechats')
async listWorkWechats(@Req() req) { ... }

@Post('work-wechats')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async addWorkWechat(@Body() dto: { wechatId: string }) { ... }

@Put('work-wechats/:id/bind')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async bindWechat(@Param('id') id, @Body() dto: { companionId: string }) { ... }

@Put('work-wechats/:id/unbind')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async unbindWechat(@Param('id') id) { ... }
```

**Frontend — Add to companions management or settings:**
- Work wechat list with status (可用/已绑定/已封号)
- Bind/unbind to companion
- Auto-release on resignation

- [ ] Build + commit: `feat: add work wechat management with bind/unbind workflow`

---

### Task 99: Build Verification + Docs

- [ ] `pnpm build` — verify all packages compile
- [ ] Update CHANGELOG.md with all Phase 2 features
- [ ] Update ARCHITECTURE.md with new modules
- [ ] Commit: `docs: update documentation for Phase 2 complete features`

