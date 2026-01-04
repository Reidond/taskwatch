import { useDeleteWorktree, worktreesQueryOptions } from '@/lib/queries'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/worktrees')({
	component: WorktreesPage,
})

function WorktreesPage() {
	const { data, isLoading } = useQuery(worktreesQueryOptions)
	const deleteWorktree = useDeleteWorktree()

	if (isLoading) {
		return <LoadingState />
	}

	const worktrees = data?.worktrees ?? []

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold text-white">Worktrees</h1>

			{worktrees.length === 0 ? (
				<div className="rounded-lg border border-slate-700 bg-slate-800 p-8 text-center text-slate-400">
					No active worktrees
				</div>
			) : (
				<div className="rounded-lg border border-slate-700 overflow-hidden">
					<table className="w-full">
						<thead className="bg-slate-800">
							<tr>
								<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
									Task
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
									Repository
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
									Branch
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
									Path
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
									Created
								</th>
								<th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-700">
							{worktrees.map((wt) => (
								<tr
									key={wt.id}
									className="bg-slate-800/50 hover:bg-slate-800 transition-colors"
								>
									<td className="px-4 py-3">
										<Link
											to="/tasks/$taskId"
											params={{ taskId: wt.taskId }}
											className="text-blue-400 hover:text-blue-300"
										>
											{wt.taskId.slice(0, 8)}...
										</Link>
									</td>
									<td className="px-4 py-3 text-slate-300">{wt.repoName}</td>
									<td className="px-4 py-3 text-slate-400 font-mono text-sm">
										{wt.branchName}
									</td>
									<td className="px-4 py-3 text-slate-500 font-mono text-xs">
										{wt.path}
									</td>
									<td className="px-4 py-3 text-slate-400">
										{new Date(wt.createdAt).toLocaleDateString()}
									</td>
									<td className="px-4 py-3">
										<button
											type="button"
											onClick={() => deleteWorktree.mutate(wt.id)}
											disabled={deleteWorktree.isPending}
											className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30 disabled:opacity-50 transition-colors text-sm"
										>
											Cleanup
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center h-64">
			<div className="text-slate-400">Loading...</div>
		</div>
	)
}
