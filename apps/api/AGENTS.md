# API (Cloudflare Worker)

## OVERVIEW

Hono-based REST API on Cloudflare Workers with D1 database. Orchestrates task workflow, serves dashboard, receives webhooks.

## STRUCTURE

```
src/
├── index.ts           # App entry, route mounting, scheduled handler
├── types.ts           # Env bindings type
├── routes/            # One router per resource
│   ├── tasks.ts       # CRUD + plan/implement triggers
│   ├── plans.ts       # Feedback, approval
│   ├── runs.ts        # Run status
│   ├── worktrees.ts   # List, delete
│   ├── push.ts        # Push subscriptions
│   ├── internal.ts    # Daemon job queue API
│   └── webhooks.ts    # GitLab MR events
├── services/
│   ├── db.ts          # D1 query helpers
│   └── clickup.ts     # ClickUp polling service
└── middleware/
    └── auth.ts        # daemonAuth, verifyGitlabWebhook
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add public endpoint | `routes/<resource>.ts` | Mount in index.ts |
| Add daemon endpoint | `routes/internal.ts` | Protected by daemonAuth |
| Add webhook handler | `routes/webhooks.ts` | Verify signatures |
| D1 query | `services/db.ts` | Use prepared statements |
| ClickUp sync logic | `services/clickup.ts` | Runs on cron schedule |

## CONVENTIONS

- Route files export `Hono` router instance
- Mount at `/api/*` (public), `/internal/*` (daemon), `/webhooks/*`
- CORS enabled only for `/api/*` paths
- Response shape: `{ data: T }` or `{ error: string }`
- Use `nanoid()` for ID generation

## ANTI-PATTERNS

- Never expose internal endpoints without daemonAuth
- Never accept webhooks without signature verification
- Never use raw SQL strings (use db.ts helpers)
