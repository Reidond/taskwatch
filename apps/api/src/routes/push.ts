import { PushSubscriptionRequestSchema } from '@taskwatch/shared/schemas'
import { Hono } from 'hono'
import { createPushSubscription, deletePushSubscription } from '../services/db'
import type { Env } from '../types'

export const pushRoutes = new Hono<{ Bindings: Env }>()

pushRoutes.post('/subscribe', async (c) => {
	const body = await c.req.json()
	const parsed = PushSubscriptionRequestSchema.safeParse(body)

	if (!parsed.success) {
		return c.json(
			{ error: 'Invalid request body', details: parsed.error.issues },
			400,
		)
	}

	await createPushSubscription(c.env.DB, {
		userEmail: 'andriy@example.com',
		endpoint: parsed.data.endpoint,
		keys: JSON.stringify(parsed.data.keys),
	})

	return c.json({ success: true })
})

pushRoutes.delete('/unsubscribe', async (c) => {
	const body = await c.req.json()
	const { endpoint } = body as { endpoint: string }

	if (!endpoint) {
		return c.json({ error: 'Endpoint required' }, 400)
	}

	await deletePushSubscription(c.env.DB, endpoint)

	return c.json({ success: true })
})
