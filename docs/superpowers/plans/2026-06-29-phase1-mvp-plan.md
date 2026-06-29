# Phase 1 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Phase 1 MVP 核心闭环 — 管理端数据看板 → 陪玩工作台 → 抢单池 → 报账财务

**Architecture:** 5 个模块按依赖顺序实施：系统配置（底层）→ 数据看板 → 陪玩工作台 → 抢单池（复用已有 pool/grab API）→ 报账财务。每个模块自包含后端（Prisma/Nest.js Service+Controller）和前端（React Page + API client）。

**Tech Stack:** Nest.js + Prisma + PostgreSQL, React + Ant Design + @ant-design/charts, Socket.IO

## Global Constraints

- 遵守现有 Nest.js 模块模式（module/service/controller/dto 分层）
- 前端使用 Ant Design Apple-inspired light theme
- API 返回格式：`{ code, message, data }` (ApiResponse)
- 文件上传使用 multer + 本地存储
- 权限使用 @Roles() 装饰器 + RolesGuard
- 遵循 Conventional Commits 格式提交

---


## File Structure

```
apps/server/
├── prisma/
│   └── schema.prisma                          # [MODIFY] Studio +type, +StudioDailyStats, +ExpenseReport
└── src/
    ├── app.module.ts                           # [MODIFY] +DashboardModule
    ├── auth/
    │   └── settings.controller.ts              # [MODIFY] enhance config GET/PUT
    ├── billing/
    │   ├── billing.module.ts                   # [MODIFY] +ExpenseReport endpoints
    │   ├── billing.service.ts                  # [MODIFY] +ExpenseReport CRUD, dashboard logic
    │   ├── billing.controller.ts               # [MODIFY] +expenseReport routes
    │   └── upload.controller.ts                # [no change] reuse screenshot upload
    ├── dashboard/
    │   ├── dashboard.module.ts                 # [CREATE]
    │   ├── dashboard.controller.ts             # [CREATE]
    │   └── dashboard.service.ts                # [CREATE]
    ├── companions/
    │   ├── companions.service.ts               # [MODIFY] +workbench, +todayStats
    │   └── companions.controller.ts            # [MODIFY] +workbench endpoint
    └── orders/
        ├── orders.service.ts                   # [MODIFY] +grab check (revenue threshold)
        └── orders.controller.ts                # [MODIFY] +pool/status endpoint

apps/web/src/
├── api/
│   ├── dashboard.ts                            # [CREATE]
│   ├── config.ts                               # [CREATE]
│   └── expenses.ts                             # [CREATE]
├── pages/
│   ├── admin/
│   │   ├── DashboardPage.tsx                   # [CREATE]
│   │   └── SettingsPage.tsx                    # [MODIFY] enhance with all config sections
│   ├── companion/
│   │   ├── PoolPage.tsx                        # [MODIFY] add revenue threshold lock
│   │   └── BillingPage.tsx                     # [MODIFY] add expense report form
│   └── CompanionPage.tsx                       # [MODIFY] enhance workbench
├── router.tsx                                  # [MODIFY] admin dashboard as index
└── layouts/
    └── AppLayout.tsx                           # [MODIFY] sidebar menu adjustments
```

---

## Module 5: 系统配置（基础层）

### Task 5.1: Prisma Schema — 扩展 SystemConfig 的使用模式

**Files:**
- Modify: `apps/server/prisma/schema.prisma` — 无需改 schema，SystemConfig 已存在且用 JSON value
- 说明：SystemConfig 表已支持 key-value JSON，直接使用即可

**Interfaces:**
- Produces: 配置可通过 `prisma.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } })` 读写

- [ ] **Step 1: 验证 SystemConfig 表可用**

```bash
cd apps/server && npx prisma db pull --print 2>&1 | grep -A5 SystemConfig
```

Expected: 确认 SystemConfig 表存在（key UNIQUE, value JSON）

- [ ] **Step 2: Commit baseline**

```bash
# No changes to commit — SystemConfig already exists
echo "SystemConfig already present — no schema changes needed"
```

### Task 5.2: Backend — 扩展配置 API

**Files:**
- Modify: `apps/server/src/auth/settings.controller.ts`
- Modify: `apps/server/src/auth/auth.module.ts` — 无需改，SettingsController 已在 AuthModule

**Interfaces:**
- Consumes: `PrismaService` (from PrismaModule, global)
- Produces: `GET /api/config?keys=a,b,c` → `{ code, data: {[key]: value} }`, `PUT /api/config` → 批量 upsert

- [ ] **Step 1: 重写 settings.controller.ts 支持多配置项**

Replace `apps/server/src/auth/settings.controller.ts`:

```typescript
import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard, Roles } from './roles.guard';
import { UserRole } from '@chunlv/shared';
import type { ApiResponse } from '@chunlv/shared';

const DEFAULT_CONFIGS: Record<string, any> = {
  'revenue.unlock_threshold': 100,
  'revenue.free_threshold': 300,
  'revenue.low_warning': 300,
  'revenue.share_tiers': [
    { min: 0, max: 5999.9, studio: 50, companion: 50 },
    { min: 6000, max: 9999, studio: 40, companion: 60 },
    { min: 10000, max: null, studio: 30, companion: 70 },
  ],
  'withdraw.advance_ratio': 50,
  'withdraw.default_deposit': 500,
  'timeout.grace_minutes': 10,
  'timeout.rest_shutdown': 60,
  'timeout.idle_shutdown': 60,
  'entertainment.idle_shutdown': 60,
  'entertainment.shutdown_countdown': 30,
  'options.contact_results': ['现在玩', '改天玩', '未回消息', '好友未通过', '被客户删除'],
  'options.finish_results': ['正常完成', '客户续单', '变声器退款', '技术差退款'],
  'options.fail_reasons': ['抢单未加微信', '好友未通过', '客户不回消息', '客户删除', '客户说不打', '其他'],
  'games': ['英雄联盟', '王者荣耀', '无畏契约', 'CS2', 'DOTA2', '永劫无间', '绝地求生', 'Apex英雄'],
  'ranks': ['青铜', '白银', '黄金', '铂金', '钻石', '大师', '宗师', '王者'],
};

@Controller()
export class SettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('settings')
  async getSettings(): Promise<ApiResponse<unknown>> {
    return this.getConfig('games,ranks');
  }

  @Put('settings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async updateSettings(@Body() body: { games?: string[]; ranks?: string[] }): Promise<ApiResponse<unknown>> {
    await this.updateConfig(body);
    return { code: 200, message: '配置已更新', data: null };
  }

  // 通用配置 GET
  @Get('config')
  @UseGuards(AuthGuard('jwt'))
  async getConfig(@Query('keys') keysStr?: string): Promise<ApiResponse<unknown>> {
    const keys = keysStr ? keysStr.split(',').map(k => k.trim()) : Object.keys(DEFAULT_CONFIGS);
    const records = await this.prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });
    const result: Record<string, any> = {};
    for (const k of keys) {
      const record = records.find(r => r.key === k);
      result[k] = record?.value ?? (DEFAULT_CONFIGS[k] ?? null);
    }
    return { code: 200, message: 'ok', data: result };
  }

  // 通用配置 PUT（仅 ADMIN/OWNER）
  @Put('config')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async updateConfig(@Body() body: Record<string, any>): Promise<ApiResponse<unknown>> {
    const ops = Object.entries(body).map(([key, value]) =>
      this.prisma.systemConfig.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      }),
    );
    await Promise.all(ops);
    return { code: 200, message: 'ok', data: null };
  }
}
```

- [ ] **Step 2: 验证 API 可用**

```bash
# Start server and test
curl -s http://localhost:3001/api/config | head -c 200
```

Expected: 返回所有默认配置项

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/auth/settings.controller.ts
git commit -m "feat: enhance config API with multi-key GET/PUT endpoints"
```

### Task 5.3: Frontend — API client

**Files:**
- Create: `apps/web/src/api/config.ts`

- [ ] **Step 1: 创建 config API client**

```typescript
import http from './client';

