import type {
	DaemonStatus,
	MergeRequest,
	Plan,
	PlanFeedback,
	PushSubscription,
	Run,
	Task,
	TaskWithDetails,
	Worktree,
} from '@taskwatch/shared/types'

export async function getTasks(db: D1Database): Promise<TaskWithDetails[]> {
	const tasks = await db
		.prepare('SELECT * FROM tasks ORDER BY updated_at DESC')
		.all<Task>()

	const result: TaskWithDetails[] = []
	for (const task of tasks.results) {
		const plan = await db
			.prepare(
				'SELECT * FROM plans WHERE task_id = ? ORDER BY version DESC LIMIT 1',
			)
			.bind(task.id)
			.first<Plan>()

		const mrs = await db
			.prepare('SELECT * FROM merge_requests WHERE task_id = ?')
			.bind(task.id)
			.all<MergeRequest>()

		const activeRun = await db
			.prepare(
				`SELECT * FROM runs WHERE task_id = ? AND status IN ('QUEUED', 'RUNNING') ORDER BY started_at DESC LIMIT 1`,
			)
			.bind(task.id)
			.first<Run>()

		result.push({
			...mapTaskFromDb(task),
			currentPlan: plan ? mapPlanFromDb(plan) : null,
			mergeRequests: mrs.results.map(mapMergeRequestFromDb),
			activeRun: activeRun ? mapRunFromDb(activeRun) : null,
		})
	}

	return result
}

export async function getTaskById(
	db: D1Database,
	id: string,
): Promise<TaskWithDetails | null> {
	const task = await db
		.prepare('SELECT * FROM tasks WHERE id = ?')
		.bind(id)
		.first<Task>()
	if (!task) return null

	const plan = await db
		.prepare(
			'SELECT * FROM plans WHERE task_id = ? ORDER BY version DESC LIMIT 1',
		)
		.bind(id)
		.first<Plan>()

	const mrs = await db
		.prepare('SELECT * FROM merge_requests WHERE task_id = ?')
		.bind(id)
		.all<MergeRequest>()

	const activeRun = await db
		.prepare(
			`SELECT * FROM runs WHERE task_id = ? AND status IN ('QUEUED', 'RUNNING') ORDER BY started_at DESC LIMIT 1`,
		)
		.bind(id)
		.first<Run>()

	return {
		...mapTaskFromDb(task),
		currentPlan: plan ? mapPlanFromDb(plan) : null,
		mergeRequests: mrs.results.map(mapMergeRequestFromDb),
		activeRun: activeRun ? mapRunFromDb(activeRun) : null,
	}
}

export async function getTaskByClickUpId(
	db: D1Database,
	clickupTaskId: string,
): Promise<Task | null> {
	const task = await db
		.prepare('SELECT * FROM tasks WHERE clickup_task_id = ?')
		.bind(clickupTaskId)
		.first<Task>()
	return task ? mapTaskFromDb(task) : null
}

