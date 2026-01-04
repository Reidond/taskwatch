import { SubmitFeedbackRequestSchema } from '@taskwatch/shared/schemas'
import { Hono } from 'hono'
import { fetchTaskComments } from '../services/clickup'
import {
	createFeedback,
	createRun,
	getFeedbackByPlanId,
	getPlanById,
	getTaskById,
	updatePlanStatus,
	updateTaskStatus,
} from '../services/db'
import type { Env } from '../types'

export const plansRoutes = new Hono<{ Bindings: Env }>()

plansRoutes.get('/:planId', async (c) => {
	const planId = c.req.param('planId')
	const plan = await getPlanById(c.env.DB, planId)

	if (!plan) {
		return c.json({ error: 'Plan not found' }, 404)
	}

	const feedback = await getFeedbackByPlanId(c.env.DB, planId)

	return c.json({ plan: { ...plan, feedback } })
})

plansRoutes.post('/:planId/feedback', async (c) => {
	const planId = c.req.param('planId')
	const plan = await getPlanById(c.env.DB, planId)

	if (!plan) {
		return c.json({ error: 'Plan not found' }, 404)
	}

	const body = await c.req.json()
	const parsed = SubmitFeedbackRequestSchema.safeParse(body)

	if (!parsed.success) {
		return c.json(
			{ error: 'Invalid request body', details: parsed.error.issues },
			400,
		)
	}

	await createFeedback(c.env.DB, {
		planId,
		content: parsed.data.content,
	})

	await updatePlanStatus(c.env.DB, planId, 'CHANGES_REQUESTED')

	const task = await getTaskById(c.env.DB, plan.taskId)
	if (task) {
		await updateTaskStatus(c.env.DB, plan.taskId, 'PLAN_REVISION')

		const _comments = await fetchTaskComments(c.env, task.clickupTaskId)

		await createRun(c.env.DB, {
			taskId: plan.taskId,
			type: 'PLAN',
			status: 'QUEUED',
			startedAt: new Date().toISOString(),
			finishedAt: null,
			logs: null,
			errorSummary: null,
		})

		await updateTaskStatus(c.env.DB, plan.taskId, 'PLANNING')
	}

	return c.json({ success: true })
})

plansRoutes.post('/:planId/approve', async (c) => {
	const planId = c.req.param('planId')
	const plan = await getPlanById(c.env.DB, planId)

	if (!plan) {
		return c.json({ error: 'Plan not found' }, 404)
	}

	if (plan.status === 'APPROVED') {
		return c.json({ error: 'Plan already approved' }, 400)
	}

	const now = new Date().toISOString()
	await updatePlanStatus(c.env.DB, planId, 'APPROVED', now)
	await updateTaskStatus(c.env.DB, plan.taskId, 'PLAN_APPROVED')

	return c.json({ success: true })
})
