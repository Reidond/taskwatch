import { Hono } from 'hono'
import { getRunById } from '../services/db'
import type { Env } from '../types'

export const runsRoutes = new Hono<{ Bindings: Env }>()

runsRoutes.get('/:runId', async (c) => {
	const runId = c.req.param('runId')
	const run = await getRunById(c.env.DB, runId)

	if (!run) {
		return c.json({ error: 'Run not found' }, 404)
	}

	return c.json({ run })
})
