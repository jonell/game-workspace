# CLAUDE.md — 蠢驴电竞陪玩派单管理系统

## Commands

```bash
pnpm install                 # Install all dependencies
pnpm dev:server              # Start Nest.js backend (port 3001)
pnpm dev:web                 # Start React frontend (port 5173)
pnpm build                   # Build all packages (shared → server → web)
pnpm db:migrate              # Run Prisma migrations
pnpm db:seed                 # Seed database with test data
docker compose -f docker/docker-compose.yaml up -d   # Start PostgreSQL + Redis
docker compose -f docker/docker-compose.yaml down    # Stop services
cd apps/agent && go build ./cmd/agent/               # Build Go Agent
```

## Architecture

```
Browser (React) ──HTTP──▶ Nest.js (Express) ──▶ PostgreSQL + Redis
                                  △
Go Agent (WebSocket) ─────────────┘
```

- **Monorepo:** pnpm workspaces (`apps/web`, `apps/server`, `apps/agent`, `packages/shared`)
- **Auth:** JWT dual-token (access 15min / refresh 7d), 4 roles (OWNER/ADMIN/CS/COMPANION), `RolesGuard`
- **Real-time:** Socket.IO gateway with JWT auth on connect, studio-based room grouping
- **API:** Nest.js on port 3001, `/api/*` prefix, CORS for localhost:5173

## Key Files

| File | Purpose |
|------|---------|
| `apps/server/src/app.module.ts` | Root Nest.js module (imports all feature modules) |
| `apps/server/prisma/schema.prisma` | Database schema (11 models) |
| `apps/web/src/router.tsx` | All 14 frontend routes |
| `packages/shared/src/enums.ts` | Shared TypeScript enums used by all packages |
| `docker/docker-compose.yaml` | PostgreSQL 16 + Redis 7 |

## Auto-Maintenance Rules

### After each feature/fix commit, MUST:

1. **Update CHANGELOG.md:** Add the change under the `[Unreleased]` section using Keep a Changelog format. Run `bash scripts/update-changelog.sh` to preview, then manually merge or use `--write`.

2. **Update README.md if needed:** When:
   - New endpoints are added (update API table)
   - New pages are created (update route list)
   - Dependencies change (update tech stack table)
   - Project structure changes

### Commit convention (Conventional Commits):
```
feat: <description>     # New feature → Added section in CHANGELOG
fix: <description>      # Bug fix → Fixed section
chore: <description>    # Maintenance → Changed section
docs: <description>     # Documentation
refactor: <description> # Code refactoring
```

### Default accounts (seed data):

| Username | Password | Role |
|----------|----------|------|
| hanlei | 123456 | OWNER (second password: 888888) |
| kefu01 | 123456 | CS |
| zhangsan | 123456 | COMPANION |
