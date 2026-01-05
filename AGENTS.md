# TASKWATCH KNOWLEDGE BASE

**Generated:** 2026-01-04T19:52:00Z
**Commit:** 3ffe45d
**Branch:** main

## OVERVIEW

TaskWatch: AI agentic system that reads ClickUp tasks, generates technical plans via opencode, and creates GitLab MRs. Bun monorepo with Cloudflare Workers API, React dashboard, and local daemon.

## STRUCTURE

```
taskwatch/
├── apps/
│   ├── api/           # CF Worker + Hono + D1
│   ├── daemon/        # Bun CLI, polls API, runs opencode
│   └── web2/          # React + TanStack + shadcn/ui PWA
├── packages/
│   └── shared/        # Types, Zod schemas, API contracts
├── SPEC.md            # Full product specification
├── biome.json         # Linting/formatting config
└── package.json       # Workspace root
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `apps/api/src/routes/` | One file per resource, mount in index.ts |
| Add dashboard page | `apps/web2/src/routes/` | TanStack Router file-based routing |
| Add shared type | `packages/shared/src/types.ts` | Export via package.json |
| Add Zod schema | `packages/shared/src/schemas.ts` | Validation schemas |
| Daemon job type | `apps/daemon/src/daemon.ts` | Plan/Implement job handlers |
| D1 migrations | `apps/api/migrations/` | SQL files |
| GitLab integration | `apps/daemon/src/gitlab.ts` | Uses @gitbeaker/rest |
| Git worktrees | `apps/daemon/src/git.ts` | Worktree management |

## CONVENTIONS

- **Formatting**: Biome (tabs, single quotes, no semicolons)
- **EditorConfig**: 4-space indent, LF, UTF-8, trim whitespace
- **Package refs**: `workspace:*` for internal deps
- **Scripts**: Root orchestrates parallel dev/build via Bun
- **Type checking**: `bun run typecheck` (shared first, then apps)

## STATE MACHINE

```
NEW → PLANNING → PLAN_READY
PLAN_READY → (PLAN_REVISION → PLANNING) or PLAN_APPROVED
PLAN_APPROVED → IMPLEMENTING → PR_READY
PR_READY → DONE (when all MRs merged)
Any state → BLOCKED
```

## ANTI-PATTERNS

- Never push directly to develop/master (daemon creates MRs only)
- Never merge MRs automatically (human approval required)
- Never write back to ClickUp (read-only access)
- Never use `as any` or `@ts-ignore`
- Never commit env files or secrets

## UNIQUE STYLES

- D1 column names: snake_case in SQL, camelCase in TS types
- API responses: `{ data: T }` or `{ error: string }`
- Internal endpoints: `/internal/*` with daemon auth token
- Webhooks: `/webhooks/*` with signature verification
- Branch naming: `taskwatch/<taskId>-<slug>`

## COMMANDS

```bash
# Development
bun run dev              # API + Web parallel
bun run dev:daemon       # Daemon only

# Build
bun run build            # All apps
bun run typecheck        # Shared → API → Web → Daemon

# Database
bun run db:migrate       # Remote D1
bun run db:migrate:local # Local D1

# Deploy
bun run deploy:api       # Wrangler deploy
bun run deploy:web       # CF Pages deploy

# Lint
bun run lint             # Biome check
bun run lint:fix         # Biome fix
bun run format           # Biome format
```

## NOTES

- No tests yet (SPEC mentions future testing strategy)
- No CI/CD workflows (manual deploys)
- Daemon requires Tailscale network access to API
- Opencode server must be running locally for daemon
- Config at `~/.config/taskwatch/config.json`
