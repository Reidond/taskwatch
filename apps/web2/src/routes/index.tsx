import { StatusBadge } from '@/components/StatusBadge'
import { Card } from '@/components/ui/card'
import { tasksQueryOptions } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
	component: Dashboard,
})

function Dashboard() {
	const { data, isLoading } = useQuery(tasksQueryOptions)

	if (isLoading) {
		return <LoadingState />
	}

	const tasks = data?.tasks ?? []
	const pendingReviews = tasks.filter((t) => t.status === 'PLAN_READY')
	const activeImplementations = tasks.filter((t) => t.status === 'IMPLEMENTING')
	const recentTasks = tasks.slice(0, 5)

	return (
		<div className="space-y-8">
			<h1 className="text-3xl font-bold tracking-tight text-foreground">
				Dashboard
			</h1>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<StatCard
					title="Pending Reviews"
					count={pendingReviews.length}
					color="yellow"
				/>
				<StatCard
					title="Active Implementations"
					count={activeImplementations.length}
					color="blue"
				/>
				<StatCard title="Total Tasks" count={tasks.length} color="slate" />
			</div>

			{pendingReviews.length > 0 && (
				<section className="space-y-4">
					<h2 className="text-xl font-semibold tracking-tight text-foreground">
						Pending Plan Reviews
					</h2>
					<div className="space-y-2">
						{pendingReviews.map((task) => (
							<TaskRow key={task.id} task={task} />
						))}
					</div>
				</section>
			)}

			{activeImplementations.length > 0 && (
				<section className="space-y-4">
					<h2 className="text-xl font-semibold tracking-tight text-foreground">
						Active Implementations
					</h2>
					<div className="space-y-2">
						{activeImplementations.map((task) => (
							<TaskRow key={task.id} task={task} />
						))}
					</div>
				</section>
			)}

			<section className="space-y-4">
				<h2 className="text-xl font-semibold tracking-tight text-foreground">
					Recent Activity
				</h2>
				<div className="space-y-2">
					{recentTasks.map((task) => (
						<TaskRow key={task.id} task={task} />
					))}
				</div>
			</section>
		</div>
	)
}

function StatCard({
	title,
	count,
	color,
}: {
	title: string
	count: number
	color: 'yellow' | 'blue' | 'slate'
}) {
	const colorClasses = {
		yellow: 'border-yellow-500/50 text-yellow-500',
		blue: 'border-blue-500/50 text-blue-500',
		slate: 'border-border text-foreground',
	}

	return (
		<Card className={cn('p-6', colorClasses[color])}>
			<div className="text-4xl font-bold">{count}</div>
			<div className="text-sm text-muted-foreground font-medium">{title}</div>
		</Card>
	)
}

function TaskRow({
	task,
}: { task: { id: string; title: string; status: string } }) {
	return (
		<Link
			to="/tasks/$taskId"
			params={{ taskId: task.id }}
			className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
		>
			<span className="text-foreground font-medium">{task.title}</span>
			<StatusBadge status={task.status} />
		</Link>
	)
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center h-64">
			<div className="text-muted-foreground animate-pulse">Loading...</div>
		</div>
	)
}
