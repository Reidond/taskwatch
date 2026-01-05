# SPEC: TaskWatch — ClickUp Task Agent System

## 1. Summary

**TaskWatch** is an internal agentic AI system that:

1. **Reads** (read-only) ClickUp tasks for each authorized dashboard user, scoped to the ClickUp Workspace(s) they connected via OAuth, with status "todo" or "in progress"
2. For each eligible task, **analyzes the codebase** and **generates a technical plan**
3. Presents the plan in a **dashboard for review** — the signed-in user can request changes or approve
4. After approval, the agent **implements changes** using opencode and **creates merge requests** on GitLab

The system is designed for the Charidy codebase, which consists of **9 separate repositories** (not a monorepo).

### Tech Stack
- **Bun** — monorepo management, scripts, tooling
- **Vite + React** — frontend dashboard (PWA)
- **TanStack** — Router, Query, Table, Form
- **Cloudflare** — Workers (API), D1 (database), Pages (frontend)
- **Opencode** — AI coding agent via SDK/Server
- **GitLab.com** — source control, merge requests
- **Tailscale** — secure network between daemon and cloud

---

## 2. Goals

### 2.1 Product Goals
- Reduce time engineers spend translating ClickUp tasks into technical plans
- Ensure every task results in:
  - A reviewable **implementation plan** with explicit assumptions
  - An auditable Git workflow (branch + MR) before any code is merged
- Provide traceability: ClickUp task ↔ plan ↔ MR ↔ commits

