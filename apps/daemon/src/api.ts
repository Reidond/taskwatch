import type {
	ImplementJobPayload,
	JobPollResponse,
	PlanJobPayload,
} from '@taskwatch/shared/api'
import type { DaemonConfig } from '@taskwatch/shared/types'

export class OrchestratorClient {
	private baseUrl: string
	private token: string

	constructor(config: DaemonConfig) {
		this.baseUrl = config.orchestratorUrl
		this.token = config.orchestratorToken
	}

	private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${this.token}`,
				...options?.headers,
			},
		})

		if (!response.ok) {
			const error = await response
				.json()
				.catch(() => ({ error: 'Request failed' }))
			throw new Error(error.error || `Request failed: ${response.status}`)
		}

		return response.json()
	}

	async pollForJob(): Promise<JobPollResponse['job']> {
		const response = await this.fetch<JobPollResponse>('/internal/jobs/poll')
		return response.job
	}

	async claimJob(jobId: string, daemonId: string): Promise<void> {
		await this.fetch(`/internal/jobs/${jobId}/claim`, {
			method: 'POST',
			body: JSON.stringify({ daemonId }),
		})
	}

	async reportProgress(jobId: string, logs: string): Promise<void> {
		await this.fetch(`/internal/jobs/${jobId}/progress`, {
			method: 'POST',
			body: JSON.stringify({ logs }),
		})
	}

	async completeJob(jobId: string, result: unknown): Promise<void> {
		await this.fetch(`/internal/jobs/${jobId}/complete`, {
			method: 'POST',
			body: JSON.stringify({ result }),
		})
	}

	async failJob(
		jobId: string,
		errorSummary: string,
		logs?: string,
	): Promise<void> {
		await this.fetch(`/internal/jobs/${jobId}/fail`, {
			method: 'POST',
			body: JSON.stringify({ errorSummary, logs }),
		})
	}

	async registerWorktree(
		taskId: string,
		repoName: string,
		path: string,
		branchName: string,
	): Promise<void> {
		await this.fetch('/internal/worktrees', {
			method: 'POST',
			body: JSON.stringify({ taskId, repoName, path, branchName }),
		})
	}

	async deleteWorktree(worktreeId: string): Promise<void> {
		await this.fetch(`/internal/worktrees/${worktreeId}`, {
			method: 'DELETE',
		})
	}
}

export function isPlanJob(
	job: JobPollResponse['job'],
): job is { id: string; type: 'plan'; payload: PlanJobPayload } {
	return job?.type === 'plan'
}

export function isImplementJob(
	job: JobPollResponse['job'],
): job is { id: string; type: 'implement'; payload: ImplementJobPayload } {
	return job?.type === 'implement'
}