export async function upsertTask(
	db: D1Database,
	task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
): Promise<Task> {
	const now = new Date().toISOString()
	const existing = await getTaskByClickUpId(db, task.clickupTaskId)

	if (existing) {
		await db
			.prepare(
				`UPDATE tasks SET 
					title = ?, description_md = ?, clickup_status = ?, 
					assignee_id = ?, url = ?, updated_at_clickup = ?, updated_at = ?
				WHERE id = ?`,
			)
			.bind(
				task.title,
				task.descriptionMd,
				task.clickupStatus,
				task.assigneeId,
				task.url,
				task.updatedAtClickup,
				now,
				existing.id,
			)
			.run()

		return { ...existing, ...task, updatedAt: now }
	}

	const id = task.id || crypto.randomUUID()
	await db
		.prepare(
			`INSERT INTO tasks (id, clickup_task_id, title, description_md, clickup_status, assignee_id, url, status, updated_at_clickup, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			task.clickupTaskId,
			task.title,
			task.descriptionMd,
			task.clickupStatus,
			task.assigneeId,
			task.url,
			task.status,
			task.updatedAtClickup,
			now,
			now,
		)
		.run()

	return {
		id,
		...task,
		createdAt: now,
		updatedAt: now,
	}
}

export async function updateTaskStatus(
	db: D1Database,
	id: string,
	status: Task['status'],
): Promise<void> {
	await db
		.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?')
		.bind(status, new Date().toISOString(), id)
		.run()
}

export async function getPlansByTaskId(
	db: D1Database,
	taskId: string,
): Promise<Plan[]> {
	const plans = await db
		.prepare('SELECT * FROM plans WHERE task_id = ? ORDER BY version DESC')
		.bind(taskId)
		.all<Plan>()
	return plans.results.map(mapPlanFromDb)
}

export async function getPlanById(
	db: D1Database,
	id: string,
): Promise<Plan | null> {
	const plan = await db
		.prepare('SELECT * FROM plans WHERE id = ?')
		.bind(id)
		.first<Plan>()
	return plan ? mapPlanFromDb(plan) : null
}

export async function createPlan(
	db: D1Database,
	plan: Omit<Plan, 'id' | 'createdAt'>,
): Promise<Plan> {
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	await db
		.prepare(
			`INSERT INTO plans (id, task_id, version, assumptions, approach, file_changes, status, approved_at, created_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			plan.taskId,
			plan.version,
			plan.assumptions,
			plan.approach,
			plan.fileChanges,
			plan.status,
			plan.approvedAt,
			now,
		)
		.run()

	return { id, ...plan, createdAt: now }
}

export async function updatePlanStatus(
	db: D1Database,
	id: string,
	status: Plan['status'],
	approvedAt?: string,
): Promise<void> {
	if (approvedAt) {
		await db
			.prepare('UPDATE plans SET status = ?, approved_at = ? WHERE id = ?')
			.bind(status, approvedAt, id)
			.run()
	} else {
		await db
			.prepare('UPDATE plans SET status = ? WHERE id = ?')
			.bind(status, id)
			.run()
	}
}

export async function getFeedbackByPlanId(
	db: D1Database,
	planId: string,
): Promise<PlanFeedback[]> {
	const feedback = await db
		.prepare(
			'SELECT * FROM plan_feedback WHERE plan_id = ? ORDER BY created_at ASC',
		)
		.bind(planId)
		.all<PlanFeedback>()
	return feedback.results.map(mapFeedbackFromDb)
}

export async function createFeedback(
	db: D1Database,
	feedback: Omit<PlanFeedback, 'id' | 'createdAt'>,
): Promise<PlanFeedback> {
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	await db
		.prepare(
			'INSERT INTO plan_feedback (id, plan_id, content, created_at) VALUES (?, ?, ?, ?)',
		)
		.bind(id, feedback.planId, feedback.content, now)
		.run()

	return { id, ...feedback, createdAt: now }
}

export async function getRunsByTaskId(
	db: D1Database,
	taskId: string,
): Promise<Run[]> {
	const runs = await db
		.prepare('SELECT * FROM runs WHERE task_id = ? ORDER BY started_at DESC')
		.bind(taskId)
		.all<Run>()
	return runs.results.map(mapRunFromDb)
}

export async function getRunById(
	db: D1Database,
	id: string,
): Promise<Run | null> {
	const run = await db
		.prepare('SELECT * FROM runs WHERE id = ?')
		.bind(id)
		.first<Run>()
	return run ? mapRunFromDb(run) : null
}

export async function createRun(
	db: D1Database,
	run: Omit<Run, 'id'>,
): Promise<Run> {
	const id = crypto.randomUUID()

	await db
		.prepare(
			`INSERT INTO runs (id, task_id, type, status, started_at, finished_at, logs, error_summary)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			run.taskId,
			run.type,
			run.status,
			run.startedAt,
			run.finishedAt,
			run.logs,
			run.errorSummary,
		)
		.run()

	return { id, ...run }
}

export async function updateRun(
	db: D1Database,
	id: string,
	updates: Partial<
		Pick<Run, 'status' | 'finishedAt' | 'logs' | 'errorSummary'>
	>,
): Promise<void> {
	const setClauses: string[] = []
	const values: (string | null)[] = []

	if (updates.status !== undefined) {
		setClauses.push('status = ?')
		values.push(updates.status)
	}
	if (updates.finishedAt !== undefined) {
		setClauses.push('finished_at = ?')
		values.push(updates.finishedAt)
	}
	if (updates.logs !== undefined) {
		setClauses.push('logs = ?')
		values.push(updates.logs)
	}
	if (updates.errorSummary !== undefined) {
		setClauses.push('error_summary = ?')
		values.push(updates.errorSummary)
	}

	if (setClauses.length === 0) return

	values.push(id)
	await db
		.prepare(`UPDATE runs SET ${setClauses.join(', ')} WHERE id = ?`)
		.bind(...values)
		.run()
}

export async function getQueuedRun(db: D1Database): Promise<Run | null> {
	const run = await db
		.prepare(
			`SELECT * FROM runs WHERE status = 'QUEUED' ORDER BY started_at ASC LIMIT 1`,
		)
		.first<Run>()
	return run ? mapRunFromDb(run) : null
}

export async function getMergeRequestsByTaskId(
	db: D1Database,
	taskId: string,
): Promise<MergeRequest[]> {
	const mrs = await db
		.prepare('SELECT * FROM merge_requests WHERE task_id = ?')
		.bind(taskId)
		.all<MergeRequest>()
	return mrs.results.map(mapMergeRequestFromDb)
}

export async function createMergeRequest(
	db: D1Database,
	mr: Omit<MergeRequest, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<MergeRequest> {
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	await db
		.prepare(
			`INSERT INTO merge_requests (id, task_id, repo_name, branch_name, mr_url, mr_iid, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			mr.taskId,
			mr.repoName,
			mr.branchName,
			mr.mrUrl,
			mr.mrIid,
			mr.status,
			now,
			now,
		)
		.run()

	return { id, ...mr, createdAt: now, updatedAt: now }
}

export async function updateMergeRequestStatus(
	db: D1Database,
	mrIid: number,
	repoName: string,
	status: MergeRequest['status'],
): Promise<void> {
	await db
		.prepare(
			'UPDATE merge_requests SET status = ?, updated_at = ? WHERE mr_iid = ? AND repo_name = ?',
		)
		.bind(status, new Date().toISOString(), mrIid, repoName)
		.run()
}

export async function getWorktrees(db: D1Database): Promise<Worktree[]> {
	const worktrees = await db
		.prepare('SELECT * FROM worktrees ORDER BY created_at DESC')
		.all<Worktree>()
	return worktrees.results.map(mapWorktreeFromDb)
}

export async function createWorktree(
	db: D1Database,
	worktree: Omit<Worktree, 'id' | 'createdAt'>,
): Promise<Worktree> {
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	await db
		.prepare(
			`INSERT INTO worktrees (id, task_id, repo_name, path, branch_name, created_at)
			VALUES (?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			worktree.taskId,
			worktree.repoName,
			worktree.path,
			worktree.branchName,
			now,
		)
		.run()

	return { id, ...worktree, createdAt: now }
}

export async function deleteWorktree(
	db: D1Database,
	id: string,
): Promise<void> {
	await db.prepare('DELETE FROM worktrees WHERE id = ?').bind(id).run()
}

export async function getPushSubscriptions(
	db: D1Database,
): Promise<PushSubscription[]> {
	const subs = await db
		.prepare('SELECT * FROM push_subscriptions')
		.all<PushSubscription>()
	return subs.results.map(mapPushSubscriptionFromDb)
}

export async function createPushSubscription(
	db: D1Database,
	sub: Omit<PushSubscription, 'id' | 'createdAt'>,
): Promise<PushSubscription> {
	const id = crypto.randomUUID()
	const now = new Date().toISOString()

	await db
		.prepare(
			`INSERT INTO push_subscriptions (id, user_email, endpoint, keys, created_at)
			VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(id, sub.userEmail, sub.endpoint, sub.keys, now)
		.run()

	return { id, ...sub, createdAt: now }
}

export async function deletePushSubscription(
	db: D1Database,
	endpoint: string,
): Promise<void> {
	await db
		.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
		.bind(endpoint)
		.run()
}

interface DbTask {
	id: string
	clickup_task_id: string
	title: string
	description_md: string | null
	clickup_status: string
	assignee_id: string | null
	url: string
	status: Task['status']
	updated_at_clickup: string
	created_at: string
	updated_at: string
}

function mapTaskFromDb(row: DbTask | Task): Task {
	if ('clickupTaskId' in row) return row
	return {
		id: row.id,
		clickupTaskId: row.clickup_task_id,
		title: row.title,
		descriptionMd: row.description_md,
		clickupStatus: row.clickup_status,
		assigneeId: row.assignee_id,
		url: row.url,
		status: row.status,
		updatedAtClickup: row.updated_at_clickup,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

interface DbPlan {
	id: string
	task_id: string
	version: number
	assumptions: string
	approach: string
	file_changes: string
	status: Plan['status']
	approved_at: string | null
	created_at: string
}

function mapPlanFromDb(row: DbPlan | Plan): Plan {
	if ('taskId' in row) return row
	return {
		id: row.id,
		taskId: row.task_id,
		version: row.version,
		assumptions: row.assumptions,
		approach: row.approach,
		fileChanges: row.file_changes,
		status: row.status,
		approvedAt: row.approved_at,
		createdAt: row.created_at,
	}
}

interface DbPlanFeedback {
	id: string
	plan_id: string
	content: string
	created_at: string
}

function mapFeedbackFromDb(row: DbPlanFeedback | PlanFeedback): PlanFeedback {
	if ('planId' in row) return row
	return {
		id: row.id,
		planId: row.plan_id,
		content: row.content,
		createdAt: row.created_at,
	}
}

interface DbRun {
	id: string
	task_id: string
	type: Run['type']
	status: Run['status']
	started_at: string | null
	finished_at: string | null
	logs: string | null
	error_summary: string | null
}

function mapRunFromDb(row: DbRun | Run): Run {
	if ('taskId' in row) return row
	return {
		id: row.id,
		taskId: row.task_id,
		type: row.type,
		status: row.status,
		startedAt: row.started_at,
		finishedAt: row.finished_at,
		logs: row.logs,
		errorSummary: row.error_summary,
	}
}

interface DbMergeRequest {
	id: string
	task_id: string
	repo_name: string
	branch_name: string
	mr_url: string
	mr_iid: number
	status: MergeRequest['status']
	created_at: string
	updated_at: string
}

function mapMergeRequestFromDb(
	row: DbMergeRequest | MergeRequest,
): MergeRequest {
	if ('taskId' in row) return row
	return {
		id: row.id,
		taskId: row.task_id,
		repoName: row.repo_name,
		branchName: row.branch_name,
		mrUrl: row.mr_url,
		mrIid: row.mr_iid,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

interface DbWorktree {
	id: string
	task_id: string
	repo_name: string
	path: string
	branch_name: string
	created_at: string
}

function mapWorktreeFromDb(row: DbWorktree | Worktree): Worktree {
	if ('taskId' in row) return row
	return {
		id: row.id,
		taskId: row.task_id,
		repoName: row.repo_name,
		path: row.path,
		branchName: row.branch_name,
		createdAt: row.created_at,
	}
}

interface DbPushSubscription {
	id: string
	user_email: string
	endpoint: string
	keys: string
	created_at: string
}

function mapPushSubscriptionFromDb(
	row: DbPushSubscription | PushSubscription,
): PushSubscription {
	if ('userEmail' in row) return row
	return {
		id: row.id,
		userEmail: row.user_email,
		endpoint: row.endpoint,
		keys: row.keys,
		createdAt: row.created_at,
	}
}

export async function getDaemonStatus(
	db: D1Database,
): Promise<DaemonStatus | null> {
	const row = await db
		.prepare('SELECT * FROM daemon_status WHERE id = ?')
		.bind('singleton')
		.first<DbDaemonStatus>()
	return row ? mapDaemonStatusFromDb(row) : null
}

export async function upsertDaemonStatus(
	db: D1Database,
	daemonId: string,
): Promise<DaemonStatus> {
	const now = new Date().toISOString()
	const existing = await getDaemonStatus(db)

	if (existing) {
		await db
			.prepare(
				'UPDATE daemon_status SET daemon_id = ?, last_heartbeat = ?, status = ?, updated_at = ? WHERE id = ?',
			)
			.bind(daemonId, now, 'online', now, 'singleton')
			.run()
		return {
			...existing,
			daemonId,
			lastHeartbeat: now,
			status: 'online',
			updatedAt: now,
		}
	}

	await db
		.prepare(
			'INSERT INTO daemon_status (id, daemon_id, last_heartbeat, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
		)
		.bind('singleton', daemonId, now, 'online', now, now)
		.run()

	return {
		id: 'singleton',
		daemonId,
		lastHeartbeat: now,
		status: 'online',
		createdAt: now,
		updatedAt: now,
	}
}

interface DbDaemonStatus {
	id: string
	daemon_id: string
	last_heartbeat: string
	status: 'online' | 'offline'
	created_at: string
	updated_at: string
}

function mapDaemonStatusFromDb(row: DbDaemonStatus): DaemonStatus {
	return {
		id: row.id,
		daemonId: row.daemon_id,
		lastHeartbeat: row.last_heartbeat,
		status: row.status,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}