### 2.2 Technical Goals
- Cloudflare-deployable: backend on Workers, frontend on Pages, DB on D1
- Agent runs on a persistent local machine (Andriy's configured dev environment)
- Safe operations: **read-only ClickUp**, **no direct pushes to develop**, **no merges by agent**
- Support for future CI runner mode (ephemeral, immutable runners)

---

## 3. Non-Goals

- Replacing ClickUp as the source of truth
- Fully autonomous merging/deploying without human approval
- Building a public multi-tenant SaaS (TaskWatch remains internal)
- Supporting multiple dashboard users is in scope, but only for authorized users (email whitelist)
- Writing back to ClickUp (comments/status changes) — keeps ClickUp access read-only
- Working on large/complex tasks (those are still done manually)

---

## 4. Stakeholders

- **Authorized user** — Dashboard user, reviewer, approver (MVP: email-whitelisted)
- Engineering team — Consumers of plans and MRs
- Ops/Platform — Cloudflare, secrets, deployments

---

## 5. Terminology

| Term | Definition |
|------|------------|
| **Task** | A ClickUp task eligible for agent processing |
| **Plan** | Technical specification derived from task + codebase analysis |
| **Run** | One execution attempt to generate a plan or implement changes |
| **Worktree** | Git worktree created per-task for isolated development |
| **Session** | Opencode session that handles one task (may span multiple repos) |

---

## 6. Target Codebase Structure

The Charidy codebase consists of 9 separate repositories:

```
~/src/charidy/
├── admin.charidy.com
├── customview
├── dashboard-v2
├── dashboard.charidy.com
├── donate.charidy.com
├── donate2
├── go.charidy.com
├── ssr
└── ssr2
```

A single ClickUp task may require changes across multiple repositories (e.g., frontend + backend). The agent creates **separate merge requests per repository**, but generates a **unified plan** covering all changes.

---

## 7. Core Workflow

### 7.1 Task Eligibility

A ClickUp task is eligible when:
- Belongs to one of the user's enabled ClickUp Workspaces
- Assigned to the connected ClickUp user (by assignee ID)
- Status is **"todo"** OR **"in progress"**
- Not already finalized in TaskWatch ("DONE" state)

Tasks are often vague (just a title, or poorly written description). The agent proceeds anyway, making assumptions explicit in the plan. The reviewer corrects via feedback.

### 7.2 State Machine

```
NEW → PLANNING → PLAN_READY
PLAN_READY → (PLAN_REVISION → PLANNING) or PLAN_APPROVED
PLAN_APPROVED → IMPLEMENTING → PR_READY
PR_READY → DONE (when all MRs merged)

Any state → BLOCKED (if agent needs help)
```

### 7.3 Plan Review Flow (Dashboard-Based)

1. Agent generates plan → stored in D1, visible in dashboard
2. User reviews plan in dashboard
3. User can:
   - **Add feedback** → agent immediately revises plan (conversation trail preserved)
   - **Approve** → triggers implementation
4. No "Plan PR" — plans exist only in the dashboard

### 7.4 Implementation Flow

1. After plan approval, daemon creates git worktrees for affected repos
2. Opencode session implements changes across worktrees
3. For each affected repo, daemon:
   - Creates commits
   - Pushes branch to GitLab
   - Creates merge request targeting `develop`
4. Dashboard shows MR links and status

### 7.5 Multi-Repository Changes

When a task affects multiple repos:
- **One unified plan** covering all repos
- **Separate MR per repo** (e.g., MR for dashboard-v2, MR for go.charidy.com)
- **Task tracks all MRs** — task is DONE only when ALL MRs are merged
- Dashboard shows: "2/3 MRs merged"

### 7.6 Git Constraints

- All changes committed to branches: `taskwatch/<taskId>-<slug>`
- Agent branches from: `develop` (all repos use develop)
- Agent MUST NOT:
  - Push to `develop` or `master`
  - Merge MRs
  - Modify protected branches

---

## 8. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└─────────────────────────────────────────────────────────────────┘
         │                    │                      │
         ▼                    ▼                      ▼
┌─────────────────┐  ┌─────────────────┐   ┌─────────────────────┐
│   ClickUp API   │  │   GitLab.com    │   │  Cloudflare Edge    │
│   (read-only)   │  │   (MR/webhook)  │   │                     │
└────────┬────────┘  └────────┬────────┘   │  ┌───────────────┐  │
         │                    │            │  │ Workers (API) │  │
         │                    │            │  └───────┬───────┘  │
         │                    │            │          │          │
         │                    │            │  ┌───────▼───────┐  │
         │                    │            │  │  D1 Database  │  │
         │                    │            │  └───────────────┘  │
         │                    │            │                     │
         │                    │            │  ┌───────────────┐  │
         │                    │            │  │ Pages (PWA)   │  │
         │                    │            │  └───────────────┘  │
         │                    │            └──────────┬──────────┘
         │                    │                       │
         ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                       TAILSCALE NETWORK                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │   Daemon (Andriy's     │
                 │   Dev Machine)         │
                 │                        │
                 │  ┌──────────────────┐  │
                 │  │ Opencode Server  │  │
                 │  └──────────────────┘  │
                 │                        │
                 │  ┌──────────────────┐  │
                 │  │ Git Worktrees    │  │
                 │  │ ~/agent-worktrees│  │
                 │  └──────────────────┘  │
                 │                        │
                 │  ┌──────────────────┐  │
                 │  │ Source Repos     │  │
                 │  │ ~/src/charidy    │  │
                 │  └──────────────────┘  │
                 └────────────────────────┘
```

### 8.1 Components

#### Cloudflare Worker API ("Orchestrator")
- Polls ClickUp (read-only) on schedule
- Persists tasks, runs, plans to D1
- Serves job queue for daemon
- Receives callbacks from daemon
- Receives GitLab webhooks (MR events)
- Sends Web Push notifications
- Serves dashboard API

#### Daemon (Bun CLI on Dev Machine)
- Polls Worker for pending jobs
- Manages git worktrees per task
- Controls opencode via SDK
- Streams logs to Worker
- Creates commits and pushes branches
- Creates GitLab merge requests
- Reports results back to Worker

#### Frontend Dashboard (Vite + React PWA)
- Shows task list, statuses, plan preview
- Feedback/revision interface for plans
- Approve/reject controls
- MR links and status per repo
- Worktree management (view, cleanup)
- Push notification subscription

### 8.2 Why Daemon Instead of CI Runners

- Opencode is already configured on Andriy's machine (providers, keys, settings)
- Complex setup that's hard to replicate in ephemeral CI
- GitLab CI configuration is cumbersome
- Dev machine has all repos already cloned
- Code supports both modes; daemon mode for MVP, CI runner mode later

---

## 9. Technology Stack

### 9.1 Monorepo Structure
- **Bun** — package manager, scripts, workspaces
- **TypeScript** — everywhere
- Shared types in `packages/shared`

### 9.2 Frontend
- Vite + React
- TanStack: Router, Query, Table, Form
- shadcn/ui: UI component library (Card, Button, Badge, etc.)
- Tailwind CSS v4 with CSS variables for theming
- PWA with Service Worker (for push notifications)
- `better-auth` for GitLab OAuth

### 9.3 Backend (Cloudflare Worker)
- Cloudflare Workers + Wrangler
- Hono (HTTP framework)
- D1 (database)
- Web Push (notifications)

### 9.4 Daemon
- Bun CLI package
- `@opencode-ai/sdk` for opencode control
- GitLab API client
- Git CLI for worktree management

### 9.5 External Services
- **ClickUp API** — task source (read-only)
- **GitLab.com** — source control, MRs
- **Opencode** — AI coding agent
- **Tailscale** — secure networking

---

## 10. Repository Structure (Bun Workspaces)

```
/taskwatch
  package.json
  bun.lockb
  apps/
    web2/                   # Vite React PWA with shadcn/ui
      package.json
      vite.config.ts
      components.json       # shadcn/ui config
      src/
        components/
          ui/               # shadcn/ui components
        routes/             # TanStack Router pages
        service-worker.ts   # Push notifications
    api/                    # Cloudflare Worker
      package.json
      wrangler.jsonc
      src/
      migrations/
    daemon/                 # Bun CLI for dev machine
      package.json
      src/
  packages/
    shared/                 # Types, schemas, API contracts
      package.json
      src/
```

---

## 11. Backend Specification (Cloudflare Worker)

### 11.1 Responsibilities
- ClickUp polling (read-only, scheduled)
- Task normalization + storage
- Plan storage + versioning
- Job queue for daemon
- Run management & status transitions
- Receiving daemon callbacks
- Receiving GitLab webhooks
- Web Push notifications
- Serving dashboard API

### 11.2 Authentication

**Dashboard Access:**
- Tailscale network restriction (network = first auth layer)
- GitLab OAuth via `better-auth` (primary login)
- Email whitelist (authorized emails)
- ClickUp OAuth connection (linked to user) for task syncing

**Internal Endpoints:**
- `/webhooks/gitlab` — GitLab signature verification
- `/internal/*` — Daemon auth token

### 11.3 Data Model (D1)

#### `tasks`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | Internal ID |
| `user_id` | TEXT | Dashboard user ID (Better Auth user) |
| `clickup_task_id` | TEXT | ClickUp task ID |
| `title` | TEXT | Task title |
| `description_md` | TEXT | Task description (markdown) |
| `clickup_status` | TEXT | Status in ClickUp |
| `assignee_id` | TEXT | ClickUp assignee ID |
| `url` | TEXT | ClickUp task URL |
| `status` | TEXT | TaskWatch status (state machine) |
| `updated_at_clickup` | DATETIME | Last update in ClickUp |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

Uniqueness: `(user_id, clickup_task_id)`

#### `plans`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | |
| `task_id` | TEXT FK | |
| `version` | INT | Plan version number |
| `assumptions` | TEXT | Markdown |
| `approach` | TEXT | Markdown |
| `file_changes` | TEXT | JSON: per-repo file list |
| `status` | TEXT | PENDING / APPROVED / CHANGES_REQUESTED |
| `approved_at` | DATETIME | |
| `created_at` | DATETIME | |

#### `plan_feedback`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | |
| `plan_id` | TEXT FK | |
| `content` | TEXT | Feedback text |
| `created_at` | DATETIME | |

#### `runs`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | |
| `task_id` | TEXT FK | |
| `type` | TEXT | PLAN / IMPLEMENT |
| `status` | TEXT | QUEUED / RUNNING / SUCCEEDED / FAILED |
| `started_at` | DATETIME | |
| `finished_at` | DATETIME | |
| `logs` | TEXT | Streamed logs from daemon |
| `error_summary` | TEXT | If failed |

#### `merge_requests`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | |
| `task_id` | TEXT FK | |
| `repo_name` | TEXT | e.g., "dashboard-v2" |
| `branch_name` | TEXT | |
| `mr_url` | TEXT | GitLab MR URL |
| `mr_iid` | INT | GitLab MR IID |
| `status` | TEXT | OPEN / MERGED / CLOSED |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

#### `worktrees`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | |
| `task_id` | TEXT FK | |
| `repo_name` | TEXT | |
| `path` | TEXT | Local path on daemon machine |
| `branch_name` | TEXT | |
| `created_at` | DATETIME | |

#### `push_subscriptions`
| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT PK | |
| `user_email` | TEXT | |
| `endpoint` | TEXT | Web Push endpoint |
| `keys` | TEXT | JSON: p256dh, auth |
| `created_at` | DATETIME | |

#### `settings`
| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT PK | |
| `value` | TEXT | JSON value |

### 11.4 API Endpoints

#### Public (Dashboard)
```
GET  /api/health
GET  /api/tasks
GET  /api/tasks/:taskId
GET  /api/tasks/:taskId/plans
GET  /api/tasks/:taskId/plans/:planId
POST /api/tasks/:taskId/plan/generate    # Manual trigger
POST /api/plans/:planId/feedback         # Add feedback, triggers revision
POST /api/plans/:planId/approve          # Approve plan
POST /api/tasks/:taskId/implement        # Trigger implementation
GET  /api/tasks/:taskId/runs
GET  /api/tasks/:taskId/merge-requests
GET  /api/worktrees                      # List all worktrees
DELETE /api/worktrees/:worktreeId        # Request cleanup

POST /api/push/subscribe                 # Register push subscription
DELETE /api/push/unsubscribe
```

#### Internal (Daemon)
```
GET  /internal/jobs/poll                 # Daemon polls for work
POST /internal/jobs/:jobId/claim         # Daemon claims a job
POST /internal/jobs/:jobId/progress      # Stream logs/status
POST /internal/jobs/:jobId/complete      # Report completion
POST /internal/jobs/:jobId/fail          # Report failure
POST /internal/worktrees                 # Register worktree
DELETE /internal/worktrees/:id           # Confirm cleanup
```

#### Webhooks
```
POST /webhooks/gitlab                    # MR events
```

### 11.5 ClickUp Polling Strategy

- Cron trigger: every 5 minutes
- For each authorized dashboard user:
  - Retrieve their ClickUp OAuth access token from D1 (`accounts` table via better-auth)
  - For each enabled ClickUp Workspace: fetch tasks assigned to that ClickUp user, status in (todo, in progress)
- Read task comments for additional context
- Upsert into `tasks` table scoped by `user_id`
- For new/updated tasks: check if re-planning needed

**Idempotency:**
- Use `updated_at_clickup` + content hash
- Don't re-plan if task content unchanged and plan already approved

### 11.6 Push Notifications

Events that trigger push:
1. **Plan ready** — "Plan ready for review: [task title]"
2. **Implementation complete** — "MR created for: [task title]"
3. **Agent blocked** — "Agent needs help with: [task title]"

Implementation:
- Store VAPID keys in Cloudflare secrets
- Use Web Push protocol from Worker
- Subscription stored in D1

---

## 12. Frontend Specification (Vite + React + TanStack)

### 12.1 Pages (TanStack Router)

| Path | Description |
|------|-------------|
| `/` | Dashboard overview: pending reviews, active implementations, recent activity |
| `/tasks` | Task list with filters (status, has plan, has MR) |
| `/tasks/:id` | Task detail: description, plan versions, feedback thread, MRs, runs |
| `/worktrees` | Worktree management: list, disk usage, cleanup actions |
| `/settings` | Push notification toggle, preferences |

### 12.2 Task Detail Page

Sections:
1. **ClickUp Info** — title, description, status, link to ClickUp
2. **Plan** — current version with:
   - Assumptions (markdown)
   - Approach (markdown)
   - File changes (git status style per repo)
3. **Feedback Thread** — conversation trail of feedback + revisions
4. **Actions** — "Add Feedback", "Approve Plan", "Implement"
5. **Merge Requests** — per-repo MR status with links
6. **Run History** — logs, timestamps, outcomes

### 12.3 Plan Display Format

```markdown
## Assumptions
- User authentication is handled by existing auth middleware
- Export format is CSV only for MVP

## Approach
Add an export button to the reports page that triggers a backend
endpoint to generate CSV. The endpoint streams the response to
handle large datasets.

## File Changes

### dashboard-v2
M  src/pages/Reports.tsx
A  src/components/ExportButton.tsx
A  src/hooks/useExport.ts

### go.charidy.com
M  routes/reports.go
A  handlers/export.go
A  services/csv_generator.go
```

### 12.4 Data Fetching (TanStack Query)

Query keys:
- `['tasks']`
- `['tasks', taskId]`
- `['tasks', taskId, 'plans']`
- `['tasks', taskId, 'runs']`
- `['tasks', taskId, 'merge-requests']`
- `['worktrees']`

Mutations:
- `generatePlan`
- `submitFeedback`
- `approvePlan`
- `triggerImplementation`
- `deleteWorktree`

### 12.5 PWA & Push Notifications

- Service Worker for offline support and push
- Push subscription stored in D1
- Notification click opens relevant task page

---

## 13. Daemon Specification (Bun CLI)

### 13.1 Overview

The daemon runs on Andriy's dev machine, connected to the Cloudflare Worker via Tailscale. It:
- Polls for pending jobs
- Manages git worktrees
- Controls opencode sessions
- Creates GitLab merge requests
- Reports results back to Worker

### 13.2 Configuration

```jsonc
// ~/.config/taskwatch/config.json
{
  "worktreeRoot": "~/agent-worktrees",
  "sourceRepos": {
    "dashboard-v2": "~/src/charidy/dashboard-v2",
    "go.charidy.com": "~/src/charidy/go.charidy.com",
    // ... other repos
  },
  "gitlabToken": "env:GITLAB_TOKEN",
  "orchestratorUrl": "https://taskwatch-api.<domain>",
  "orchestratorToken": "env:TASKWATCH_TOKEN",
  "pollIntervalSeconds": 10,
  "opencode": {
    "hostname": "127.0.0.1",
    "port": 4096
  }
}
```

### 13.3 Job Types

#### Plan Job
```typescript
interface PlanJob {
  type: 'plan'
  taskId: string
  task: {
    title: string
    description: string
    comments: string[]
    clickupUrl: string
  }
  previousPlan?: {
    assumptions: string
    approach: string
    feedback: string  // Latest feedback if revision
  }
}
```

#### Implement Job
```typescript
interface ImplementJob {
  type: 'implement'
  taskId: string
  plan: {
    assumptions: string
    approach: string
    fileChanges: Record<string, string[]>  // repo -> files
  }
  repos: string[]  // Which repos to work on
}
```

### 13.4 Worktree Management

Structure:
```
~/agent-worktrees/
  TASK-123/
    dashboard-v2/        # git worktree
    go.charidy.com/      # git worktree
  TASK-456/
    donate.charidy.com/
```

Operations:
1. **Create**: `git worktree add <path> -b <branch>` from source repo
2. **List**: Scan worktreeRoot, report to Worker
3. **Cleanup**: `git worktree remove <path>`, triggered via dashboard

Branch naming: `taskwatch/<taskId>-<slug>`

### 13.5 Opencode Integration

Using `@opencode-ai/sdk`:

```typescript
import { createOpencode } from '@opencode-ai/sdk'

// For multi-repo task, start opencode in parent directory
const workDir = `~/agent-worktrees/${taskId}`
const opencode = await createOpencode({
  hostname: config.opencode.hostname,
  port: config.opencode.port,
})

// Create session
const session = await opencode.client.session.create({
  body: { title: `Task ${taskId}` }
})

// Subscribe to events for streaming logs
const events = await opencode.client.event.subscribe()

// Send implementation prompt
const prompt = buildPrompt(plan, repos)
await opencode.client.session.prompt({
  path: { id: session.id },
  body: {
    parts: [{ type: 'text', text: prompt }]
  }
})

// Stream events to Worker
for await (const event of events.stream) {
  await reportProgress(jobId, event)
}
```

Prompt structure:
```
Implement the following plan.

Working directories:
- ./dashboard-v2
- ./go.charidy.com

## Plan

### Assumptions
[assumptions from approved plan]

### Approach
[approach from approved plan]

### Expected File Changes
[file list from approved plan]

Create all necessary changes. Run tests before completing.
If you cannot complete something, explain what's blocking.
```

### 13.6 GitLab MR Creation

For each affected repo:

```typescript
import { Gitlab } from '@gitbeaker/node'

const gl = new Gitlab({ token: config.gitlabToken })

// Push branch
await exec(`git push -u origin ${branchName}`, { cwd: worktreePath })

// Create MR
const mr = await gl.MergeRequests.create(
  projectId,
  branchName,
  'develop',  // Target branch
  {
    title: `[TaskWatch] ${taskTitle}`,
    description: buildMRDescription(plan, taskId),
    draft: true,  // Always draft for partial work
    assigneeId: andriyGitlabId,
  }
)
```

### 13.7 Error Handling

| Scenario | Action |
|----------|--------|
| Opencode crashes/times out | Report failure, wipe worktree on retry |
| Tests fail | Create draft MR anyway with failure note |
| Partial completion | Create draft MR, note what's incomplete |
| GitLab API error | Report failure, preserve worktree for manual intervention |

On failure, daemon:
1. Reports failure to Worker with error details
2. Worktree preserved for manual inspection
3. User can trigger retry (wipes and starts fresh) or fix manually

### 13.8 Daemon Commands

```bash
# Start daemon (foreground)
taskwatch-daemon start

# Start daemon (background)
taskwatch-daemon start --daemon

# Stop daemon
taskwatch-daemon stop

# Check status
taskwatch-daemon status

# List local worktrees
taskwatch-daemon worktrees

# Cleanup specific worktree
taskwatch-daemon cleanup <taskId>
```

---

## 14. GitLab Integration

### 14.1 Authentication

MVP: **Project Access Token** per repository
- Scoped to specific project
- Permissions: `api`, `write_repository`
- Stored in daemon config

Future: **Bot user account** for cleaner audit trail

### 14.2 Webhooks

GitLab webhook → Cloudflare Worker:
- Event: Merge Request events
- Trigger: state change (merged, closed)

Worker updates `merge_requests` table, checks if all MRs for task are merged → mark task DONE.

### 14.3 Branch Protection

All repos have protected `develop` branch:
- No direct pushes
- MR required
- CI checks must pass

Agent always creates MR targeting `develop`, never pushes directly.

---

## 15. Security

### 15.1 Threat Model

Low risk environment:
- Trusted team (no malicious task content expected)
- No production secrets in repositories (dev credentials only)
- All changes reviewed via MR before merge

### 15.2 Access Controls

| Resource | Protection |
|----------|------------|
| Dashboard | Tailscale + GitLab OAuth + email whitelist |
| Worker internal APIs | Bearer token |
| GitLab webhooks | Signature verification |
| ClickUp | OAuth (user-linked), read-only by convention |
| GitLab | Project access tokens (scoped) |

### 15.3 Secrets Management

| Secret | Location |
|--------|----------|
| ClickUp OAuth client secret | Cloudflare secrets |
| ClickUp OAuth user tokens | D1 (`accounts` table via better-auth) |
| GitLab tokens | Daemon local config (env vars) |
| VAPID keys (push) | Cloudflare secrets |
| Daemon auth token | Cloudflare secrets + daemon config |
| GitLab OAuth client secret | Cloudflare secrets |
| Better Auth secret | Cloudflare secrets |

---

## 16. Observability

### 16.1 Logging

- **Worker**: Structured logging (request ID, task ID, job ID)
- **Daemon**: Logs streamed to Worker, stored in `runs.logs`
- **Opencode**: Session logs captured via event stream

### 16.2 Metrics (Future)

- Tasks processed per day
- Plan approval rate
- Time from task → MR
- Implementation success rate

### 16.3 Dashboard Visibility

- Task states visible at a glance
- Run logs accessible per task
- Worktree status (which tasks have active worktrees)
- Daemon online/offline indicator

---

## 17. Testing Strategy

### 17.1 Backend (Worker)
- Unit tests: ClickUp normalization, state transitions, webhook verification
- Integration tests: D1 local, API endpoints

### 17.2 Frontend
- Component tests: task list, plan display, feedback form
- E2E tests: critical flows (view task → add feedback → approve)

### 17.3 Daemon
- Unit tests: worktree management, prompt building
- Integration tests: opencode SDK mocking
- Manual testing: full flow with real opencode

---

## 18. MVP Milestones

### Milestone 1: Foundation ✅
- [x] Monorepo setup (Bun workspaces)
- [x] Cloudflare Worker with D1 + Hono
- [x] D1 schema with all tables (tasks, plans, runs, MRs, worktrees, push_subscriptions)
- [x] ClickUp polling service (read-only, 5-min cron)
- [x] Basic dashboard (Vite + React + TanStack Router/Query)
- [x] Task list and task detail pages
- [x] Daemon structure with job polling, git worktree, GitLab MR, opencode clients

### Milestone 2: End-to-End Planning Flow ✅
- [x] Authentication: better-auth with GitLab OAuth
- [x] Daemon: test connection to orchestrator API
- [x] Daemon: implement plan job execution with opencode
- [x] Dashboard: manual "Generate Plan" trigger working end-to-end
- [x] Dashboard: plan display with assumptions, approach, file changes
- [x] Dashboard: feedback submission triggers re-planning
- [x] Dashboard: plan approval flow
- [x] Real-time: run status polling/refresh in dashboard
- [x] Daemon heartbeat and online/offline status in dashboard

### Milestone 3: Implementation Flow
- [ ] Daemon: implement job execution with opencode
- [ ] Daemon: git commit and push to branch
- [ ] Daemon: GitLab MR creation with plan summary
- [ ] Dashboard: implementation trigger after plan approval
- [ ] Dashboard: MR links display with status
- [ ] Error handling: partial failures, draft MRs

### Milestone 4: Completion Loop
- [ ] GitLab webhook receiver for MR events
- [ ] Auto-update MR status (open → merged/closed)
- [ ] Task auto-transition to DONE when all MRs merged
- [ ] Worktree cleanup triggers from dashboard
- [ ] Daemon: worktree removal command

### Milestone 5: Notifications & Polish
- [ ] Web Push: VAPID key generation and storage
- [ ] Web Push: subscription management in dashboard
- [ ] Web Push: notifications for plan ready, MR created, blocked
- [x] Daemon status indicator in dashboard (heartbeat) - moved to M2
- [ ] Error recovery improvements
- [ ] Run logs viewer with streaming

---

## 19. Acceptance Criteria

- [ ] System detects eligible ClickUp tasks per connected user (assigned to that ClickUp user, status todo/in-progress)
- [ ] For eligible task: plan generated with assumptions, approach, file list
- [ ] User can review plan in dashboard, add feedback, approve
- [ ] Feedback triggers immediate plan revision with conversation trail
- [ ] User can connect ClickUp via OAuth and select Workspaces to sync
- [ ] After approval: implementation runs via opencode
- [ ] Separate MR created per affected repository, targeting `develop`
- [ ] Task shows all MR statuses; DONE only when all merged
- [ ] Push notification received on mobile when plan ready / MR created / blocked
- [ ] No direct pushes to protected branches by agent
- [ ] All data traceable in dashboard

---

## 20. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| **LLM produces incorrect plan** | Human approval gate; explicit assumptions catch misunderstandings |
| **Large task scope** | Agent flags complexity in plan; reviewer can reject and handle manually |
| **Opencode fails mid-implementation** | Create draft MR with partial work; preserve worktree for manual fix |
| **ClickUp API rate limits** | 5-minute poll interval; delta sync; backoff on 429 |
| **Wrong workspace synced** | Sync only explicitly enabled Workspaces; show connected Workspaces in Settings |
| **Daemon machine offline** | Jobs queue; dashboard shows "agent offline"; no data loss |
| **Cross-repo dependencies** | Unified plan ensures coherent approach; one opencode session sees all changes |
| **Secrets in code** | Low risk (dev credentials only); future: add pre-commit scanning |

---

## 21. Configuration Reference

### Environment Variables (Worker)

```bash
# Better Auth
BETTER_AUTH_SECRET=         # Used for signing/encryption (required in production)
GITLAB_OAUTH_CLIENT_ID=     # GitLab OAuth (login)
GITLAB_OAUTH_CLIENT_SECRET= # GitLab OAuth (login)

# ClickUp OAuth (connected per dashboard user)
CLICKUP_OAUTH_CLIENT_ID=     # ClickUp OAuth app client_id
CLICKUP_OAUTH_CLIENT_SECRET= # ClickUp OAuth app secret

# Infra / internal
GITLAB_WEBHOOK_SECRET=      # For webhook verification
DAEMON_AUTH_TOKEN=          # Daemon authentication
VAPID_PUBLIC_KEY=           # Web Push
VAPID_PRIVATE_KEY=          # Web Push
AUTH_EMAIL_WHITELIST=       # Comma-separated emails
```

ClickUp OAuth redirect URL (configure in ClickUp app):
- `http://localhost:8787/api/auth/oauth2/callback/clickup` (dev)
- `https://<worker-domain>/api/auth/oauth2/callback/clickup` (prod)

### Daemon Config

```jsonc
{
  "worktreeRoot": "~/agent-worktrees",
  "sourceRepos": {
    "admin.charidy.com": "~/src/charidy/admin.charidy.com",
    "customview": "~/src/charidy/customview",
    "dashboard-v2": "~/src/charidy/dashboard-v2",
    "dashboard.charidy.com": "~/src/charidy/dashboard.charidy.com",
    "donate.charidy.com": "~/src/charidy/donate.charidy.com",
    "donate2": "~/src/charidy/donate2",
    "go.charidy.com": "~/src/charidy/go.charidy.com",
    "ssr": "~/src/charidy/ssr",
    "ssr2": "~/src/charidy/ssr2"
  },
  "baseBranch": "develop",
  "orchestratorUrl": "https://taskwatch-api.example.com",
  "pollIntervalSeconds": 10
}
```

---

## 23. Future Enhancements

- [ ] ClickUp webhooks (reduce polling)
- [ ] ClickUp write-back (update status, add MR links as comments)
- [ ] Roles/permissions (viewer vs approver)
- [ ] CI runner mode (ephemeral runners instead of daemon)
- [ ] Auto-split large tasks into subtasks
- [ ] Pre-commit secret scanning
- [ ] Automatic architecture diagrams from plan
- [ ] Smarter re-planning on task reopening
- [ ] Metrics dashboard
- [ ] Slack/Telegram notifications (in addition to push)
