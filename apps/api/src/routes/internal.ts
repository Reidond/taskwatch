import {
	ImplementResultSchema,
	JobClaimRequestSchema,
	JobCompleteRequestSchema,
	JobFailRequestSchema,
	JobProgressRequestSchema,
	PlanResultSchema,
	RegisterWorktreeRequestSchema,
} from '@taskwatch/shared/schemas'
import type { FileChanges } from '@taskwatch/shared/types'
import { Hono } from 'hono'
import { daemonAuth } from '../middleware/auth'
import { fetchTaskComments } from '../services/clickup'
import {
	createMergeRequest,
	createPlan,
	createWorktree,
	deleteWorktree,
	getFeedbackByPlanId,
	getPlansByTaskId,
	getQueuedRun,
	getRunById,
	getTaskById,
	updateRun,
	updateTaskStatus,
} from '../services/db'
import type { Env } from '../types'

export const internalRoutes = new Hono<{ Bindings: Env }>()

internalRoutes.use('/*', daemonAuth)

internalRoutes.get('/jobs/poll', async (c) => {
	const run = await getQueuedRun(c.env.DB)

	if (!run) {
		return c.json({ job: null })
	}

	const task = await getTaskById(c.env.DB, run.taskId)
	if (!task) {
		return c.json({ job: null })
	}

	if (run.type === 'PLAN') {
		const plans = await getPlansByTaskId(c.env.DB, run.taskId)
		const latestPlan = plans[0]
		let previousPlan:
			| { assumptions: string; approach: string; feedback: string }
			| undefined

		if (latestPlan) {
			const feedback = await getFeedbackByPlanId(c.env.DB, latestPlan.id)
			const latestFeedback = feedback[feedback.length - 1]
			if (latestFeedback) {
				previousPlan = {
					assumptions: latestPlan.assumptions,
					approach: latestPlan.approach,
					feedback: latestFeedback.content,
				}
			}
		}

		const comments = await fetchTaskComments(c.env, task.clickupTaskId)

		return c.json({
			job: {
				id: run.id,
				type: 'plan',
				payload: {
					taskId: task.id,
					task: {
						title: task.title,
						description: task.descriptionMd ?? '',
						comments,
						clickupUrl: task.url,
					},
					previousPlan,
				},
			},
		})
	}

	if (run.type === 'IMPLEMENT') {
		const plans = await getPlansByTaskId(c.env.DB, run.taskId)
		const approvedPlan = plans.find((p) => p.status === 'APPROVED')

		if (!approvedPlan) {
			return c.json({ job: null })
		}

		const fileChanges: FileChanges = JSON.parse(
			approvedPlan.fileChanges || '{}',
		)
		const repos = Object.keys(fileChanges)

		return c.json({
			job: {
				id: run.id,
				type: 'implement',
				payload: {
					taskId: task.id,
					plan: {
						assumptions: approvedPlan.assumptions,
						approach: approvedPlan.approach,
						fileChanges,
					},
					repos,
				},
			},
		})
	}

	return c.json({ job: null })
})

internalRoutes.post('/jobs/:jobId/claim', async (c) => {
	const jobId = c.req.param('jobId')
	const body = await c.req.json()
	const parsed = JobClaimRequestSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({ error: 'Invalid request body' }, 400)
	}

	const run = await getRunById(c.env.DB, jobId)
	if (!run) {
		return c.json({ error: 'Job not found' }, 404)
	}

	if (run.status !== 'QUEUED') {
		return c.json({ error: 'Job already claimed' }, 409)
	}

	await updateRun(c.env.DB, jobId, { status: 'RUNNING' })

	return c.json({ success: true })
})

internalRoutes.post('/jobs/:jobId/progress', async (c) => {
	const jobId = c.req.param('jobId')
	const body = await c.req.json()
	const parsed = JobProgressRequestSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({ error: 'Invalid request body' }, 400)
	}

	const run = await getRunById(c.env.DB, jobId)
	if (!run) {
		return c.json({ error: 'Job not found' }, 404)
	}

	if (parsed.data.logs) {
		const existingLogs = run.logs ?? ''
		await updateRun(c.env.DB, jobId, { logs: existingLogs + parsed.data.logs })
	}

	return c.json({ success: true })
})

internalRoutes.post('/jobs/:jobId/complete', async (c) => {
	const jobId = c.req.param('jobId')
	const body = await c.req.json()
	const parsed = JobCompleteRequestSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({ error: 'Invalid request body' }, 400)
	}

	const run = await getRunById(c.env.DB, jobId)
	if (!run) {
		return c.json({ error: 'Job not found' }, 404)
	}

	await updateRun(c.env.DB, jobId, {
		status: 'SUCCEEDED',
		finishedAt: new Date().toISOString(),
	})

	if (run.type === 'PLAN' && parsed.data.result) {
		const planResult = PlanResultSchema.safeParse(parsed.data.result)
		if (planResult.success) {
			const existingPlans = await getPlansByTaskId(c.env.DB, run.taskId)
			const newVersion = existingPlans.length + 1

			await createPlan(c.env.DB, {
				taskId: run.taskId,
				version: newVersion,
				assumptions: planResult.data.assumptions,
				approach: planResult.data.approach,
				fileChanges: JSON.stringify(planResult.data.fileChanges),
				status: 'PENDING',
				approvedAt: null,
			})

			await updateTaskStatus(c.env.DB, run.taskId, 'PLAN_READY')
		}
	}

	if (run.type === 'IMPLEMENT' && parsed.data.result) {
		const implResult = ImplementResultSchema.safeParse(parsed.data.result)
		if (implResult.success) {
			for (const mr of implResult.data.mergeRequests) {
				await createMergeRequest(c.env.DB, {
					taskId: run.taskId,
					repoName: mr.repoName,
					branchName: `taskwatch/${run.taskId}`,
					mrUrl: mr.mrUrl,
					mrIid: mr.mrIid,
					status: 'OPEN',
				})
			}

			await updateTaskStatus(c.env.DB, run.taskId, 'PR_READY')
		}
	}

	return c.json({ success: true })
})

internalRoutes.post('/jobs/:jobId/fail', async (c) => {
	const jobId = c.req.param('jobId')
	const body = await c.req.json()
	const parsed = JobFailRequestSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({ error: 'Invalid request body' }, 400)
	}

	const run = await getRunById(c.env.DB, jobId)
	if (!run) {
		return c.json({ error: 'Job not found' }, 404)
	}

	await updateRun(c.env.DB, jobId, {
		status: 'FAILED',
		finishedAt: new Date().toISOString(),
		errorSummary: parsed.data.errorSummary,
		logs: parsed.data.logs ?? run.logs,
	})

	await updateTaskStatus(c.env.DB, run.taskId, 'BLOCKED')

	return c.json({ success: true })
})

internalRoutes.post('/worktrees', async (c) => {
	const body = await c.req.json()
	const parsed = RegisterWorktreeRequestSchema.safeParse(body)

	if (!parsed.success) {
		return c.json({ error: 'Invalid request body' }, 400)
	}

	const worktree = await createWorktree(c.env.DB, parsed.data)

	return c.json({ worktree })
})

internalRoutes.delete('/worktrees/:id', async (c) => {
	const id = c.req.param('id')
	await deleteWorktree(c.env.DB, id)
	return c.json({ success: true })
})
