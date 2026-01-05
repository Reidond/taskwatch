import { StatusBadge } from '@/components/StatusBadge'
import { tasksQueryOptions } from '@/lib/queries'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import type { TaskWithDetails } from '@taskwatch/shared/types'

export const Route = createFileRoute('/tasks')({
	component: TasksPage,
})

function TasksPage() {
	const { data, isLoading } = useQuery(tasksQueryOptions)

	if (isLoading) {
		return <LoadingState />
	}

	const tasks = data?.tasks ?? []

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold tracking-tight text-foreground">
				Tasks
			</h1>

			<div className="rounded-lg border border-border overflow-hidden bg-card">
				<table className="w-full text-sm">
					<thead className="bg-muted">
						<tr className="border-b border-border">
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">
								Title
							</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">
								ClickUp Status
							</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">
								TaskWatch Status
							</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">
								MRs
							</th>
							<th className="px-4 py-3 text-left font-medium text-muted-foreground">
								Updated
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border">
						{tasks.map((task) => (
							<TaskTableRow key={task.id} task={task} />
						))}
						{tasks.length === 0 && (
							<tr>
								<td
									colSpan={5}
									className="px-4 py-8 text-center text-muted-foreground"
								>
									No tasks found
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	)
}

function TaskTableRow({ task }: { task: TaskWithDetails }) {
	const mergedCount =
		task.mergeRequests?.filter((mr) => mr.status === 'MERGED').length ?? 0
	const totalMrs = task.mergeRequests?.length ?? 0

	return (
		<tr className="hover:bg-muted/50 transition-colors">
			<td className="px-4 py-3">
				<Link
					to="/tasks/$taskId"
					params={{ taskId: task.id }}
					className="text-foreground hover:text-primary transition-colors font-medium"
				>
					{task.title}
				</Link>
			</td>
			<td className="px-4 py-3 text-muted-foreground capitalize">
				{task.clickupStatus}
			</td>
			<td className="px-4 py-3">
				<StatusBadge status={task.status} />
			</td>
			<td className="px-4 py-3 text-muted-foreground">
				{totalMrs > 0 ? `${mergedCount}/${totalMrs}` : '-'}
			</td>
			<td className="px-4 py-3 text-muted-foreground">
				{new Date(task.updatedAt).toLocaleDateString()}
			</td>
		</tr>
	)
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center h-64">
			<div className="text-muted-foreground animate-pulse">Loading...</div>
		</div>
	)
}
