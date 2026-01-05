import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import type { AuthVariables } from './middleware/auth'
import { sessionAuth } from './middleware/auth'
import { authRoutes } from './routes/auth'
import { internalRoutes } from './routes/internal'
import { clickupRoutes } from './routes/clickup'
import { plansRoutes } from './routes/plans'
import { pushRoutes } from './routes/push'
import { runsRoutes } from './routes/runs'
import { tasksRoutes } from './routes/tasks'
import { webhooksRoutes } from './routes/webhooks'
import { worktreesRoutes } from './routes/worktrees'
import { syncClickUpTasks } from './services/clickup'
import { getDaemonStatus } from './services/db'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

app.use('*', logger())
app.use(
	'/api/*',
	cors({
		origin: ['http://localhost:5173', 'https://taskwatch.pages.dev'],
		credentials: true,
	}),
)

app.get('/api/health', (c) =>
	c.json({ status: 'ok', timestamp: new Date().toISOString() }),
)

app.route('/api/auth', authRoutes)

app.use('/api/tasks/*', sessionAuth)
app.use('/api/plans/*', sessionAuth)
app.use('/api/runs/*', sessionAuth)
app.use('/api/worktrees/*', sessionAuth)
app.use('/api/push/*', sessionAuth)
app.use('/api/clickup/*', sessionAuth)

app.route('/api/tasks', tasksRoutes)
app.route('/api/plans', plansRoutes)
app.route('/api/runs', runsRoutes)
app.route('/api/worktrees', worktreesRoutes)
app.route('/api/push', pushRoutes)
app.route('/api/clickup', clickupRoutes)
app.route('/internal', internalRoutes)
app.route('/webhooks', webhooksRoutes)

app.get('/api/me', sessionAuth, (c) => {
	const user = c.get('user')
	const session = c.get('session')
	return c.json({ user, session })
})

app.get('/api/daemon/status', sessionAuth, async (c) => {
	const status = await getDaemonStatus(c.env.DB)
	if (!status) {
		return c.json({ status: null, online: false })
	}
	const lastHeartbeat = new Date(status.lastHeartbeat)
	const now = new Date()
	const diffSeconds = (now.getTime() - lastHeartbeat.getTime()) / 1000
	const isOnline = diffSeconds < 30
	return c.json({ status, online: isOnline })
})

export default {
	fetch: app.fetch,
	async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(syncClickUpTasks(env))
	},
}
