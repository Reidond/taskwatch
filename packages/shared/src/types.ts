/**
 * TaskWatch State Machine
 *
 * NEW → PLANNING → PLAN_READY
 * PLAN_READY → (PLAN_REVISION → PLANNING) or PLAN_APPROVED
 * PLAN_APPROVED → IMPLEMENTING → PR_READY
 * PR_READY → DONE (when all MRs merged)
 * Any state → BLOCKED (if agent needs help)
 */
export type TaskStatus =
	| 'NEW'
	| 'PLANNING'
	| 'PLAN_READY'
	| 'PLAN_REVISION'
	| 'PLAN_APPROVED'
	| 'IMPLEMENTING'
	| 'PR_READY'
	| 'DONE'
	| 'BLOCKED'

export type PlanStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED'

export type RunType = 'PLAN' | 'IMPLEMENT'

export type RunStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export type MergeRequestStatus = 'OPEN' | 'MERGED' | 'CLOSED'

// Database Models
export interface Task {
	id: string
	userId: string
	clickupTaskId: string
	title: string
	descriptionMd: string | null
	clickupStatus: string
	assigneeId: string | null
	url: string
	status: TaskStatus
	updatedAtClickup: string
	createdAt: string
	updatedAt: string
}

export interface Plan {
	id: string
	taskId: string
	version: number
	assumptions: string
	approach: string
	fileChanges: string // JSON: Record<repo, string[]>
	status: PlanStatus
	approvedAt: string | null
	createdAt: string
}

export interface PlanFeedback {
	id: string
	planId: string
	content: string
	createdAt: string
}

export interface Run {
	id: string
	taskId: string
	type: RunType
	status: RunStatus
	startedAt: string | null
	finishedAt: string | null
	logs: string | null
	errorSummary: string | null
}

export interface MergeRequest {
	id: string
	taskId: string
	repoName: string
	branchName: string
	mrUrl: string
	mrIid: number
	status: MergeRequestStatus
	createdAt: string
	updatedAt: string
}

export interface Worktree {
	id: string
	taskId: string
	repoName: string
	path: string
	branchName: string
	createdAt: string
}

export interface PushSubscription {
	id: string
	userEmail: string
	endpoint: string
	keys: string // JSON: { p256dh, auth }
	createdAt: string
}

export interface Setting {
	key: string
	value: string // JSON value
}

// API Types
export interface TaskWithDetails extends Task {
	currentPlan?: Plan | null
	mergeRequests?: MergeRequest[]
	activeRun?: Run | null
}

export interface FileChanges {
	[repoName: string]: string[]
}

export interface PlanWithFeedback extends Plan {
	feedback: PlanFeedback[]
	fileChangesParsed: FileChanges
}

// ClickUp Types
export interface ClickUpTask {
	id: string
	name: string
	description: string | null
	status: {
		status: string
	}
	assignees: Array<{
		id: number
		username: string
	}>
	url: string
	date_updated: string
}

export interface ClickUpWorkspace {
	teamId: string
	name: string
	enabled: boolean
}

// Daemon Job Types
export interface PlanJob {
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
		feedback: string
	}
}

export interface ImplementJob {
	type: 'implement'
	taskId: string
	plan: {
		assumptions: string
		approach: string
		fileChanges: FileChanges
	}
	repos: string[]
}

export type Job = PlanJob | ImplementJob

export interface JobPayload {
	id: string
	job: Job
}

// Daemon Config
export interface DaemonConfig {
	worktreeRoot: string
	sourceRepos: Record<string, string>
	baseBranch: string
	orchestratorUrl: string
	orchestratorToken: string
	gitlabToken: string
	pollIntervalSeconds: number
	opencode: {
		hostname: string
		port: number
	}
}

// Daemon Status
export type DaemonStatusType = 'online' | 'offline'

export interface DaemonStatus {
	id: string
	daemonId: string
	lastHeartbeat: string
	status: DaemonStatusType
	createdAt: string
	updatedAt: string
}
