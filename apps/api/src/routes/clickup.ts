import type { ClickUpWorkspace } from '@taskwatch/shared/types'
import { Hono } from 'hono'
import type { AuthVariables } from '../middleware/auth'
import { getClickUpAccessToken } from '../services/clickup'
import {
	deleteClickUpAccount,
	deleteEnabledClickUpWorkspace,
	getEnabledClickUpWorkspaces,
	upsertEnabledClickUpWorkspace,
} from '../services/db'
import type { Env } from '../types'

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2'

export const clickupRoutes = new Hono<{
	Bindings: Env
	Variables: AuthVariables
}>()

clickupRoutes.get('/workspaces', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const accessToken = await getClickUpAccessToken(c.env, session.userId)
	if (!accessToken) {
		return c.json({ error: 'ClickUp not linked' }, 400)
	}

	const response = await fetch(`${CLICKUP_API_BASE}/team`, {
		headers: { Authorization: accessToken },
	})

	if (!response.ok) {
		return c.json({ error: 'Failed to fetch ClickUp workspaces' }, 502)
	}

	const data = (await response.json()) as {
		teams: Array<{ id: string; name: string }>
	}

	const enabled = await getEnabledClickUpWorkspaces(c.env.DB, session.userId)
	const enabledSet = new Set(
		enabled.map((workspace) => workspace.clickupTeamId),
	)

	const workspaces: ClickUpWorkspace[] = data.teams.map((team) => ({
		teamId: team.id,
		name: team.name,
		enabled: enabledSet.has(team.id),
	}))

	return c.json({ workspaces })
})

clickupRoutes.post('/workspaces/:teamId/enable', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const teamId = c.req.param('teamId')
	const body = await c.req.json().catch(() => null)
	const teamName = typeof body?.name === 'string' ? body.name : undefined

	await upsertEnabledClickUpWorkspace(
		c.env.DB,
		session.userId,
		teamId,
		teamName,
	)
	return c.json({ success: true })
})

clickupRoutes.post('/workspaces/:teamId/disable', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const teamId = c.req.param('teamId')
	await deleteEnabledClickUpWorkspace(c.env.DB, session.userId, teamId)
	return c.json({ success: true })
})

clickupRoutes.post('/disconnect', async (c) => {
	const session = c.get('session')
	if (!session) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	await deleteClickUpAccount(c.env.DB, session.userId)
	return c.json({ success: true })
})
