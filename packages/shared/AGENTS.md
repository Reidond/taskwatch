# SHARED PACKAGE

## OVERVIEW

TypeScript types, Zod schemas, and API contracts shared across all apps.

## STRUCTURE

```
src/
├── types.ts      # Domain types (Task, Plan, Run, Job, etc.)
├── schemas.ts    # Zod validation schemas
└── api.ts        # API response type definitions
```

## EXPORTS

```typescript
import { Task, TaskStatus, Plan } from '@taskwatch/shared/types'
import { TaskStatusSchema } from '@taskwatch/shared/schemas'
import { ApiResponse, TaskListResponse } from '@taskwatch/shared/api'
```

## WHERE TO LOOK

| Task | File |
|------|------|
| Add domain type | `types.ts` |
| Add API response type | `api.ts` |
| Add request validation | `schemas.ts` |

## KEY TYPES

| Type | Purpose |
|------|---------|
| `TaskStatus` | State machine states |
| `Task`, `Plan`, `Run` | Core domain models |
| `TaskWithDetails` | Task + related data for API |
| `PlanJob`, `ImplementJob` | Daemon job payloads |
| `ApiResponse<T>` | Standard response wrapper |

## CONVENTIONS

- Types use camelCase properties (TS convention)
- D1 columns use snake_case (SQL convention)
- Zod schemas named `*Schema` (e.g., `TaskStatusSchema`)
- API response types named `*Response` (e.g., `TaskListResponse`)
- Response shape: `{ data?: T, error?: string }`
