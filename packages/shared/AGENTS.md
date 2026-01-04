# SHARED PACKAGE

## OVERVIEW

TypeScript types, Zod schemas, and API contracts shared across all apps.

## STRUCTURE

```
src/
├── types.ts      # All type definitions (Task, Plan, Run, etc.)
├── schemas.ts    # Zod validation schemas for API requests
└── api.ts        # API response type definitions
```

## EXPORTS

Package exports via `package.json`:
- `@taskwatch/shared/types` → `src/types.ts`
- `@taskwatch/shared/api` → `src/api.ts`
- `@taskwatch/shared/schemas` → `src/schemas.ts`

## WHERE TO LOOK

| Task | File |
|------|------|
| Add domain type | `types.ts` |
| Add API response type | `api.ts` |
| Add request validation | `schemas.ts` |

## CONVENTIONS

- Types use camelCase properties (TS convention)
- D1 columns use snake_case (SQL convention)
- Zod schemas named `*Schema` (e.g., `TaskStatusSchema`)
- API response types named `*Response` (e.g., `TaskListResponse`)

## KEY TYPES

| Type | Purpose |
|------|---------|
| `TaskStatus` | State machine states |
| `Task`, `Plan`, `Run` | Core domain models |
| `DaemonConfig` | Daemon configuration shape |
| `Job`, `PlanJob`, `ImplementJob` | Job queue payloads |
