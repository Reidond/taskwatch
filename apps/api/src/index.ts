import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { internalRoutes } from './routes/internal'
import { plansRoutes } from './routes/plans'
import { pushRoutes } from './routes/push'
import { runsRoutes } from './routes/runs'
import { tasksRoutes } from './routes/tasks'
import { webhooksRoutes } from './routes/webhooks'
import { worktreesRoutes } from './routes/worktrees'
import { syncClickUpTasks } from './services/clickup'
import type { Env } from './types'

const app = new Hono<{ Bindings: Env }>()

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

app.route('/api/tasks', tasksRoutes)
app.route('/api/plans', plansRoutes)
app.route('/api/runs', runsRoutes)
app.route('/api/worktrees', worktreesRoutes)
app.route('/api/push', pushRoutes)
app.route('/internal', internalRoutes)
app.route('/webhooks', webhooksRoutes)

export default {
	fetch: app.fetch,
	async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(syncClickUpTasks(env))
	},
}
