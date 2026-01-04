import { Hono } from 'hono'
import { deleteWorktree, getWorktrees } from '../services/db'
import type { Env } from '../types'

export const worktreesRoutes = new Hono<{ Bindings: Env }>()

worktreesRoutes.get('/', async (c) => {
	const worktrees = await getWorktrees(c.env.DB)
	return c.json({ worktrees })
})

worktreesRoutes.delete('/:worktreeId', async (c) => {
	const worktreeId = c.req.param('worktreeId')
	await deleteWorktree(c.env.DB, worktreeId)
	return c.json({ success: true })
})
