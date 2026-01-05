import type {
	ApprovePlanResponse,
	GeneratePlanResponse,
	ImplementResponse,
	MergeRequestListResponse,
	PlanDetailResponse,
	PlanListResponse,
	RunListResponse,
	TaskDetailResponse,
	TaskListResponse,
	WorktreeListResponse,
} from '@taskwatch/shared/api'

const API_BASE = '/api'

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
	const response = await fetch(`${API_BASE}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	})

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ error: 'Request failed' }))
		throw new Error(error.error || 'Request failed')
	}

	return response.json()
}

export async function getTasks(): Promise<TaskListResponse> {
	return fetchApi('/tasks')
}

export async function getTask(taskId: string): Promise<TaskDetailResponse> {
	return fetchApi(`/tasks/${taskId}`)
}

export async function getTaskPlans(taskId: string): Promise<PlanListResponse> {
	return fetchApi(`/tasks/${taskId}/plans`)
}

export async function getTaskRuns(taskId: string): Promise<RunListResponse> {
	return fetchApi(`/tasks/${taskId}/runs`)
}

export async function getTaskMergeRequests(
	taskId: string,
): Promise<MergeRequestListResponse> {
	return fetchApi(`/tasks/${taskId}/merge-requests`)
}

export async function getPlan(planId: string): Promise<PlanDetailResponse> {
	return fetchApi(`/plans/${planId}`)
}

export async function generatePlan(
	taskId: string,
): Promise<GeneratePlanResponse> {
	return fetchApi(`/tasks/${taskId}/plan/generate`, { method: 'POST' })
}

export async function submitFeedback(
	planId: string,
	content: string,
): Promise<void> {
	await fetchApi(`/plans/${planId}/feedback`, {
		method: 'POST',
		body: JSON.stringify({ content }),
	})
}

export async function approvePlan(
	planId: string,
): Promise<ApprovePlanResponse> {
	return fetchApi(`/plans/${planId}/approve`, { method: 'POST' })
}

export async function triggerImplementation(
	taskId: string,
): Promise<ImplementResponse> {
	return fetchApi(`/tasks/${taskId}/implement`, { method: 'POST' })
}

export async function getWorktrees(): Promise<WorktreeListResponse> {
	return fetchApi('/worktrees')
}

export async function deleteWorktree(worktreeId: string): Promise<void> {
	await fetchApi(`/worktrees/${worktreeId}`, { method: 'DELETE' })
}

export async function subscribePush(
	subscription: PushSubscription,
): Promise<void> {
	const json = subscription.toJSON()
	await fetchApi('/push/subscribe', {
		method: 'POST',
		body: JSON.stringify({
			endpoint: json.endpoint,
			keys: json.keys,
		}),
	})
}

export async function unsubscribePush(endpoint: string): Promise<void> {
	await fetchApi('/push/unsubscribe', {
		method: 'DELETE',
		body: JSON.stringify({ endpoint }),
	})
}

export interface DaemonStatusResponse {
	status: {
		id: string
		daemonId: string
		lastHeartbeat: string
		status: string
		createdAt: string
		updatedAt: string
	} | null
	online: boolean
}

export async function getDaemonStatus(): Promise<DaemonStatusResponse> {
	return fetchApi('/daemon/status')
}
