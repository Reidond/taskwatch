import type { DaemonConfig } from '@taskwatch/shared/types'
import { OrchestratorClient, isImplementJob, isPlanJob } from './api'
import { GitManager } from './git'
import { GitLabClient } from './gitlab'
import { OpencodeClient } from './opencode'

export class Daemon {
	private config: DaemonConfig
	private orchestrator: OrchestratorClient
	private git: GitManager
	private gitlab: GitLabClient
	private opencode: OpencodeClient
	private running = false
	private daemonId: string

	constructor(config: DaemonConfig) {
		this.config = config
		this.orchestrator = new OrchestratorClient(config)
		this.git = new GitManager(config)
		this.gitlab = new GitLabClient(config)
		this.opencode = new OpencodeClient(config)
		this.daemonId = `daemon-${Date.now()}`
	}

	async start(): Promise<void> {
		this.running = true
		console.log(`[Daemon] Started with ID: ${this.daemonId}`)
		console.log(
			`[Daemon] Polling interval: ${this.config.pollIntervalSeconds}s`,
		)

		while (this.running) {
			try {
				await this.pollAndProcess()
			} catch (error) {
				console.error('[Daemon] Error during poll:', error)
			}

			await this.sleep(this.config.pollIntervalSeconds * 1000)
		}
	}

	stop(): void {
		this.running = false
		console.log('[Daemon] Stopping...')
	}

	private async pollAndProcess(): Promise<void> {
		const job = await this.orchestrator.pollForJob()

		if (!job) {
			return
		}

		console.log(`[Daemon] Found job: ${job.id} (${job.type})`)

		try {
			await this.orchestrator.claimJob(job.id, this.daemonId)
			console.log(`[Daemon] Claimed job: ${job.id}`)
		} catch (error) {
			console.log(`[Daemon] Failed to claim job (already claimed?): ${error}`)
			return
		}

		try {
			if (isPlanJob(job)) {
				await this.processPlanJob(job.id, job.payload)
			} else if (isImplementJob(job)) {
				await this.processImplementJob(job.id, job.payload)
			}
		} catch (error) {
			console.error(`[Daemon] Job ${job.id} failed:`, error)
			await this.orchestrator.failJob(
				job.id,
				error instanceof Error ? error.message : String(error),
			)
		}
	}

	private async processPlanJob(
		jobId: string,
		payload: {
			taskId: string
			task: {
				title: string
				description: string
				comments: string[]
				clickupUrl: string
			}
			previousPlan?: { assumptions: string; approach: string; feedback: string }
		},
	): Promise<void> {
		console.log(`[Daemon] Processing plan job for task: ${payload.taskId}`)

		const sessionId = await this.opencode.createSession(
			`Plan: ${payload.task.title}`,
		)
		console.log(`[Daemon] Created opencode session: ${sessionId}`)

		const prompt = this.opencode.buildPlanPrompt(payload)

		let logs = ''
		const response = await this.opencode.sendPrompt(
			sessionId,
			prompt,
			(chunk) => {
				logs += chunk
				process.stdout.write(chunk)
			},
		)

		await this.orchestrator.reportProgress(jobId, logs)

		const planResult = this.opencode.parsePlanResponse(response)

		await this.orchestrator.completeJob(jobId, planResult)
		console.log(`[Daemon] Plan job completed: ${jobId}`)
	}

	private async processImplementJob(
		jobId: string,
		payload: {
			taskId: string
			plan: {
				assumptions: string
				approach: string
				fileChanges: Record<string, string[]>
			}
			repos: string[]
		},
	): Promise<void> {
		console.log(`[Daemon] Processing implement job for task: ${payload.taskId}`)

		const repoPaths: Record<string, string> = {}

		for (const repoName of payload.repos) {
			console.log(`[Daemon] Creating worktree for ${repoName}...`)
			const { path, branchName } = await this.git.createWorktree(
				payload.taskId,
				repoName,
			)
			repoPaths[repoName] = path

			await this.orchestrator.registerWorktree(
				payload.taskId,
				repoName,
				path,
				branchName,
			)
		}

		const _taskDir = this.git.getTaskDir(payload.taskId)
		const sessionId = await this.opencode.createSession(
			`Implement: ${payload.taskId}`,
		)
		console.log(`[Daemon] Created opencode session: ${sessionId}`)

		const prompt = this.opencode.buildImplementPrompt(payload, repoPaths)

		let logs = ''
		await this.opencode.sendPrompt(sessionId, prompt, (chunk) => {
			logs += chunk
			process.stdout.write(chunk)
		})

		await this.orchestrator.reportProgress(jobId, logs)

		const commits: { repoName: string; commitHash: string; message: string }[] =
			[]
		const mergeRequests: { repoName: string; mrUrl: string; mrIid: number }[] =
			[]

		for (const repoName of payload.repos) {
			const worktreePath = repoPaths[repoName]

			console.log(`[Daemon] Committing changes in ${repoName}...`)
			const message = `[TaskWatch] ${payload.taskId}: Implementation`
			const { commitHash } = await this.git.commitAndPush(worktreePath, message)

			commits.push({ repoName, commitHash, message })

			console.log(`[Daemon] Creating MR for ${repoName}...`)
			const branchName = await this.git.getBranchName(worktreePath)
			const { mrUrl, mrIid } = await this.gitlab.createMergeRequest(
				repoName,
				branchName,
				payload.taskId,
				payload.taskId,
				payload.plan.approach,
			)

			mergeRequests.push({ repoName, mrUrl, mrIid })
			console.log(`[Daemon] Created MR: ${mrUrl}`)
		}

		await this.orchestrator.completeJob(jobId, { commits, mergeRequests })
		console.log(`[Daemon] Implement job completed: ${jobId}`)
	}

	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
}
