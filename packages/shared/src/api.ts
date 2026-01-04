import type {
	FileChanges,
	MergeRequest,
	Plan,
	PlanFeedback,
	Run,
	TaskWithDetails,
	Worktree,
} from './types'

export interface ApiResponse<T> {
	data?: T
	error?: string
}

export interface PaginatedResponse<T> {
	data: T[]
	total: number
	page: number
	pageSize: number
}

export interface TaskListResponse {
	tasks: TaskWithDetails[]
}

export interface TaskDetailResponse {
	task: TaskWithDetails
}

export interface PlanListResponse {
	plans: Plan[]
}

export interface PlanDetailResponse {
	plan: Plan & { feedback: PlanFeedback[] }
}

export interface RunListResponse {
	runs: Run[]
}

export interface MergeRequestListResponse {
	mergeRequests: MergeRequest[]
}

export interface WorktreeListResponse {
	worktrees: Worktree[]
}

export interface GeneratePlanResponse {
	runId: string
}

export interface ApprovePlanResponse {
	success: boolean
}

export interface ImplementResponse {
	runId: string
}

export interface JobPollResponse {
	job: {
		id: string
		type: 'plan' | 'implement'
		payload: unknown
	} | null
}

export interface PlanJobPayload {
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

export interface ImplementJobPayload {
	taskId: string
	plan: {
		assumptions: string
		approach: string
		fileChanges: FileChanges
	}
	repos: string[]
}
