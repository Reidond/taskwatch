# WEB (React Dashboard)

## OVERVIEW

Vite + React PWA with TanStack Router/Query and shadcn/ui. Dashboard for task management, plan review, MR tracking.

## STRUCTURE

```
src/
├── main.tsx              # Entry: QueryClient, Router setup
├── routeTree.gen.ts      # Auto-generated route tree (DO NOT EDIT)
├── index.css             # Tailwind v4 + shadcn CSS variables
├── routes/
│   ├── __root.tsx        # Root layout, nav
│   ├── index.tsx         # Dashboard home
│   ├── tasks.tsx         # Task list
│   ├── tasks.$taskId.tsx # Task detail (plan, feedback, MRs)
│   ├── worktrees.tsx     # Worktree management
│   └── settings.tsx      # User preferences
├── components/
│   ├── ui/               # shadcn/ui components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   └── StatusBadge.tsx   # Reusable status indicator
├── lib/
│   ├── api.ts            # Fetch wrapper, API client
│   ├── queries.ts        # TanStack Query hooks
│   └── utils.ts          # cn() utility for Tailwind
└── service-worker.ts     # PWA push notifications
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add page | `routes/<name>.tsx` | File-based routing |
| Add nested route | `routes/<parent>.<child>.tsx` | Dot notation |
| Add query hook | `lib/queries.ts` | useQuery/useMutation |
| Add API call | `lib/api.ts` | Typed fetch functions |
| Add UI component | `components/ui/` | shadcn components |
| Add custom component | `components/` | Reusable UI pieces |
| Add shadcn component | Run `bunx shadcn add <component>` | |

## CONVENTIONS

- TanStack Router: file-based routing, `routeTree.gen.ts` auto-generated
- Path alias: `@/` maps to `src/`
- Styling: Tailwind v4 + shadcn CSS variables (bg-background, text-foreground, etc.)
- UI components: shadcn/ui (Card, Button, Badge, etc.)
- API proxy: dev server proxies `/api` to localhost:8787
- Query keys: `['tasks']`, `['tasks', taskId]`, etc.
- Dark mode: Applied via `dark` class on root element

## ANTI-PATTERNS

- Never edit `routeTree.gen.ts` (auto-generated)
- Never fetch directly; use lib/queries.ts hooks
- Never hardcode API URLs (use proxy or env)
- Never use old Tailwind colors (use shadcn CSS variables)
