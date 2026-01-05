DROP TABLE IF EXISTS plan_feedback;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS runs;
DROP TABLE IF EXISTS merge_requests;
DROP TABLE IF EXISTS worktrees;
DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    clickup_task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description_md TEXT,
    clickup_status TEXT NOT NULL,
    assignee_id TEXT,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    updated_at_clickup TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, clickup_task_id)
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);

CREATE TABLE plans (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    version INTEGER NOT NULL,
    assumptions TEXT NOT NULL,
    approach TEXT NOT NULL,
    file_changes TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    approved_at TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_plans_task_id ON plans(task_id);
CREATE INDEX idx_plans_status ON plans(status);

CREATE TABLE plan_feedback (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_plan_feedback_plan_id ON plan_feedback(plan_id);

CREATE TABLE runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED',
    started_at TEXT,
    finished_at TEXT,
    logs TEXT,
    error_summary TEXT
);

CREATE INDEX idx_runs_task_id ON runs(task_id);
CREATE INDEX idx_runs_status ON runs(status);

CREATE TABLE merge_requests (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    repo_name TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    mr_url TEXT NOT NULL,
    mr_iid INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_merge_requests_task_id ON merge_requests(task_id);
CREATE INDEX idx_merge_requests_status ON merge_requests(status);
CREATE INDEX idx_merge_requests_mr_iid ON merge_requests(mr_iid, repo_name);

CREATE TABLE worktrees (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    repo_name TEXT NOT NULL,
    path TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_worktrees_task_id ON worktrees(task_id);

CREATE TABLE clickup_enabled_workspaces (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clickup_team_id TEXT NOT NULL,
    team_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, clickup_team_id)
);

CREATE INDEX idx_clickup_enabled_workspaces_user ON clickup_enabled_workspaces(user_id);
