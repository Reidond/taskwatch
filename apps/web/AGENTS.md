# WEB (React Dashboard)

## OVERVIEW

Vite + React PWA with TanStack Router/Query. Dashboard for task management, plan review, MR tracking.

## STRUCTURE

```
src/
├── main.tsx              # Entry: QueryClient, Router setup
├── routeTree.gen.ts      # Auto-generated route tree (DO NOT EDIT)
├── index.css             # Tailwind imports
├── routes/
│   ├── __root.tsx        # Root layout, nav
│   ├── index.tsx         # Dashboard home
│   ├── tasks.tsx         # Task list
│   ├── tasks.$taskId.tsx # Task detail (plan, feedback, MRs)
│   ├── worktrees.tsx     # Worktree management
│   └── settings.tsx      # User preferences
├── components/
│   └── StatusBadge.tsx   # Reusable status indicator
├── lib/
│   ├── api.ts            # Fetch wrapper, API client
│   └── queries.ts        # TanStack Query hooks
└── service-worker.ts     # PWA push notifications
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add page | `routes/<name>.tsx` | File-based routing |
| Add nested route | `routes/<parent>.<child>.tsx` | Dot notation |
| Add query hook | `lib/queries.ts` | useQuery/useMutation |
| Add API call | `lib/api.ts` | Typed fetch functions |
| Add component | `components/` | Reusable UI pieces |

## CONVENTIONS

- TanStack Router: file-based routing, `routeTree.gen.ts` auto-generated
- Path alias: `@/` maps to `src/`
- Styling: Tailwind CSS classes
- API proxy: dev server proxies `/api` to localhost:8787
- Query keys: `['tasks']`, `['tasks', taskId]`, etc.

## ANTI-PATTERNS

- Never edit `routeTree.gen.ts` (auto-generated)
- Never fetch directly; use lib/queries.ts hooks
- Never hardcode API URLs (use proxy or env)
