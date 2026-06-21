# Changelog

All notable changes to 蠢驴电竞陪玩派单管理系统 are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).  
Auto-generated from [Conventional Commits](https://www.conventionalcommits.org/).

---

## [0.1.0] — 2026-06-21

### Added

#### 🏗️ Infrastructure
- Monorepo scaffold with pnpm workspaces (React + Nest.js + shared types)
- PostgreSQL 16 + Redis 7 Docker Compose configuration
- Prisma ORM schema (11 models) with seed data
- ESLint placeholder and TypeScript strict mode across all packages

#### 🔐 Authentication & Authorization
- JWT dual-token authentication (access 15min + refresh 7d)
- Four-role RBAC guard (`RolesGuard` + `@Roles()` decorator)
- Second password verification for profit/loss dashboard (5min secondToken)
- Client authorization flow (owner approves CS/Companion login)
- bcrypt password hashing throughout

#### 📋 Order Dispatch (Core Business)
- Order creation with POOL (competitive grab) and DIRECT (assignment) modes
- Order status state machine: `PENDING → GRABBED → CONFIRMED → DONE`
- Role-filtered order listing (Companion sees own, CS sees own, Admin sees studio)
- Pool endpoint for unassigned orders
- Concurrent-safe grab with atomic status check

#### 👥 Customer Management
- Full CRUD with role-based data isolation
- Customer reassignment between companions
- Order history per customer
- Auto-generated customer codes
- Platform tracking (小红书/抖音/快手/B站/视频号)

#### 🎮 Companion Management
- Live status tracking (ONLINE/BUSY/IDLE/OFFLINE)
- Revenue ranking (top 20)
- Billing code generation
- Time log tracking (work vs entertainment mode)
- Personal revenue with transaction history

#### 💰 Billing & Revenue
- Transaction submission with screenshot upload
- Admin approval/rejection workflow
- Daily revenue breakdown by order type (NEW/RENEW/REPURCHASE/TIP)
- Monthly revenue with per-companion aggregation
- Profit/loss calculation (revenue - expenses)
- Customer totalSpent auto-increment on transaction approval

#### 🏢 Studio & Employee Management
- Multi-studio support with counts
- Employee CRUD with auto Companion creation
- Password reset by admin

#### 📡 Real-time (WebSocket)
- Socket.IO gateway with JWT authentication on connect
- Companion heartbeat tracking (30s interval)
- Real-time status broadcast to studio rooms
- Order push to specific companions (`order:new`)
- Remote command dispatch (`pc:command`) with acknowledgment (`pc:command_ack`)
- `PCOperationLog` audit trail for all remote operations

#### 🖥️ Frontend (React)
- Login page with role-based redirect
- AppLayout with collapsible sidebar (16 role-based menu items)
- 14 route definitions across 3 roles
- Customer management page (table + create modal)
- Dispatch workbench (three-column: companion status + order pool + stats)
- Companion status page (with colored badges)
- Axios client with automatic token refresh interceptor
- Zustand auth store with persist

#### 🤖 Go Agent (Desktop Client)
- Time tracker engine (WORK/ENTERTAINMENT mode switching)
- WebSocket client with auto-reconnect (5s delay)
- 30-second heartbeat with full timing data
- Windows network throttling via QoS Policy (PowerShell)
- Remote shutdown/restart via system commands
- Local HTTP server on `:9876` with REST API
- WebView-ready local UI (status dashboard + mode switching)
- Single binary compile ~10MB, Windows Service compatible

### Fixed

- Tool artifact directories (`.codegraph/`, `.understand-anything/`, `.superpowers/`) excluded from version control
- Project documentation moved from repo root to `docs/`
- `packages/shared/tsconfig.json` added `composite: true` for TypeScript project references
- Shared package `main`/`types` fields updated from source `./src/index.ts` to compiled `./dist/index.js`
- Import paths in shared package use `.js` extensions for CJS/ESM cross-compatibility
- Go module dependencies resolved (`go mod tidy`)
- Binary artifacts (`*.exe`) excluded via `.gitignore`

---

[0.1.0]: https://github.com/opsvr-ai/game-workspace/tree/v0.1.0
