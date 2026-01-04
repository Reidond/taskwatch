import type { Context, Next } from 'hono'
import type { Env } from '../types'

export async function daemonAuth(c: Context<{ Bindings: Env }>, next: Next) {
	const authHeader = c.req.header('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		return c.json({ error: 'Missing authorization header' }, 401)
	}

	const token = authHeader.slice(7)
	if (token !== c.env.DAEMON_AUTH_TOKEN) {
		return c.json({ error: 'Invalid token' }, 401)
	}

	await next()
}

export async function verifyGitlabWebhook(
	c: Context<{ Bindings: Env }>,
	next: Next,
) {
	const token = c.req.header('X-Gitlab-Token')
	if (token !== c.env.GITLAB_WEBHOOK_SECRET) {
		return c.json({ error: 'Invalid webhook token' }, 401)
	}

	await next()
}
