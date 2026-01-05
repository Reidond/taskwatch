import type { QueryClient } from '@tanstack/react-query'
import {
	Link,
	Outlet,
	createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

interface RouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootLayout,
})

function RootLayout() {
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
