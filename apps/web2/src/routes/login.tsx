import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { signIn } from '@/lib/auth-client'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/login')({
	component: LoginPage,
})

function LoginPage() {
	const handleGitLabLogin = async () => {
		await signIn.social({
			provider: 'gitlab',
			callbackURL: '/',
		})
	}

	return (
		<div className="flex min-h-[80vh] items-center justify-center">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle className="text-2xl font-bold">TaskWatch</CardTitle>
					<p className="text-muted-foreground mt-2">
						Sign in to access the dashboard
					</p>
				</CardHeader>
				<CardContent className="space-y-4">
					<Button onClick={handleGitLabLogin} className="w-full" size="lg">
						<GitLabIcon className="mr-2 h-5 w-5" />
						Sign in with GitLab
					</Button>
					<p className="text-center text-xs text-muted-foreground">
						Access is restricted to authorized users only
					</p>
				</CardContent>
			</Card>
		</div>
	)
}

function GitLabIcon({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 24 24"
			fill="currentColor"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="GitLab logo"
		>
			<title>GitLab</title>
			<path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
		</svg>
	)
}
