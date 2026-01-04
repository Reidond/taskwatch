-- Tasks table
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    clickup_task_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description_md TEXT,
    clickup_status TEXT NOT NULL,
    assignee_id TEXT,
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    updated_at_clickup TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_tasks_clickup_task_id ON tasks(clickup_task_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);

-- Plans table
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

-- Plan feedback table
CREATE TABLE plan_feedback (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES plans(id),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_plan_feedback_plan_id ON plan_feedback(plan_id);

-- Runs table
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

-- Merge requests table
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

-- Worktrees table
CREATE TABLE worktrees (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    repo_name TEXT NOT NULL,
    path TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_worktrees_task_id ON worktrees(task_id);

-- Push subscriptions table
CREATE TABLE push_subscriptions (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    keys TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_push_subscriptions_user_email ON push_subscriptions(user_email);

-- Settings table
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
