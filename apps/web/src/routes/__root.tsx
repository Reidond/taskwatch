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
		<div className="min-h-screen bg-slate-900">
			<nav className="border-b border-slate-700 bg-slate-800">
				<div className="mx-auto max-w-7xl px-4">
					<div className="flex h-14 items-center justify-between">
						<div className="flex items-center gap-8">
							<Link to="/" className="text-xl font-bold text-white">
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

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
	return (
		<Link
			to={to}
			className="text-slate-300 hover:text-white transition-colors [&.active]:text-white [&.active]:font-medium"
		>
			{children}
		</Link>
	)
}
