import { Hono } from 'hono'
import type { AuthVariables } from '../middleware/auth'
import {
	createRun,
	getFeedbackByPlanId,
	getMergeRequestsByTaskId,
	getPlansByTaskId,
	getRunsByTaskId,
	getTaskById,
	getTasks,
	updateTaskStatus,
} from '../services/db'
import type { Env } from '../types'

export const tasksRoutes = new Hono<{
	Bindings: Env
	Variables: AuthVariables
}>()

tasksRoutes.get('/', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const tasks = await getTasks(c.env.DB, session.userId)
	return c.json({ tasks })
})

tasksRoutes.get('/:taskId', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const taskId = c.req.param('taskId')
	const task = await getTaskById(c.env.DB, taskId, session.userId)

	if (!task) {
		return c.json({ error: 'Task not found' }, 404)
	}

	return c.json({ task })
})

tasksRoutes.get('/:taskId/plans', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const taskId = c.req.param('taskId')
	const task = await getTaskById(c.env.DB, taskId, session.userId)
	if (!task) {
		return c.json({ error: 'Task not found' }, 404)
	}

	const plans = await getPlansByTaskId(c.env.DB, taskId)
	return c.json({ plans })
})

tasksRoutes.get('/:taskId/runs', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const taskId = c.req.param('taskId')
	const task = await getTaskById(c.env.DB, taskId, session.userId)
	if (!task) {
		return c.json({ error: 'Task not found' }, 404)
	}

	const runs = await getRunsByTaskId(c.env.DB, taskId)
	return c.json({ runs })
})

tasksRoutes.get('/:taskId/merge-requests', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const taskId = c.req.param('taskId')
	const task = await getTaskById(c.env.DB, taskId, session.userId)
	if (!task) {
		return c.json({ error: 'Task not found' }, 404)
	}

	const mergeRequests = await getMergeRequestsByTaskId(c.env.DB, taskId)
	return c.json({ mergeRequests })
})

tasksRoutes.post('/:taskId/plan/generate', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const taskId = c.req.param('taskId')
	const task = await getTaskById(c.env.DB, taskId, session.userId)

	if (!task) {
		return c.json({ error: 'Task not found' }, 404)
	}

	const existingPlans = await getPlansByTaskId(c.env.DB, taskId)
	const latestPlan = existingPlans[0]

	let _previousPlanData:
		| { assumptions: string; approach: string; feedback: string }
		| undefined

	if (latestPlan) {
		const feedback = await getFeedbackByPlanId(c.env.DB, latestPlan.id)
		const latestFeedback = feedback[feedback.length - 1]

		if (latestFeedback) {
			_previousPlanData = {
				assumptions: latestPlan.assumptions,
				approach: latestPlan.approach,
				feedback: latestFeedback.content,
			}
		}
	}

	const run = await createRun(c.env.DB, {
		taskId,
		type: 'PLAN',
		status: 'QUEUED',
		startedAt: new Date().toISOString(),
		finishedAt: null,
		logs: null,
		errorSummary: null,
	})

	await updateTaskStatus(c.env.DB, taskId, 'PLANNING', session.userId)

	return c.json({ runId: run.id })
})

tasksRoutes.post('/:taskId/implement', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const taskId = c.req.param('taskId')
	const task = await getTaskById(c.env.DB, taskId, session.userId)

	if (!task) {
		return c.json({ error: 'Task not found' }, 404)
	}

	if (task.status !== 'PLAN_APPROVED') {
		return c.json({ error: 'Plan must be approved before implementation' }, 400)
	}

	const plans = await getPlansByTaskId(c.env.DB, taskId)
	const approvedPlan = plans.find((p) => p.status === 'APPROVED')

	if (!approvedPlan) {
		return c.json({ error: 'No approved plan found' }, 400)
	}

	const run = await createRun(c.env.DB, {
		taskId,
		type: 'IMPLEMENT',
		status: 'QUEUED',
		startedAt: new Date().toISOString(),
		finishedAt: null,
		logs: null,
		errorSummary: null,
	})

	await updateTaskStatus(c.env.DB, taskId, 'IMPLEMENTING', session.userId)

	return c.json({ runId: run.id })
})
