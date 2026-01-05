import { Button } from '@/components/ui/button'
import { signOut, useSession } from '@/lib/auth-client'
import { daemonStatusQueryOptions } from '@/lib/queries'
import { useQuery, type QueryClient } from '@tanstack/react-query'
import {
	Link,
	Outlet,
	createRootRouteWithContext,
	useLocation,
	useNavigate,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { useEffect } from 'react'

interface RouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
})

function RootLayout() {
	const { data: session, isPending } = useSession()
	const location = useLocation()
	const navigate = useNavigate()
	const isLoginPage = location.pathname === '/login'

	useEffect(() => {
		if (!isPending && !session && !isLoginPage) {
			navigate({ to: '/login' })
		}
	}, [session, isPending, isLoginPage, navigate])

	if (isPending) {
		return (
			<div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
				<div className="text-muted-foreground animate-pulse">Loading...</div>
			</div>
		)
	}

	if (!session && !isLoginPage) {
		return null
	}

	if (isLoginPage) {
		return (
			<div className="dark min-h-screen bg-background text-foreground">
				<Outlet />
			</div>
		)
	}

	return (
		<div className="dark min-h-screen bg-background text-foreground">
			<nav className="border-b border-border bg-card">
				<div className="mx-auto max-w-7xl px-4">
					<div className="flex h-14 items-center justify-between">
						<div className="flex items-center gap-8">
							<Link to="/" className="text-xl font-bold">
								TaskWatch
							</Link>
							<div className="flex gap-4">
								<NavLink to="/">Dashboard</NavLink>
								<NavLink to="/tasks">Tasks</NavLink>
								<NavLink to="/worktrees">Worktrees</NavLink>
								<NavLink to="/settings">Settings</NavLink>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<DaemonStatusIndicator />
							<span className="text-sm text-muted-foreground">
								{session?.user?.name || session?.user?.email}
							</span>
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									signOut({
										fetchOptions: {
											onSuccess: () => navigate({ to: '/login' }),
										},
									})
								}
							>
								Sign out
							</Button>
						</div>
					</div>
				</div>
			</nav>
			<main className="mx-auto max-w-7xl px-4 py-6">
				<Outlet />
			</main>
			<TanStackRouterDevtools position="bottom-right" />
		</div>
	)
}

function NavLink({ to, children }: { to: string; children: string }) {
	return (
		<Link
			to={to}
			className="text-muted-foreground hover:text-foreground transition-colors [&.active]:text-foreground [&.active]:font-medium"
		>
			{children}
		</Link>
	)
}

function DaemonStatusIndicator() {
	const { data, isLoading } = useQuery(daemonStatusQueryOptions)

	if (isLoading) {
		return (
			<div className="flex items-center gap-2 text-sm text-muted-foreground">
				<div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
				<span>Daemon</span>
			</div>
		)
	}

	const isOnline = data?.online ?? false

	return (
		<div className="flex items-center gap-2 text-sm">
			<div
				className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}
			/>
			<span className={isOnline ? 'text-green-500' : 'text-red-500'}>
				{isOnline ? 'Daemon Online' : 'Daemon Offline'}
			</span>
		</div>
	)
}
