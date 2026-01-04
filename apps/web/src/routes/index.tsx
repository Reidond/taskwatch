import { StatusBadge } from '@/components/StatusBadge'
import { tasksQueryOptions } from '@/lib/queries'
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
			<h1 className="text-2xl font-bold text-white">Dashboard</h1>

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
				<section>
					<h2 className="text-lg font-semibold text-white mb-4">
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
				<section>
					<h2 className="text-lg font-semibold text-white mb-4">
						Active Implementations
					</h2>
					<div className="space-y-2">
						{activeImplementations.map((task) => (
							<TaskRow key={task.id} task={task} />
						))}
					</div>
				</section>
			)}

			<section>
				<h2 className="text-lg font-semibold text-white mb-4">
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
		yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
		blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
		slate: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
	}

	return (
		<div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
			<div className="text-3xl font-bold">{count}</div>
			<div className="text-sm opacity-80">{title}</div>
		</div>
	)
}

function TaskRow({
	task,
}: { task: { id: string; title: string; status: string } }) {
	return (
		<Link
			to="/tasks/$taskId"
			params={{ taskId: task.id }}
			className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-4 hover:border-slate-600 transition-colors"
		>
			<span className="text-white">{task.title}</span>
			<StatusBadge status={task.status} />
		</Link>
	)
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center h-64">
			<div className="text-slate-400">Loading...</div>
		</div>
	)
}
