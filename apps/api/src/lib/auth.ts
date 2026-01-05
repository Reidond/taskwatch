import { betterAuth } from 'better-auth'
import { D1Dialect } from 'kysely-d1'
import type { Env } from '../types'

export function createAuth(env: Env) {
	const baseURL =
		env.ENVIRONMENT === 'production'
			? 'https://taskwatch-api.andrii-shafar.workers.dev'
			: 'http://localhost:8787'

	return betterAuth({
		database: {
			dialect: new D1Dialect({ database: env.DB }),
			type: 'sqlite',
		},
		baseURL,
		basePath: '/api/auth',
		trustedOrigins: [
			'http://localhost:5173',
			'https://taskwatch.andriishafar.xyz',
			'https://taskwatch-web.pages.dev/',
		],
		socialProviders: {
			gitlab: {
				clientId: env.GITLAB_OAUTH_CLIENT_ID,
				clientSecret: env.GITLAB_OAUTH_CLIENT_SECRET,
			},
		},
		session: {
			expiresIn: 60 * 60 * 24 * 7,
			updateAge: 60 * 60 * 24,
			cookieCache: {
				enabled: true,
				maxAge: 5 * 60,
			},
		},
		advanced: {
			defaultCookieAttributes: {
				sameSite: 'lax',
				secure: env.ENVIRONMENT === 'production',
			},
		},
	})
}

export type Auth = ReturnType<typeof createAuth>