export const configApi = {
  getAll: () => http.get('/config'),
  get: (keys: string[]) => http.get('/config', { params: { keys: keys.join(',') } }),
  update: (data: Record<string, any>) => http.put('/config', data),
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/api/config.ts
git commit -m "feat: add config API client"
```

### Task 5.4: Frontend — Settings 页面增强

**Files:**
- Modify: `apps/web/src/pages/admin/SettingsPage.tsx`

**Interfaces:**
- Consumes: `configApi` from `../../api/config`
- Produces: 分区表单页面（流水价格/结算规则/支取押金/超时设置/提示语配置/下拉选项）

- [ ] **Step 1: 重写 SettingsPage 为分区配置表单**

Replace `apps/web/src/pages/admin/SettingsPage.tsx` with a tabbed config form:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Input, Button, InputNumber, Space, Typography, message, Tabs, Table, Popconfirm, Tag, Row, Col } from 'antd';
import { PlusOutlined, ReloadOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import { configApi } from '../../api/config';

const { Text, Title } = Typography;

interface ShareTier {
  min: number; max: number | null; studio: number; companion: number;
}

const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newGame, setNewGame] = useState('');
  const [newRank, setNewRank] = useState('');
  const [newResult, setNewResult] = useState('');
  const [newFail, setNewFail] = useState('');
  const [newFinish, setNewFinish] = useState('');

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await configApi.getAll();
      setConfig(data.data ?? {});
    } catch { message.error('加载配置失败'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async (sectionData?: Record<string, any>) => {
    setSaving(true);
    try {
      await configApi.update(sectionData ?? config);
      message.success('配置已保存');
      if (sectionData) {
        setConfig(prev => ({ ...prev, ...sectionData }));
      }
    } catch { message.error('保存失败'); }
    finally { setSaving(false); }
  };

  const updateValue = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Helper for editable list config
  const ListEditor: React.FC<{ configKey: string; title: string; newVal: string; setNewVal: (v: string) => void }> =
    ({ configKey, title, newVal, setNewVal }) => {
      const items: string[] = config[configKey] ?? [];
      const add = () => {
        if (!newVal.trim()) return;
        if (items.includes(newVal.trim())) { message.warning('已存在'); return; }
        const updated = [...items, newVal.trim()];
        handleSave({ [configKey]: updated });
        setNewVal('');
      };
      const remove = (item: string) => {
        handleSave({ [configKey]: items.filter(i => i !== item) });
      };
      return (
        <Card title={title} size="small" style={{ marginBottom: 16 }}>
          <Space.Compact style={{ width: '100%', marginBottom: 12 }}>
            <Input placeholder="输入内容" value={newVal} onChange={e => setNewVal(e.target.value)} onPressEnter={add} />
            <Button type="primary" icon={<PlusOutlined />} onClick={add}>添加</Button>
          </Space.Compact>
          <div>
            {items.map((item: string) => (
              <Tag closable key={item} onClose={() => remove(item)} style={{ marginBottom: 8, padding: '4px 10px' }}>
                {item}
              </Tag>
            ))}
            {items.length === 0 && <Text type="secondary">暂无</Text>}
          </div>
        </Card>
      );
    };

  // Share tiers editor
  const tiers: ShareTier[] = config['revenue.share_tiers'] ?? [];
  const updateTiers = (newTiers: ShareTier[]) => handleSave({ 'revenue.share_tiers': newTiers });

  const addTier = () => {
    const lastMax = tiers.length > 0 ? (tiers[tiers.length - 1].max ?? 0) : 0;
    updateTiers([...tiers, { min: lastMax + 0.1, max: null, studio: 50, companion: 50 }]);
  };

  const removeTier = (idx: number) => updateTiers(tiers.filter((_, i) => i !== idx));

  const updateTier = (idx: number, field: keyof ShareTier, val: number | null) => {
    const newTiers = tiers.map((t, i) => i === idx ? { ...t, [field]: val } : t);
    updateTiers(newTiers);
  };

  const tabItems = [
    {
      key: 'revenue',
      label: '💰 流水与价格',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Card size="small" title="流水门槛">
            <Row gutter={16}>
              <Col span={8}>
                <Text>流水解锁门槛（元）</Text>
                <InputNumber style={{ width: '100%' }} value={config['revenue.unlock_threshold']}
                  onChange={v => updateValue('revenue.unlock_threshold', v)} />
              </Col>
              <Col span={8}>
                <Text>娱乐费免单门槛（元）</Text>
                <InputNumber style={{ width: '100%' }} value={config['revenue.free_threshold']}
                  onChange={v => updateValue('revenue.free_threshold', v)} />
              </Col>
              <Col span={8}>
                <Text>低流水预警线（元）</Text>
                <InputNumber style={{ width: '100%' }} value={config['revenue.low_warning']}
                  onChange={v => updateValue('revenue.low_warning', v)} />
              </Col>
            </Row>
            <Button type="primary" style={{ marginTop: 16 }} onClick={() => handleSave({
              'revenue.unlock_threshold': config['revenue.unlock_threshold'],
              'revenue.free_threshold': config['revenue.free_threshold'],
              'revenue.low_warning': config['revenue.low_warning'],
            })}>💾 保存</Button>
          </Card>
        </Space>
      ),
    },
    {
      key: 'share',
      label: '📊 结算规则',
      children: (
        <Card size="small" title="阶梯分成">
          <Table dataSource={tiers.map((t, i) => ({ ...t, key: i }))} pagination={false} size="small"
            locale={{ emptyText: '暂无阶梯 — 点击下方添加' }}>
            <Table.Column title="业绩区间(起)" dataIndex="min" render={(v: number) => `¥${v.toLocaleString()}`} />
            <Table.Column title="业绩区间(止)" dataIndex="max"
              render={(v: number | null) => v ? `¥${v.toLocaleString()}` : '以上'} />
            <Table.Column title="工作室%" dataIndex="studio" render={(v: number) => `${v}%`} />
            <Table.Column title="陪玩%" dataIndex="companion" render={(v: number) => `${v}%`} />
            <Table.Column title="操作" render={(_: any, __: any, idx: number) => (
              <Popconfirm title="删除此区间？" onConfirm={() => removeTier(idx)}>
                <Button danger size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            )} />
          </Table>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addTier} style={{ marginTop: 12 }}>添加区间</Button>
        </Card>
      ),
    },
    {
      key: 'withdraw',
      label: '💸 支取与押金',
      children: (
        <Card size="small" title="支取规则">
          <Row gutter={16}>
            <Col span={12}>
              <Text>支取预发比例（%）</Text>
              <InputNumber style={{ width: '100%' }} value={config['withdraw.advance_ratio']} min={0} max={100}
                onChange={v => updateValue('withdraw.advance_ratio', v)} />
            </Col>
            <Col span={12}>
              <Text>默认押金金额（元）</Text>
              <InputNumber style={{ width: '100%' }} value={config['withdraw.default_deposit']} min={0}
                onChange={v => updateValue('withdraw.default_deposit', v)} />
            </Col>
          </Row>
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => handleSave({
            'withdraw.advance_ratio': config['withdraw.advance_ratio'],
            'withdraw.default_deposit': config['withdraw.default_deposit'],
          })}>💾 保存</Button>
        </Card>
      ),
    },
    {
      key: 'timeout',
      label: '⏰ 超时与关机',
      children: (
        <Card size="small" title="超时设置">
          <Row gutter={16}>
            <Col span={8}>
              <Text>超时宽容（分钟）</Text>
              <InputNumber style={{ width: '100%' }} value={config['timeout.grace_minutes']}
                onChange={v => updateValue('timeout.grace_minutes', v)} />
            </Col>
            <Col span={8}>
              <Text>休息超时关机（分钟）</Text>
              <InputNumber style={{ width: '100%' }} value={config['timeout.rest_shutdown']}
                onChange={v => updateValue('timeout.rest_shutdown', v)} />
            </Col>
            <Col span={8}>
              <Text>等单无操作关机（分钟）</Text>
              <InputNumber style={{ width: '100%' }} value={config['timeout.idle_shutdown']}
                onChange={v => updateValue('timeout.idle_shutdown', v)} />
            </Col>
          </Row>
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => handleSave({
            'timeout.grace_minutes': config['timeout.grace_minutes'],
            'timeout.rest_shutdown': config['timeout.rest_shutdown'],
            'timeout.idle_shutdown': config['timeout.idle_shutdown'],
          })}>💾 保存</Button>
        </Card>
      ),
    },
    {
      key: 'options',
      label: '📋 下拉选项',
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <ListEditor configKey="options.contact_results" title="联系结果选项" newVal={newResult} setNewVal={setNewResult} />
          </Col>
          <Col span={8}>
            <ListEditor configKey="options.finish_results" title="上钟结果选项" newVal={newFinish} setNewVal={setNewFinish} />
          </Col>
          <Col span={8}>
            <ListEditor configKey="options.fail_reasons" title="失败原因选项" newVal={newFail} setNewVal={setNewFail} />
          </Col>
        </Row>
      ),
    },
    {
      key: 'games',
      label: '🎮 游戏与段位',
      children: (
        <Row gutter={16}>
          <Col span={12}><ListEditor configKey="games" title="游戏列表" newVal={newGame} setNewVal={setNewGame} /></Col>
          <Col span={12}><ListEditor configKey="ranks" title="段位列表" newVal={newRank} setNewVal={setNewRank} /></Col>
        </Row>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Text strong style={{ fontSize: 18 }}>⚙️ 系统配置</Text>
          <br /><Text type="secondary">管理流水门槛、分成规则、下拉选项等全局配置</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchConfig} loading={loading}>刷新</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={() => handleSave()} loading={saving}>保存全部</Button>
        </Space>
      </div>
      <Tabs items={tabItems} />
    </div>
  );
};

export default SettingsPage;
```

- [ ] **Step 2: 验证前端编译**

```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: no TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/admin/SettingsPage.tsx
git commit -m "feat: enhance settings page with multi-tab config management"
```

---

## Module 1: 数据看板

### Task 1.1: Prisma Schema — Studio +type + StudioDailyStats

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

**Interfaces:**
- Produces: `Studio.type`, `StudioDailyStats` 模型

- [ ] **Step 1: 添加 Studio.type 和 StudioDailyStats 模型**

在 `apps/server/prisma/schema.prisma` 的 Studio 模型中，找到 `name String` 行后添加 `type`：

```
model Studio {
  id        String   @id @default(uuid())
  name      String
  type      String   @default("DIRECT")  // DIRECT | RENTAL
  ...
```

在文件末尾（model SystemConfig 之后）添加：

```prisma
model StudioDailyStats {
  id                String   @id @default(uuid())
  date              DateTime
  studioId          String
  totalRevenue      Float    @default(0)
  orderCount        Int      @default(0)
  onlineCompanions  Int      @default(0)
  totalCompanions   Int      @default(0)
  acceptRate        Float    @default(0)
  entertainmentFee  Float    @default(0)
  createdAt         DateTime @default(now())

  @@unique([date, studioId])
}
```

- [ ] **Step 2: 运行 migration**

```bash
cd apps/server && npx prisma migrate dev --name add_studio_type_and_daily_stats
```

Expected: Migration created successfully

- [ ] **Step 3: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat: add Studio.type and StudioDailyStats model"
```

### Task 1.2: Backend — Dashboard Service

**Files:**
- Create: `apps/server/src/dashboard/dashboard.service.ts`
- Create: `apps/server/src/dashboard/dashboard.module.ts`
- Create: `apps/server/src/dashboard/dashboard.controller.ts`
- Modify: `apps/server/src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService` (global)
- Produces: `DashboardService` with `getDashboard(studioId)`, `getCompanionStatus(studioId)`, `getTrend(studioId, days)`

- [ ] **Step 1: 创建 dashboard.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(studioId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's completed orders
    const todayOrders = await this.prisma.order.findMany({
      where: {
        studioId,
        status: 'DONE',
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    const totalRevenue = todayOrders.reduce((s, o) => s + o.amount, 0);
    const orderCount = todayOrders.length;

    // Online/Total companions
    const allCompanions = await this.prisma.companion.findMany({
      where: { studioId },
      select: { id: true, status: true },
    });
    const onlineCompanions = allCompanions.filter(
      c => c.status === 'ONLINE' || c.status === 'BUSY',
    ).length;

    // Accept rate: companion with status BUSY / total online
    const busyCount = allCompanions.filter(c => c.status === 'BUSY').length;
    const acceptRate = onlineCompanions > 0
      ? Math.round((busyCount / onlineCompanions) * 100)
      : 0;

    // Entertainment fee from time logs
    const timeLogs = await this.prisma.companionTimeLog.findMany({
      where: {
        companion: { studioId },
        mode: 'ENTERTAINMENT',
        startedAt: { gte: today },
      },
    });
    const entertainmentMinutes = timeLogs.reduce(
      (s, t) => s + (t.durationSeconds || 0), 0,
    ) / 60;
    const entertainmentFee = Math.round(entertainmentMinutes); // ¥1/min

    // Ranking (monthly revenue)
    const ranking = await this.prisma.companion.findMany({
      where: { studioId, monthlyRevenue: { gt: 0 } },
      orderBy: { monthlyRevenue: 'desc' },
      take: 10,
      select: {
        id: true,
        monthlyRevenue: true,
        user: { select: { username: true } },
      },
    });

    // Alerts: companions with low revenue
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'revenue.low_warning' },
    });
    const lowThreshold = (config?.value as number) ?? 300;

    // Get today's revenue per companion from transactions
    const todayTransactions = await this.prisma.transaction.findMany({
      where: {
        companion: { studioId },
        createdAt: { gte: today, lt: tomorrow },
        status: 'APPROVED',
      },
      select: { companionId: true, amount: true },
    });
    const revMap = new Map<string, number>();
    for (const t of todayTransactions) {
      revMap.set(t.companionId, (revMap.get(t.companionId) || 0) + t.amount);
    }
    const alerts = allCompanions
      .filter(c => (revMap.get(c.id) || 0) < lowThreshold)
      .map(c => ({
        companionId: c.id,
        companionName: '',
        message: `今日流水低于¥${lowThreshold}预警线`,
      }));

    return {
      today: {
        totalRevenue,
        orderCount,
        onlineCount: onlineCompanions,
        totalCount: allCompanions.length,
        acceptRate,
        entertainmentFee,
      },
      ranking: ranking.map((r, i) => ({
        rank: i + 1,
        companionId: r.id,
        companionName: r.user?.username ?? '',
        monthlyRevenue: r.monthlyRevenue,
      })),
      alerts,
    };
  }

  async getTrend(studioId: string, days: number = 7) {
    const result: { date: string; revenue: number; orderCount: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const orders = await this.prisma.order.findMany({
        where: {
          studioId,
          status: 'DONE',
          createdAt: { gte: d, lt: next },
        },
      });
      result.push({
        date: d.toISOString().slice(0, 10),
        revenue: orders.reduce((s, o) => s + o.amount, 0),
        orderCount: orders.length,
      });
    }
    return result;
  }

  async getCompanionStatus(studioId: string) {
    return this.prisma.companion.findMany({
      where: { studioId },
      select: {
        id: true,
        status: true,
        monthlyRevenue: true,
        user: { select: { username: true } },
        pc: { select: { currentMode: true, lastHeartbeat: true } },
      },
    });
  }
}
```

- [ ] **Step 2: 创建 dashboard.controller.ts**

```typescript
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { DashboardService } from './dashboard.service';
import { UserRole } from '@chunlv/shared';
import type { ApiResponse } from '@chunlv/shared';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async getDashboard(@Req() req: any): Promise<ApiResponse<unknown>> {
    const studioId = req.user.studioId;
    const data = await this.dashboardService.getDashboard(studioId);
    return { code: 200, message: 'ok', data };
  }

  @Get('trend')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async getTrend(
    @Req() req: any,
    @Query('days') days?: string,
  ): Promise<ApiResponse<unknown>> {
    const data = await this.dashboardService.getTrend(
      req.user.studioId,
      days ? parseInt(days) : 7,
    );
    return { code: 200, message: 'ok', data };
  }

  @Get('companions')
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  async getCompanionStatus(@Req() req: any): Promise<ApiResponse<unknown>> {
    const data = await this.dashboardService.getCompanionStatus(req.user.studioId);
    return { code: 200, message: 'ok', data };
  }
}
```

- [ ] **Step 3: 创建 dashboard.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
```

- [ ] **Step 4: 注册到 app.module.ts**

在 `apps/server/src/app.module.ts` 中：
- Import 行添加: `import { DashboardModule } from './dashboard/dashboard.module';`
- `imports` 数组添加: `DashboardModule,`

- [ ] **Step 5: 验证编译**

```bash
cd apps/server && npx nest build 2>&1 | tail -5
```

Expected: Build successful

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/dashboard/ apps/server/src/app.module.ts
git commit -m "feat: add dashboard module with trend and companion status endpoints"
```

### Task 1.3: Frontend — Dashboard API + Page

**Files:**
- Create: `apps/web/src/api/dashboard.ts`
- Create: `apps/web/src/pages/admin/DashboardPage.tsx`
- Modify: `apps/web/src/router.tsx`
- Modify: `apps/web/src/layouts/AppLayout.tsx`

- [ ] **Step 1: 创建 dashboard API client**

```typescript
import http from './client';

export const dashboardApi = {
  get: (studioId?: string) => http.get('/dashboard', { params: studioId ? { studioId } : {} }),
  trend: (days?: number) => http.get('/dashboard/trend', { params: { days } }),
  companions: () => http.get('/dashboard/companions'),
};
```

- [ ] **Step 2: 创建 DashboardPage 组件**

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Table, Tag, Typography, Spin, Alert, Space } from 'antd';
import { RiseOutlined, FallOutlined, TeamOutlined, DollarOutlined } from '@ant-design/icons';
import { dashboardApi } from '../../api/dashboard';
import { useAuthStore } from '../../stores/authStore';
import { Column } from '@ant-design/charts';

