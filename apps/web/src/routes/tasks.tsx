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
			<h1 className="text-2xl font-bold text-white">Tasks</h1>

			<div className="rounded-lg border border-slate-700 overflow-hidden">
				<table className="w-full">
					<thead className="bg-slate-800">
						<tr>
							<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
								Title
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
								ClickUp Status
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
								TaskWatch Status
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
								MRs
							</th>
							<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
								Updated
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-700">
						{tasks.map((task) => (
							<TaskTableRow key={task.id} task={task} />
						))}
						{tasks.length === 0 && (
							<tr>
								<td
									colSpan={5}
									className="px-4 py-8 text-center text-slate-400"
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
		<tr className="bg-slate-800/50 hover:bg-slate-800 transition-colors">
			<td className="px-4 py-3">
				<Link
					to="/tasks/$taskId"
					params={{ taskId: task.id }}
					className="text-white hover:text-blue-400 transition-colors"
				>
					{task.title}
				</Link>
			</td>
			<td className="px-4 py-3 text-slate-400 capitalize">
				{task.clickupStatus}
			</td>
			<td className="px-4 py-3">
				<StatusBadge status={task.status} />
			</td>
			<td className="px-4 py-3 text-slate-400">
				{totalMrs > 0 ? `${mergedCount}/${totalMrs}` : '-'}
			</td>
			<td className="px-4 py-3 text-slate-400">
				{new Date(task.updatedAt).toLocaleDateString()}
			</td>
		</tr>
	)
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center h-64">
			<div className="text-slate-400">Loading...</div>
		</div>
	)
}
