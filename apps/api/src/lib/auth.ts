import { betterAuth } from 'better-auth'
import { genericOAuth } from 'better-auth/plugins'
import { D1Dialect } from 'kysely-d1'
import type { Env } from '../types'

export function createAuth(env: Env) {
	const baseURL =
		env.ENVIRONMENT === 'production'
			? 'https://taskwatch-api.andrii-shafar.workers.dev'
			: 'http://localhost:8787'

	const clickupOAuth = genericOAuth({
		config: [
			{
				providerId: 'clickup',
				clientId: env.CLICKUP_CLIENT_ID,
				clientSecret: env.CLICKUP_CLIENT_SECRET,
				authorizationUrl: 'https://app.clickup.com/api',
				tokenUrl: 'https://api.clickup.com/api/v2/oauth/token',
				getUserInfo: async (tokens) => {
					const response = await fetch('https://api.clickup.com/api/v2/user', {
						headers: { Authorization: `Bearer ${tokens.accessToken}` },
					})

					if (!response.ok) {
						throw new Error('Failed to fetch ClickUp user')
					}

					const data = (await response.json()) as {
						user: { id: number; username: string; email: string | null }
					}

					return {
						id: data.user.id.toString(),
						name: data.user.username,
						email: data.user.email ?? undefined,
						emailVerified: true,
					}
				},
			},
		],
	})

	return betterAuth({
		database: {
			dialect: new D1Dialect({ database: env.DB }),
			type: 'sqlite',
		},
		secret: env.BETTER_AUTH_SECRET,
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
		account: {
			encryptOAuthTokens: true,
			accountLinking: {
				enabled: true,
				trustedProviders: ['gitlab', 'clickup'],
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
		plugins: [clickupOAuth],
	})
}

export type Auth = ReturnType<typeof createAuth>
