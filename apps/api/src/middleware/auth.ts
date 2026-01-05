import type { Context, Next } from 'hono'
import { createAuth } from '../lib/auth'
import type { Env } from '../types'

interface AuthVariables {
	user: { id: string; email: string; name: string } | null
	session: { id: string; userId: string; expiresAt: Date } | null
}

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

export async function sessionAuth(
	c: Context<{ Bindings: Env; Variables: AuthVariables }>,
	next: Next,
) {
	const auth = createAuth(c.env)
	const session = await auth.api.getSession({ headers: c.req.raw.headers })

	if (!session) {
		c.set('user', null)
		c.set('session', null)
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const whitelist = c.env.AUTH_EMAIL_WHITELIST?.split(',').map((e) =>
		e.trim().toLowerCase(),
	)
	if (whitelist && whitelist.length > 0) {
		const userEmail = session.user.email?.toLowerCase()
		if (!userEmail || !whitelist.includes(userEmail)) {
			return c.json({ error: 'Email not authorized' }, 403)
		}
	}

	c.set('user', session.user as AuthVariables['user'])
	c.set('session', session.session as AuthVariables['session'])
	await next()
}

export async function optionalSessionAuth(
	c: Context<{ Bindings: Env; Variables: AuthVariables }>,
	next: Next,
) {
	const auth = createAuth(c.env)
	const session = await auth.api.getSession({ headers: c.req.raw.headers })

	if (session) {
		c.set('user', session.user as AuthVariables['user'])
		c.set('session', session.session as AuthVariables['session'])
	} else {
		c.set('user', null)
		c.set('session', null)
	}

	await next()
}
