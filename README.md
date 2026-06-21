# 蠢驴电竞陪玩派单管理系统 🎮

> Chunlv Esports — 电竞陪玩工作室综合管理平台

面向电竞陪玩工作室的全业务数字化运营系统，覆盖 **接单 → 派单 → 报账 → 客户管理 → 员工管理 → 盈亏统计** 全链路，支持多工作室 / 跨工作室协同工作。

---

## 🏗️ 技术架构

| 层 | 技术 |
|---|------|
| 🖥️ 前端 | React 18 + TypeScript + Ant Design 5 + Zustand + Vite |
| ⚙️ 后端 | Nest.js 10 (Fastify) + TypeScript + Prisma ORM |
| 🗄️ 数据库 | PostgreSQL 16 |
| ⚡ 缓存 | Redis 7 |
| 📡 实时通信 | Socket.IO (WebSocket) |
| 🤖 陪玩端 Agent | Go + WebView2 (本地 Web UI) |
| 📦 基础设施 | Docker Compose + pnpm Monorepo |

## 📁 项目结构

```
chunlv-esports/
├── apps/
│   ├── web/                    # React 前端 (管理端 / 客服端)
│   │   └── src/
│   │       ├── api/            # API 客户端 (axios)
│   │       ├── pages/          # 按角色: owner/ admin/ cs/
│   │       ├── layouts/        # 角色布局 (AppLayout)
│   │       ├── stores/         # Zustand 状态管理
│   │       └── router.tsx      # 14 条路由
│   ├── server/                 # Nest.js 后端
│   │   └── src/
│   │       ├── auth/           # JWT 鉴权 + RBAC + 二级密码
│   │       ├── orders/         # 派单核心 (池/抢/指定/完成)
│   │       ├── companions/     # 陪玩状态 + 排名
│   │       ├── customers/      # 客户管理 (数据隔离)
│   │       ├── studios/        # 工作室 + 员工管理
│   │       ├── billing/        # 报账审核 + 流水统计 + 盈亏
│   │       ├── ws/             # WebSocket Gateway
│   │       └── prisma/         # PrismaService (全局)
│   └── agent/                  # Go Agent 陪玩端桌面客户端
│       ├── cmd/agent/          # 入口
│       ├── internal/
│       │   ├── engine/         # 计时引擎
│       │   ├── wsclient/       # WebSocket 客户端
│       │   ├── httplocal/      # 本地 Web UI
│       │   ├── netctrl/        # 网络限速 (QoS)
│       │   └── sysctrl/        # 系统控制 (关机/重启)
│       └── webui/              # 本地 Web 界面
├── packages/shared/            # 共享 TypeScript 类型 (7 enums + 5 interfaces)
├── docker/                     # Docker Compose (PostgreSQL + Redis)
├── docs/                       # 需求文档 / 设计文档 / 实施计划
└── pnpm-workspace.yaml
```

## 🚀 快速开始

### 前置要求

- Node.js ≥ 18
- pnpm ≥ 8
- Docker Desktop (或 PostgreSQL + Redis 手动安装)
- Go ≥ 1.22 (仅 Agent 编译需要)

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动数据库

```bash
docker compose -f docker/docker-compose.yaml up -d
```

### 3. 初始化数据库

```bash
pnpm db:migrate
pnpm db:seed
```

### 4. 启动开发服务器

```bash
# 终端 1: 后端 (http://localhost:3001)
pnpm dev:server

# 终端 2: 前端 (http://localhost:5173)
pnpm dev:web
```

### 5. 登录

打开 `http://localhost:5173`

| 角色 | 账号 | 密码 | 备注 |
|------|------|------|------|
| 老板 | `hanlei` | `123456` | 全部权限，二级密码 `888888` |
| 客服 | `kefu01` | `123456` | 需老板授权 |
| 陪玩 | `zhangsan` | `123456` | 需老板授权 |

### 6. (可选) 编译 Go Agent

```bash
cd apps/agent && go build ./cmd/agent/
# 产物: agent.exe (~10MB)
# 运行: AGENT_TOKEN=<陪玩JWT> ./agent.exe
```

## 📡 API 概览

| 模块 | 端点 | 说明 |
|------|------|------|
| 🔐 Auth | `POST /api/auth/login` | 登录获取 JWT |
| | `POST /api/auth/verify-2nd` | 二级密码验证 |
| 📋 Orders | `POST /api/orders` | 创建订单 |
| | `GET /api/orders/pool` | 派单池 |
| | `POST /api/orders/:id/grab` | 抢单 |
| | `POST /api/orders/:id/confirm` | 确认接单 |
| 👥 Customers | `GET/POST /api/customers` | 客户 CRUD |
| | `GET /api/customers/:id/orders` | 客户订单历史 |
| 🎮 Companions | `GET /api/companions` | 陪玩列表+状态 |
| | `GET /api/companions/ranking` | 收入排名 |
| 💰 Billing | `POST /api/transactions` | 提交报账 |
| | `PUT /api/transactions/:id/approve` | 审核通过 |
| | `GET /api/revenue/daily` | 日流水 |
| | `GET /api/revenue/stats` | 盈亏统计 (需 X-Second-Token) |
| 🏢 Studios | `GET/POST /api/studios` | 工作室管理 |
| | `GET /api/employees` | 员工列表 |
| 📡 WebSocket | `companion:heartbeat` | Agent 心跳 |
| | `order:new` | 新订单推送 |
| | `pc:command` | 远程关机/限速 |

## 👤 用户角色

| 角色 | 访问方式 | 权限范围 |
|------|---------|---------|
| 老板 (OWNER) | 浏览器 | 全部权限 + 盈亏统计 (二级密码) |
| 管理员 (ADMIN) | 浏览器 | 派单 / 客户 / 报账 / 远程控制 |
| 客服 (CS) | 浏览器 | 派单工作台 / 陪玩状态 |
| 陪玩 (COMPANION) | Go Agent 客户端 | 自己的客户 / 收入 / 接单 |

## 🔒 安全

- JWT 双 Token (access 15min + refresh 7d)
- RBAC 四级权限 + `RolesGuard`
- 客服/陪玩需老板授权 (`POST /api/auth/authorize`)
- 盈亏统计需要二级密码 (独立 secondToken 5min)
- 密码 bcrypt 加盐存储
- 操作日志完整记录远程控制行为

## 📖 文档

- [需求文档](docs/蠢驴电竞陪玩派单管理系统-需求文档.md)
- [系统设计](docs/superpowers/specs/2026-06-21-系统功能设计.md)
- [实施计划](docs/superpowers/plans/2026-06-21-系统实施计划.md)
- [变更日志](CHANGELOG.md)

---

> 🎯 v0.1.0 — 基础架构 + 核心业务闭环已就绪
