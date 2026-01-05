import { createAuthClient } from 'better-auth/react'
import { genericOAuthClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
	baseURL: '/api/auth',
	plugins: [genericOAuthClient()],
})

export const { useSession, signIn, signOut, oauth2 } = authClient
