# DAEMON (Bun CLI)

## OVERVIEW

Local CLI that polls API for jobs, manages git worktrees, runs opencode sessions, creates GitLab MRs. Runs on dev machine with Tailscale access.

## STRUCTURE

```
src/
├── cli.ts         # Entry point, command parsing, signal handlers
├── daemon.ts      # Main Daemon class, poll loop, job dispatch
├── config.ts      # Config loading from ~/.config/taskwatch/
├── api.ts         # OrchestratorClient for API communication
├── git.ts         # GitManager: worktrees, commits, push
├── gitlab.ts      # GitLabClient: MR creation via @gitbeaker/rest
└── opencode.ts    # OpencodeClient: session management, prompts
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add CLI command | `cli.ts` | Switch on `process.argv[2]` |
| Add job type | `daemon.ts` | Add handler in `pollAndProcess()` |
| Change prompt | `opencode.ts` | `buildPlanPrompt()` / `buildImplementPrompt()` |
| Git operations | `git.ts` | Worktree create/cleanup |
| API calls | `api.ts` | OrchestratorClient methods |

## JOB TYPES

| Type | Input | Output |
|------|-------|--------|
| `plan` | task title/description | assumptions, approach, fileChanges |
| `implement` | approved plan + repos | commits, MR URLs |

## CONVENTIONS

- Config path: `~/.config/taskwatch/config.json`
- Secrets via `env:VARIABLE` syntax in config
- Worktrees: `<worktreeRoot>/<taskId>/<repoName>/`
- Branch naming: `taskwatch/<taskId>-<slug>`
- All MRs created as draft, targeting `develop`
- Logs prefixed with `[Daemon]`, `[CLI]`

## UNIQUE PATTERNS

- Polling-driven: 10s interval, optimistic job claiming
- Session-based AI: dedicated opencode session per job
- Fetch-first: always fetch before creating worktrees
- Smart commits: only commits if changes exist, returns HEAD otherwise
- JSON extraction: parses AI responses from markdown code blocks

## ANTI-PATTERNS

- Never push to develop/master directly
- Never merge MRs (human approval required)
- Never store secrets in config.json (use env vars)