const { Text, Title } = Typography;

const StatCard: React.FC<{
  title: string; value: string | number; icon: React.ReactNode; color: string;
}> = ({ title, value, icon, color }) => (
  <Card size="small" style={{ borderTop: `3px solid ${color}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <Text type="secondary" style={{ fontSize: 13 }}>{title}</Text>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
      </div>
      <div style={{ fontSize: 32, color, opacity: 0.3 }}>{icon}</div>
    </div>
  </Card>
);

const DashboardPage: React.FC = () => {
  const user = useAuthStore(s => s.user);
  const [data, setData] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [companions, setCompanions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, trendRes, compRes] = await Promise.all([
        dashboardApi.get(),
        dashboardApi.trend(7),
        dashboardApi.companions(),
      ]);
      setData(dashRes.data.data);
      setTrend(trendRes.data.data ?? []);
      setCompanions(compRes.data.data ?? []);
    } catch (e) {
      console.error('Dashboard fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const today = data?.today ?? {};
  const ranking = data?.ranking ?? [];
  const alerts = data?.alerts ?? [];

  const statusColor: Record<string, string> = {
    ONLINE: 'green', BUSY: 'red', IDLE: 'orange', OFFLINE: 'default',
  };
  const statusLabel: Record<string, string> = {
    ONLINE: '🟢等单中', BUSY: '🔴接单中', IDLE: '⚪娱乐中', OFFLINE: '⚫离线',
  };

  const trendConfig = {
    data: trend,
    xField: 'date',
    yField: 'revenue',
    label: { style: { fontSize: 10 } },
    color: '#1677ff',
    columnStyle: { radius: [4, 4, 0, 0] },
    meta: { revenue: { alias: '流水（元）' } },
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>📊 数据看板</Title>
          {user?.username && <Text type="secondary">店长：{user.username}</Text>}
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={4}>
          <StatCard title="今日总流水" value={`¥${today.totalRevenue?.toLocaleString() ?? 0}`}
            icon={<DollarOutlined />} color="#1677ff" />
        </Col>
        <Col span={4}>
          <StatCard title="今日订单" value={`${today.orderCount ?? 0}单`}
            icon={<RiseOutlined />} color="#52c41a" />
        </Col>
        <Col span={4}>
          <StatCard title="在线陪玩" value={`${today.onlineCount ?? 0}/${today.totalCount ?? 0}人`}
            icon={<TeamOutlined />} color="#722ed1" />
        </Col>
        <Col span={4}>
          <StatCard title="全店接单率" value={`${today.acceptRate ?? 0}%`}
            icon={<RiseOutlined />} color="#fa8c16" />
        </Col>
        <Col span={4}>
          <StatCard title="娱乐费收入" value={`¥${today.entertainmentFee ?? 0}`}
            icon={<DollarOutlined />} color="#eb2f96" />
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={14}>
          <Card title="📈 近7天业绩趋势" size="small">
            <Column {...trendConfig} height={200} />
            <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
              <Text type="secondary">
                最高¥{Math.max(...trend.map((t: any) => t.revenue), 0).toLocaleString()}
              </Text>
              <Text type="secondary">
                最低¥{Math.min(...trend.map((t: any) => t.revenue), 0).toLocaleString()}
              </Text>
              <Text type="secondary">
                平均¥{Math.round(trend.reduce((s: number, t: any) => s + t.revenue, 0) / Math.max(trend.length, 1)).toLocaleString()}
              </Text>
            </div>
          </Card>
        </Col>
        <Col span={10}>
          <Card title="🏆 陪玩业绩排行" size="small">
            <Table dataSource={ranking} pagination={false} size="small" rowKey="companionId"
              locale={{ emptyText: '暂无数据' }}>
              <Table.Column title="排名" dataIndex="rank" width={50}
                render={(r: number) => r <= 3 ? ['🥇', '🥈', '🥉'][r - 1] : r} />
              <Table.Column title="陪玩" dataIndex="companionName" />
              <Table.Column title="本月流水" dataIndex="monthlyRevenue"
                render={(v: number) => `¥${v.toLocaleString()}`} />
            </Table>
          </Card>
        </Col>
      </Row>

      <Card title="👥 在线陪玩状态" size="small" style={{ marginTop: 16 }}>
        <Table dataSource={companions} pagination={false} size="small" rowKey="id"
          locale={{ emptyText: '暂无陪玩' }}>
          <Table.Column title="昵称" dataIndex={['user', 'username']} />
          <Table.Column title="状态" dataIndex="status"
            render={(s: string) => <Tag color={statusColor[s]}>{statusLabel[s] ?? s}</Tag>} />
          <Table.Column title="本月流水" dataIndex="monthlyRevenue"
            render={(v: number) => `¥${(v ?? 0).toLocaleString()}`} />
        </Table>
      </Card>

      {alerts.length > 0 && (
        <Card title="⚠️ 异常预警" size="small" style={{ marginTop: 16 }}>
          {alerts.map((a: any, i: number) => (
            <Alert key={i} message={a.message} type="warning" showIcon style={{ marginBottom: 8 }} />
          ))}
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;
```

- [ ] **Step 3: 更新路由 — admin 默认页改为 Dashboard**

在 `apps/web/src/router.tsx` 中将 admin routes 的第一个改为：

```tsx
import DashboardPage from './pages/admin/DashboardPage';

// In the admin routes section:
{
  path: 'admin',
  element: <DashboardPage />,  // was: <Navigate to="/login" replace />
},
{
  path: 'admin/dispatch',
  element: <AdminDispatchPage />,
},
// ... rest of admin routes unchanged
```

同时将原来的 `{ path: '', element: <Navigate to="/login" replace /> }` 移除（admin 已有默认路由）。

- [ ] **Step 4: 更新侧边栏菜单**

在 `apps/web/src/layouts/AppLayout.tsx` 中，为 ADMIN/OWNER 角色的侧边栏添加"数据看板"作为第一个菜单项（如果还没存在的话）。

查看现有 AppLayout.tsx 中 ADMIN/OWNER 菜单结构，确保数据看板菜单项存在：
- 如果已有 revenue 项指向 `/admin/revenue`，改为指向 `/admin`
- 添加或确保有 `{ key: '/admin', icon: <DashboardOutlined />, label: '数据看板' }`

- [ ] **Step 5: 验证前端编译**

```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/api/dashboard.ts apps/web/src/pages/admin/DashboardPage.tsx apps/web/src/router.tsx apps/web/src/layouts/AppLayout.tsx
git commit -m "feat: add dashboard page with stats, trend chart, ranking and alerts"
```

---

## Module 2: 陪玩工作台

### Task 2.1: Backend — Companion Workbench API

**Files:**
- Modify: `apps/server/src/companions/companions.service.ts`
- Modify: `apps/server/src/companions/companions.controller.ts`

**Interfaces:**
- Consumes: `PrismaService`, config from SystemConfig
- Produces: `GET /api/companions/me/workbench` → today stats, `PUT /api/companions/me/status` (enhance existing)

- [ ] **Step 1: 在 companions.service.ts 中添加 getWorkbench 方法**

在 `CompanionsService` 类中添加：

```typescript
async getWorkbench(companionId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Today's revenue from completed orders
  const todayOrders = await this.prisma.order.findMany({
    where: {
      companionId,
      status: 'DONE',
      createdAt: { gte: today, lt: tomorrow },
    },
  });
  const todayRevenue = todayOrders.reduce((s, o) => s + o.amount, 0);

  // Config thresholds
  const [unlockCfg, freeCfg] = await Promise.all([
    this.prisma.systemConfig.findUnique({ where: { key: 'revenue.unlock_threshold' } }),
    this.prisma.systemConfig.findUnique({ where: { key: 'revenue.free_threshold' } }),
  ]);
  const unlockThreshold = (unlockCfg?.value as number) ?? 100;
  const freeThreshold = (freeCfg?.value as number) ?? 300;

  // Time logs for today
  const timeLogs = await this.prisma.companionTimeLog.findMany({
    where: {
      companionId,
      startedAt: { gte: today },
    },
  });

  const durations = { entertainment: 0, work: 0, idle: 0, rest: 0 };
  for (const log of timeLogs) {
    const seconds = log.durationSeconds || 0;
    if (log.mode === 'ENTERTAINMENT') durations.entertainment += seconds;
    else if (log.mode === 'WORK') durations.work += seconds;
    else if (log.mode === 'IDLE') durations.idle += seconds;
    else durations.rest += seconds;
  }

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const entertainmentMinutes = Math.floor(durations.entertainment / 60);
  const entertainmentFee = entertainmentMinutes; // ¥1/min

  // Online companions (same studio)
  const companion = await this.prisma.companion.findUnique({
    where: { id: companionId },
    select: { studioId: true },
  });
  const onlineCompanions = await this.prisma.companion.findMany({
    where: { studioId: companion?.studioId, status: { in: ['ONLINE', 'BUSY'] } },
    select: {
      id: true,
      status: true,
      user: { select: { username: true } },
    },
  });

  return {
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    unlockThreshold,
    isUnlocked: todayRevenue >= unlockThreshold,
    freeThreshold,
    entertainmentMinutes,
    entertainmentFee,
    statusDurations: {
      entertainment: formatDuration(durations.entertainment),
      work: formatDuration(durations.work),
      idle: formatDuration(durations.idle),
      rest: formatDuration(durations.rest),
    },
    onlineCompanions,
  };
}
```

- [ ] **Step 2: 在 companions.controller.ts 中添加 workbench endpoint**

在 `CompanionsController` 类中添加：

```typescript
@Get('me/workbench')
@Roles(UserRole.COMPANION)
async getWorkbench(@Req() req: any): Promise<ApiResponse<unknown>> {
  const data = await this.companionsService.getWorkbench(req.user.companionId);
  return { code: 200, message: 'ok', data };
}
```

注意：确保 controller 顶部的 imports 包含 `UserRole`（通常已有）。

- [ ] **Step 3: 验证编译**

```bash
cd apps/server && npx nest build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/companions/
git commit -m "feat: add companion workbench API with today stats and thresholds"
```

### Task 2.2: Frontend — Companion Workbench Page

**Files:**
- Modify: `apps/web/src/pages/CompanionPage.tsx`
- Create: `apps/web/src/api/companions.ts` — 已存在，添加 workbench 方法

**Interfaces:**
- Consumes: `companionsApi` (已存在)

- [ ] **Step 1: 添加 workbench API 到 companions.ts**

在 `apps/web/src/api/companions.ts` 中添加：

```typescript
workbench: () => http.get('/companions/me/workbench'),
```

- [ ] **Step 2: 重写 CompanionPage 为工作台**

Replace `apps/web/src/pages/CompanionPage.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Typography, Tag, Progress, Spin, Space } from 'antd';
import { DollarOutlined, ClockCircleOutlined, TeamOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { companionsApi } from '../api/companions';

const { Text, Title } = Typography;

const StatBlock: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> =
  ({ label, value, icon, color }) => (
    <Card size="small" style={{ borderLeft: `3px solid ${color}`, textAlign: 'center' }}>
      <div style={{ fontSize: 24, color, opacity: 0.5, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
    </Card>
  );

const CompanionPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await companionsApi.workbench();
      setData(res.data);
    } catch (e) {
      console.error('Workbench fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const switchStatus = async (status: string) => {
    // Status switch via WebSocket is handled by the Go Agent.
    // This just updates the companion status in the DB.
    try {
      await companionsApi.updateStatus(data?.companionId ?? '', status);
      fetchData();
    } catch { /* ignore */ }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return <Text type="secondary">加载失败</Text>;

  const unlockPct = Math.min(Math.round((data.todayRevenue / data.unlockThreshold) * 100), 100);
  const freePct = Math.min(Math.round((data.todayRevenue / data.freeThreshold) * 100), 100);

  return (
    <div>
      <Title level={4}>👤 我的工作台</Title>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <StatBlock label="今日流水" value={`¥${data.todayRevenue}`} icon={<DollarOutlined />} color="#1677ff" />
        </Col>
        <Col span={6}>
          <StatBlock label="解锁门槛" value={data.isUnlocked ? '✅ 已解锁' : `¥${data.unlockThreshold}`}
            icon={<ThunderboltOutlined />} color={data.isUnlocked ? '#52c41a' : '#faad14'} />
        </Col>
        <Col span={6}>
          <StatBlock label="娱乐计时" value={`${data.entertainmentMinutes}分钟`}
            icon={<ClockCircleOutlined />} color="#eb2f96" />
        </Col>
        <Col span={6}>
          <StatBlock label="暂扣费用" value={`¥${data.entertainmentFee}`}
            icon={<DollarOutlined />} color="#ff4d4f" />
        </Col>
      </Row>

      {/* Unlock progress */}
      <Card size="small" style={{ marginTop: 16 }}>
        <Text>🎯 流水解锁进度：¥{data.todayRevenue} / ¥{data.unlockThreshold}</Text>
        <Progress percent={unlockPct} status={data.isUnlocked ? 'success' : 'active'} />
        <Text type="secondary">
          {data.isUnlocked
            ? '抢单池已解锁 ✅'
            : `还差 ¥${data.unlockThreshold - data.todayRevenue} 解锁抢单池`}
        </Text>
      </Card>

      {/* Free threshold */}
      <Card size="small" style={{ marginTop: 8 }}>
        <Text>🎯 免单门槛：¥{data.freeThreshold} ｜ 还差 ¥{Math.max(0, data.freeThreshold - data.todayRevenue)} 免娱乐费</Text>
        <Progress percent={freePct} status={data.todayRevenue >= data.freeThreshold ? 'success' : 'active'}
          strokeColor="#eb2f96" />
      </Card>

      {/* Status durations */}
      <Card title="📊 今日状态时长" size="small" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          {(['entertainment', 'idle', 'work', 'rest'] as const).map(mode => {
            const labels = { entertainment: '🎮娱乐', idle: '💼空闲', work: '🔴接单', rest: '🛏️休息' };
            return (
              <Col span={6} key={mode}>
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Text type="secondary">{labels[mode]}</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
                    {data.statusDurations?.[mode] ?? '00:00'}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      {/* Quick actions */}
      <Card size="small" style={{ marginTop: 16, textAlign: 'center' }}>
        <Space size="large">
          <Button type="default" icon="🎮" size="large" onClick={() => switchStatus('IDLE')}>娱乐中</Button>
          <Button type="primary" icon="💼" size="large" onClick={() => switchStatus('ONLINE')}>等单中 ⭐</Button>
          <Button type="default" icon="🛏️" size="large" onClick={() => switchStatus('OFFLINE')}>休息中</Button>
        </Space>
      </Card>

      {/* Online companions */}
      <Card title="👥 在线陪玩" size="small" style={{ marginTop: 16 }}>
        {data.onlineCompanions?.map((c: any) => (
          <Tag key={c.id} color={c.status === 'BUSY' ? 'red' : 'green'} style={{ marginBottom: 8, padding: '4px 12px', fontSize: 14 }}>
            {c.user?.username} {c.status === 'BUSY' ? '🔴接单中' : '🟢等单中'}
          </Tag>
        ))}
        {(!data.onlineCompanions || data.onlineCompanions.length === 0) && <Text type="secondary">暂无在线陪玩</Text>}
      </Card>
    </div>
  );
};

export default CompanionPage;
```

- [ ] **Step 3: 验证编译**

```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/CompanionPage.tsx apps/web/src/api/companions.ts
git commit -m "feat: enhance companion workbench with stats, progress and status switch"
```

---

## Module 3: 抢单池（流水门槛解锁）

### Task 3.1: Backend — 增强 grab 逻辑 + pool status

**Files:**
- Modify: `apps/server/src/orders/orders.service.ts`
- Modify: `apps/server/src/orders/orders.controller.ts`

**Interfaces:**
- Consumes: 现有 `findPool()`, `grab()` 方法
- Produces: `GET /api/orders/pool/status` → 是否解锁, `POST /api/orders/:id/grab` 增强校验

- [ ] **Step 1: 在 orders.service.ts 中增强 grab 方法 + 添加 poolStatus**

现有 `grab` 方法已有状态校验（PENDING→GRABBED）+ dispatchType=POOL 检查。需要增加流水门槛校验。

修改 `grab` 方法，在 `validateTransition` 之后添加流水校验：

```typescript
async grab(orderId: string, companionId: string) {
  const order = await this.prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new NotFoundException('订单不存在');
  this.validateTransition(order, OrderStatus.GRABBED);
  if (order.dispatchType !== 'POOL' || order.companionId !== null) {
    throw new ForbiddenException('该订单不可抢');
  }

  // Revenue threshold check
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayOrders = await this.prisma.order.findMany({
    where: {
      companionId,
      status: 'DONE',
      createdAt: { gte: today, lt: tomorrow },
    },
  });
  const todayRevenue = todayOrders.reduce((s, o) => s + o.amount, 0);

  const config = await this.prisma.systemConfig.findUnique({
    where: { key: 'revenue.unlock_threshold' },
  });
  const threshold = (config?.value as number) ?? 100;

  if (todayRevenue < threshold) {
    throw new ForbiddenException(
      `今日流水 ¥${todayRevenue}，未达到解锁门槛 ¥${threshold}，还差 ¥${threshold - todayRevenue}`,
    );
  }

  const updatedOrder = await this.prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.GRABBED, companionId },
  });
  this.wsGateway.broadcastToStudio(updatedOrder.studioId, 'order:pool_updated', updatedOrder);
  return updatedOrder;
}
```

同时添加 `getPoolStatus` 方法：

```typescript
async getPoolStatus(companionId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayOrders = await this.prisma.order.findMany({
    where: {
      companionId,
      status: 'DONE',
      createdAt: { gte: today, lt: tomorrow },
    },
  });
  const todayRevenue = todayOrders.reduce((s, o) => s + o.amount, 0);

  const config = await this.prisma.systemConfig.findUnique({
    where: { key: 'revenue.unlock_threshold' },
  });
  const threshold = (config?.value as number) ?? 100;

  return {
    todayRevenue: Math.round(todayRevenue * 100) / 100,
    threshold,
    isUnlocked: todayRevenue >= threshold,
  };
}
```

- [ ] **Step 2: 在 orders.controller.ts 中添加 pool/status endpoint**

```typescript
@Get('pool/status')
@Roles(UserRole.COMPANION)
async getPoolStatus(@Req() req: any): Promise<ApiResponse<unknown>> {
  const data = await this.ordersService.getPoolStatus(req.user.companionId);
  return { code: 200, message: 'ok', data };
}
```

同时更新 `grab` 的 controller handler，传入 companionId：

```typescript
// Existing grab endpoint — update to pass companionId:
@Post(':id/grab')
@Roles(UserRole.COMPANION)
async grab(@Param('id') id: string, @Req() req: any): Promise<ApiResponse<unknown>> {
  const data = await this.ordersService.grab(id, req.user.companionId);
  return { code: 200, message: '抢单成功', data };
}
```

- [ ] **Step 3: 验证编译**

```bash
cd apps/server && npx nest build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/orders/
git commit -m "feat: add revenue threshold check for order grabbing and pool status endpoint"
```

### Task 3.2: Frontend — 抢单池增强（流水门槛锁）

**Files:**
- Modify: `apps/web/src/pages/companion/PoolPage.tsx`

**Interfaces:**
- Consumes: `ordersApi` (已存在), `companionsApi.workbench()` 获取流水状态
- Produces: 抢单池页面带解锁/锁定状态

- [ ] **Step 1: 重写 PoolPage 增加解锁逻辑**

Replace `apps/web/src/pages/companion/PoolPage.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Typography, Tag, Row, Col, Spin, message, Empty, Progress } from 'antd';
import { ThunderboltOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { ordersApi } from '../../api/orders';

const { Text, Title } = Typography;

const PoolPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [poolStatus, setPoolStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [grabbing, setGrabbing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [poolRes, statusRes] = await Promise.all([
        ordersApi.pool(),
        ordersApi.list({ status: 'PENDING' }), // pool endpoint returns PENDING pool orders
      ]);
      // Use pool endpoint result
      const poolOrders = poolRes.data.data ?? [];
      setOrders(poolOrders);

      const { data: sData } = await ordersApi.list();
      // we need a dedicated endpoint; for now re-use the grab status from companions
      // Actually use the new pool/status endpoint:
      try {
        const { data: statusRes } = await (await import('../../api/client')).default.get('/orders/pool/status');
        setPoolStatus(statusRes.data);
      } catch {
        setPoolStatus({ todayRevenue: 0, threshold: 100, isUnlocked: false });
      }
    } catch (e) {
      console.error('Pool fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGrab = async (orderId: string) => {
    setGrabbing(orderId);
    try {
      await ordersApi.grab(orderId);
      message.success('抢单成功！');
      fetchData();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? '抢单失败');
    } finally {
      setGrabbing(null);
    }
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  const isUnlocked = poolStatus?.isUnlocked ?? false;
  const todayRevenue = poolStatus?.todayRevenue ?? 0;
  const threshold = poolStatus?.threshold ?? 100;
  const pct = Math.min(Math.round((todayRevenue / threshold) * 100), 100);

  return (
    <div>
      <Title level={4}>📦 抢单池</Title>

      {/* Status banner */}
      <Card size="small" style={{ marginBottom: 16, background: isUnlocked ? '#f6ffed' : '#fff7e6' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Text strong>
              当日流水：¥{todayRevenue} ｜ 解锁门槛：¥{threshold}
              {isUnlocked ? ' ｜ 🟢 已解锁' : ' ｜ 🔒 未解锁'}
            </Text>
          </Col>
          <Col>
            <Tag color={isUnlocked ? 'success' : 'warning'} style={{ fontSize: 14, padding: '4px 12px' }}>
              {isUnlocked ? '✅ 可抢单' : `还差 ¥${Math.round((threshold - todayRevenue) * 100) / 100}`}
            </Tag>
          </Col>
        </Row>
        {!isUnlocked && <Progress percent={pct} size="small" style={{ marginTop: 8 }} />}
      </Card>

      {!isUnlocked && (
        <Card size="small" style={{ marginBottom: 16, textAlign: 'center', opacity: 0.6 }}>
          <ThunderboltOutlined style={{ fontSize: 48, color: '#faad14' }} />
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">今日流水不足 ¥{threshold}，抢单池已锁定</Text>
            <br />
            <Text type="secondary">请先完成老客户服务提升流水</Text>
          </div>
        </Card>
      )}

      {isUnlocked && orders.length === 0 && <Empty description="暂无待抢订单" />}

      <Row gutter={[12, 12]}>
        {orders.map((order: any) => (
          <Col span={8} key={order.id}>
            <Card
              size="small"
              hoverable={isUnlocked}
              title={
                <Space>
                  <Tag color="blue">{order.customer?.customerCode ?? 'N/A'}</Tag>
                  <Text>{order.gameName}</Text>
                </Space>
              }
              extra={
                isUnlocked ? (
                  <Button
                    type="primary"
                    size="small"
                    loading={grabbing === order.id}
                    onClick={() => handleGrab(order.id)}
                  >
                    抢单
                  </Button>
                ) : (
                  <Button size="small" disabled>🔒</Button>
                )
              }
            >
              <div style={{ fontSize: 13 }}>
                <div>金额：¥{order.amount}</div>
                <div>来源：{order.customFields?.customerWechat ? '微信' : '平台'}</div>
                {order.customFields?.deltaMode && <div>模式：{order.customFields.deltaMode}</div>}
                {order.customFields?.deltaNote && (
                  <div style={{ color: '#faad14', marginTop: 4 }}>⚠️ {order.customFields.deltaNote}</div>
                )}
                <div style={{ marginTop: 4, color: '#999', fontSize: 12 }}>
                  <ClockCircleOutlined /> {new Date(order.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card size="small" style={{ marginTop: 16 }}>
        <Text type="secondary">💡 抢单后可见客户联系方式和来源账号ID</Text>
      </Card>
    </div>
  );
};

export default PoolPage;
```

- [ ] **Step 2: 验证编译**

```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/companion/PoolPage.tsx
git commit -m "feat: add revenue threshold lock to companion pool page"
```

---

## Module 4: 报账财务

### Task 4.1: Prisma Schema — ExpenseReport 表

**Files:**
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: 添加 ExpenseReport 模型**

在 schema.prisma 文件末尾（SystemConfig 之后）添加：

```prisma
model ExpenseReport {
  id            String    @id @default(uuid())
  companionId   String
  studioId      String
  type          String    @default("EXPENSE")  // EXPENSE | WITHDRAW
  amount        Float
  screenshotUrl String?
  description   String?
  status        String    @default("PENDING")  // PENDING | APPROVED | REJECTED
  reviewedById  String?
  reviewedAt    DateTime?
  reviewNote    String?
  createdAt     DateTime  @default(now())

  companion     Companion @relation(fields: [companionId], references: [id])
  studio        Studio    @relation(fields: [studioId], references: [id])
}
```

- [ ] **Step 2: 运行 migration**

```bash
cd apps/server && npx prisma migrate dev --name add_expense_report
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/prisma/
git commit -m "feat: add ExpenseReport model for expense and withdrawal reporting"
```

### Task 4.2: Backend — ExpenseReport CRUD + 审核

**Files:**
- Modify: `apps/server/src/billing/billing.service.ts`
- Modify: `apps/server/src/billing/billing.controller.ts`

**Interfaces:**
- Consumes: 现有 billing module (已有 transactions, revenue, expenses)
- Produces: ExpenseReport CRUD endpoints + review endpoint + monthly summary

- [ ] **Step 1: 在 billing.service.ts 中添加 ExpenseReport 方法**

```typescript
// ── Expense Reports ──

async createExpenseReport(dto: {
  companionId: string;
  studioId: string;
  type: string;
  amount: number;
  screenshotUrl?: string;
  description?: string;
}) {
  return this.prisma.expenseReport.create({
    data: {
      companionId: dto.companionId,
      studioId: dto.studioId,
      type: dto.type,
      amount: dto.amount,
      screenshotUrl: dto.screenshotUrl ?? null,
      description: dto.description ?? null,
      status: 'PENDING',
    },
    include: {
      companion: { include: { user: { select: { username: true } } } },
    },
  });
}

async findExpenseReports(studioId: string, status?: string) {
  const where: any = { studioId };
  if (status) where.status = status;
  return this.prisma.expenseReport.findMany({
    where,
    include: {
      companion: { include: { user: { select: { username: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async findCompanionExpenseReports(companionId: string) {
  return this.prisma.expenseReport.findMany({
    where: { companionId },
    orderBy: { createdAt: 'desc' },
  });
}

async reviewExpenseReport(id: string, status: string, reviewerId: string, note?: string) {
  return this.prisma.expenseReport.update({
    where: { id },
    data: {
      status,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
      reviewNote: note ?? null,
    },
  });
}

async getExpenseMonthlySummary(studioId: string, month?: string) {
  const now = new Date();
  const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [year, mon] = targetMonth.split('-').map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 1);

  const reports = await this.prisma.expenseReport.findMany({
    where: {
      studioId,
      createdAt: { gte: start, lt: end },
    },
  });

  const approved = reports.filter(r => r.status === 'APPROVED');
  const pending = reports.filter(r => r.status === 'PENDING');
  const rejected = reports.filter(r => r.status === 'REJECTED');

  const sumByType = (list: typeof reports, type: string) =>
    list.filter(r => r.type === type).reduce((s, r) => s + r.amount, 0);

  return {
    month: targetMonth,
    totalExpense: sumByType(approved, 'EXPENSE'),
    totalWithdraw: sumByType(approved, 'WITHDRAW'),
    pendingCount: pending.length,
    pendingAmount: pending.reduce((s, r) => s + r.amount, 0),
    rejectedCount: rejected.length,
    rejectedAmount: rejected.reduce((s, r) => s + r.amount, 0),
    reports,
  };
}
```

- [ ] **Step 2: 在 billing.controller.ts 中添加 ExpenseReport routes**

```typescript
// ── Expense Reports ──

@Post('expense-reports')
@Roles(UserRole.COMPANION)
async createExpenseReport(
  @Req() req: any,
  @Body() dto: { type: string; amount: number; screenshotUrl?: string; description?: string },
): Promise<ApiResponse<unknown>> {
  const data = await this.billingService.createExpenseReport({
    ...dto,
    companionId: req.user.companionId,
    studioId: req.user.studioId,
  });
  return { code: 201, message: '报账提交成功', data };
}

@Get('expense-reports')
@Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.COMPANION)
async findExpenseReports(
  @Req() req: any,
  @Query('status') status?: string,
): Promise<ApiResponse<unknown>> {
  const data = req.user.role === 'COMPANION'
    ? await this.billingService.findCompanionExpenseReports(req.user.companionId)
    : await this.billingService.findExpenseReports(req.user.studioId, status);
  return { code: 200, message: 'ok', data };
}

@Put('expense-reports/:id/review')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async reviewExpenseReport(
  @Param('id') id: string,
  @Req() req: any,
  @Body() dto: { status: string; note?: string },
): Promise<ApiResponse<unknown>> {
  const data = await this.billingService.reviewExpenseReport(
    id, dto.status, req.user.id, dto.note,
  );
  return { code: 200, message: '审核完成', data };
}

@Get('expense-reports/monthly-summary')
@Roles(UserRole.ADMIN, UserRole.OWNER)
async getMonthlySummary(
  @Req() req: any,
  @Query('month') month?: string,
): Promise<ApiResponse<unknown>> {
  const data = await this.billingService.getExpenseMonthlySummary(
    req.user.studioId, month,
  );
  return { code: 200, message: 'ok', data };
}
```

注意：由于 `billing.controller.ts` 的 `@Controller()` 装饰器没有路径前缀，所有路由直接以 `/api/expense-reports` 访问。

- [ ] **Step 3: 验证编译**

```bash
cd apps/server && npx nest build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/billing/
git commit -m "feat: add expense report CRUD with review and monthly summary endpoints"
```

### Task 4.3: Frontend — 报账表单 + 管理端审核

**Files:**
- Create: `apps/web/src/api/expenses.ts`
- Modify: `apps/web/src/pages/companion/BillingPage.tsx`
- Modify: `apps/web/src/pages/admin/BillingPage.tsx`

- [ ] **Step 1: 创建 expenses API client**

```typescript
import http from './client';

export const expenseReportsApi = {
  create: (data: { type: string; amount: number; screenshotUrl?: string; description?: string }) =>
    http.post('/expense-reports', data),
  list: (params?: { status?: string }) => http.get('/expense-reports', { params }),
  review: (id: string, status: string, note?: string) =>
    http.put(`/expense-reports/${id}/review`, { status, note }),
  monthlySummary: (month?: string) =>
    http.get('/expense-reports/monthly-summary', { params: { month } }),
};
```

- [ ] **Step 2: 增强 companion BillingPage — 添加报账单提交**

在 `apps/web/src/pages/companion/BillingPage.tsx` 中，在现有的报账（Transaction）列表基础上，新增一个"报账/支取申请"表单区域：

```tsx
// Add this section to the existing BillingPage component
// Below the existing content, add:

import { expenseReportsApi } from '../../api/expenses';
import { Upload, Modal } from 'antd';  // add to existing imports

// Inside the component, add state:
const [reportModal, setReportModal] = useState(false);
const [reportType, setReportType] = useState<'EXPENSE' | 'WITHDRAW'>('EXPENSE');
const [reportAmount, setReportAmount] = useState<number>(0);
const [reportDesc, setReportDesc] = useState('');
const [reportScreenshot, setReportScreenshot] = useState<string>('');

const submitReport = async () => {
  if (reportAmount <= 0) { message.warning('请输入金额'); return; }
  try {
    await expenseReportsApi.create({
      type: reportType,
      amount: reportAmount,
      description: reportDesc,
      screenshotUrl: reportScreenshot,
    });
    message.success('提交成功');
    setReportModal(false);
    setReportAmount(0);
    setReportDesc('');
    setReportScreenshot('');
  } catch (e: any) {
    message.error(e?.response?.data?.message ?? '提交失败');
  }
};

// Add buttons to trigger the modal:
<Space style={{ marginBottom: 16 }}>
  <Button type="primary" onClick={() => { setReportType('EXPENSE'); setReportModal(true); }}>
    💰 报账
  </Button>
  <Button onClick={() => { setReportType('WITHDRAW'); setReportModal(true); }}>
    💸 申请支取
  </Button>
</Space>

// Modal:
<Modal
  title={reportType === 'EXPENSE' ? '💰 报账' : '💸 申请支取'}
  open={reportModal}
  onOk={submitReport}
  onCancel={() => setReportModal(false)}
  okText="提交"
>
  <Space direction="vertical" style={{ width: '100%' }}>
    <div>
      <Text>金额（元）</Text>
      <InputNumber style={{ width: '100%' }} min={0} value={reportAmount}
        onChange={v => setReportAmount(v ?? 0)} />
    </div>
    <div>
      <Text>备注</Text>
      <Input.TextArea value={reportDesc} onChange={e => setReportDesc(e.target.value)}
        placeholder="可选：填写备注信息" rows={3} />
    </div>
  </Space>
</Modal>
```

- [ ] **Step 3: 增强 admin BillingPage — 添加 ExpenseReport 审核**

在 `apps/web/src/pages/admin/BillingPage.tsx` 中，添加一个 Tab 或在现有内容后面增加报账审核表格：

```tsx
// Add new section for expense report review
import { expenseReportsApi } from '../../api/expenses';

// State
const [reports, setReports] = useState<any[]>([]);
const [reportFilter, setReportFilter] = useState<string>('PENDING');

// Fetch
const fetchReports = async () => {
  try {
    const { data } = await expenseReportsApi.list({ status: reportFilter });
    setReports(data.data ?? []);
  } catch { message.error('加载报账记录失败'); }
};

useEffect(() => { fetchReports(); }, [reportFilter]);

// Review handler
const handleReview = async (id: string, status: string) => {
  try {
    await expenseReportsApi.review(id, status);
    message.success(status === 'APPROVED' ? '已通过' : '已驳回');
    fetchReports();
  } catch { message.error('操作失败'); }
};

// Summary
const [summary, setSummary] = useState<any>(null);
useEffect(() => {
  expenseReportsApi.monthlySummary().then(({ data }) => setSummary(data.data)).catch(() => {});
}, []);

// Render section
<Card title="💰 报账与财务" style={{ marginTop: 16 }}>
  <Row gutter={16} style={{ marginBottom: 16 }}>
    <Col span={6}><Statistic title="本月报账" value={`¥${summary?.totalExpense ?? 0}`} /></Col>
    <Col span={6}><Statistic title="已通过" value={`¥${summary?.totalExpense + summary?.totalWithdraw ?? 0}`}
      valueStyle={{ color: '#3f8600' }} /></Col>
    <Col span={6}><Statistic title="待审核" value={`${summary?.pendingCount ?? 0}笔`}
      valueStyle={{ color: '#faad14' }} /></Col>
    <Col span={6}><Statistic title="已驳回" value={`${summary?.rejectedCount ?? 0}笔`}
      valueStyle={{ color: '#cf1322' }} /></Col>
  </Row>

  <Tabs activeKey={reportFilter} onChange={setReportFilter}
    items={[
      { key: '', label: '全部' },
      { key: 'PENDING', label: '待审核' },
      { key: 'APPROVED', label: '已通过' },
      { key: 'REJECTED', label: '已驳回' },
    ]}
  />
  <Table dataSource={reports} pagination={{ pageSize: 10 }} size="small" rowKey="id">
    <Table.Column title="报账人" dataIndex={['companion', 'user', 'username']} />
    <Table.Column title="类型" dataIndex="type"
      render={(t: string) => t === 'EXPENSE' ? '报账' : '支取'} />
    <Table.Column title="金额" dataIndex="amount" render={(v: number) => `¥${v}`} />
    <Table.Column title="状态" dataIndex="status"
      render={(s: string) => {
        const m: Record<string, { color: string; label: string }> = {
          PENDING: { color: 'orange', label: '待审核' },
          APPROVED: { color: 'green', label: '已通过' },
          REJECTED: { color: 'red', label: '已驳回' },
        };
        return <Tag color={m[s]?.color}>{m[s]?.label ?? s}</Tag>;
      }} />
    <Table.Column title="日期" dataIndex="createdAt"
      render={(d: string) => new Date(d).toLocaleDateString()} />
    <Table.Column title="操作" render={(_: any, r: any) =>
      r.status === 'PENDING' ? (
        <Space>
          <Button size="small" type="primary" onClick={() => handleReview(r.id, 'APPROVED')}>通过</Button>
          <Button size="small" danger onClick={() => handleReview(r.id, 'REJECTED')}>驳回</Button>
        </Space>
      ) : <Text type="secondary">—</Text>
    } />
  </Table>
</Card>
```

- [ ] **Step 4: 验证编译**

```bash
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api/expenses.ts apps/web/src/pages/companion/BillingPage.tsx apps/web/src/pages/admin/BillingPage.tsx
git commit -m "feat: add expense report submission for companions and review for admins"
```

---

## 收尾任务

### Task 99.1: 全量构建验证

- [ ] **Step 1: 构建所有包**

```bash
cd /data/project/game-workspace && pnpm build 2>&1 | tail -20
```

Expected: All packages build successfully

- [ ] **Step 2: 启动并冒烟测试**

```bash
# Start docker services then:
pnpm dev:server &
pnpm dev:web &
```

验证以下页面可访问：
- `/admin` → 数据看板
- `/admin/settings` → 系统配置
- `/companion` → 陪玩工作台
- `/companion/pool` → 抢单池
- `/companion/billing` → 报账页
- `/admin/billing` → 报账审核

### Task 99.2: 文档更新

- [ ] **Step 1: 更新 CHANGELOG.md**

在 `[Unreleased]` 下添加：

```markdown
## [Unreleased]

### Added
- 数据看板：今日流水/订单/在线陪玩/接单率 + 7日趋势图 + 业绩排行 + 异常预警
- 陪玩工作台：今日统计、流水解锁进度、状态时长、状态切换、在线陪玩列表
- 抢单池流水门槛：当日流水≥100元解锁抢单功能
- 报账财务：陪玩端提交报账/支取申请，管理端审核通过/驳回，月度汇总
- 系统配置：流水门槛、阶梯分成、支取比例、下拉选项、超时设置等全局配置
- `Studio.type` 字段区分直营店/租赁店
- `StudioDailyStats` 和 `ExpenseReport` 数据模型
```

- [ ] **Step 2: 更新 ARCHITECTURE.md**

添加 Dashboard 模块到架构图。

- [ ] **Step 3: 更新 README.md**

在 API Reference 表添加新端点，在 Project Structure 添加新文件。

- [ ] **Step 4: Commit docs**

```bash
git add CHANGELOG.md README.md docs/ARCHITECTURE.md
git commit -m "docs: update documentation for Phase 1 MVP features"
```

---

## 实施总结

| 顺序 | 模块 | 新增文件 | 修改文件 | 预估时间 |
|------|------|---------|---------|---------|
| 1 | 系统配置 | 1 (api/config.ts) | 2 (settings controller + page) | 1h |
| 2 | 数据看板 | 4 (dashboard module ×3 + api + page) | 3 (app.module, router, layout) | 2h |
| 3 | 陪玩工作台 | 0 | 3 (service, controller, page) | 1.5h |
| 4 | 抢单池 | 0 | 3 (service, controller, page) | 1h |
| 5 | 报账财务 | 2 (api + model) | 4 (service, controller, 2 pages) | 2h |
| — | 收尾 | 0 | 3 (docs) | 0.5h |
| **Total** | | **7 新文件** | **15 修改** | **~8h** |
