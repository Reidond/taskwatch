# WEB (React Dashboard)

## OVERVIEW

Vite + React PWA with TanStack Router/Query and shadcn/ui. Dashboard for task management, plan review, MR tracking.

## STRUCTURE

```
src/
├── main.tsx              # Entry: QueryClient, Router setup
├── routeTree.gen.ts      # Auto-generated (DO NOT EDIT)
├── index.css             # Tailwind v4 + shadcn CSS variables
├── routes/
│   ├── __root.tsx        # Root layout, nav, dark theme
│   ├── index.tsx         # Dashboard home
│   ├── tasks.tsx         # Task list
│   ├── tasks.$taskId.tsx # Task detail (plan, feedback, MRs)
│   ├── worktrees.tsx     # Worktree management
│   └── settings.tsx      # User preferences
├── components/
│   ├── ui/               # shadcn/ui components (@base-ui/react)
│   └── StatusBadge.tsx   # Custom status indicator
└── lib/
    ├── api.ts            # Typed fetch wrapper, /api prefix
    ├── queries.ts        # TanStack Query hooks
    └── utils.ts          # cn() utility for Tailwind
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add page | `routes/<name>.tsx` | File-based routing |
| Add nested route | `routes/<parent>.<child>.tsx` | Dot notation |
| Add query hook | `lib/queries.ts` | useQuery/useMutation |
| Add API call | `lib/api.ts` | Typed fetch functions |
| Add shadcn component | Run `bunx shadcn add <component>` | |

## CONVENTIONS

- Path alias: `@/` maps to `src/`
- Query keys: `['tasks']`, `['tasks', taskId]`, etc.
- 60s staleTime for queries
- Dark mode enforced via root element
- Styling: Tailwind v4 + OKLCH colors + shadcn CSS variables
- Font: Noto Sans

## ANTI-PATTERNS

- Never edit `routeTree.gen.ts` (auto-generated)
- Never fetch directly; use lib/queries.ts hooks
- Never hardcode API URLs (use /api proxy)
- Never use old Tailwind colors (use shadcn CSS variables)
