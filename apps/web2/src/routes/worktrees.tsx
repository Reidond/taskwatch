import { Button } from '@/components/ui/button'
import { useDeleteWorktree, worktreesQueryOptions } from '@/lib/queries'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import type { Worktree } from '@taskwatch/shared/types'

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
			<h1 className="text-3xl font-bold tracking-tight text-foreground">
				Worktrees
			</h1>

			{worktrees.length === 0 ? (
				<div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
					No active worktrees
				</div>
			) : (
				<div className="rounded-lg border border-border overflow-hidden bg-card">
					<table className="w-full text-sm">
						<thead className="bg-muted">
							<tr className="border-b border-border">
								<th className="px-4 py-3 text-left font-medium text-muted-foreground">
									Task
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground">
									Repository
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground">
									Branch
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground">
									Path
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground">
									Created
								</th>
								<th className="px-4 py-3 text-left font-medium text-muted-foreground">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{worktrees.map((wt: Worktree) => (
								<tr key={wt.id} className="hover:bg-muted/50 transition-colors">
									<td className="px-4 py-3">
										<Link
											to="/tasks/$taskId"
											params={{ taskId: wt.taskId }}
											className="text-primary hover:text-primary/80 transition-colors"
										>
											{wt.taskId.slice(0, 8)}...
										</Link>
									</td>
									<td className="px-4 py-3 text-foreground">{wt.repoName}</td>
									<td className="px-4 py-3 text-muted-foreground font-mono text-xs">
										{wt.branchName}
									</td>
									<td className="px-4 py-3 text-muted-foreground font-mono text-xs">
										{wt.path}
									</td>
									<td className="px-4 py-3 text-muted-foreground">
										{new Date(wt.createdAt).toLocaleDateString()}
									</td>
									<td className="px-4 py-3">
										<Button
											variant="destructive"
											size="sm"
											onClick={() => deleteWorktree.mutate(wt.id)}
											disabled={deleteWorktree.isPending}
											className="h-7 text-xs"
										>
											Cleanup
										</Button>
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
			<div className="text-muted-foreground animate-pulse">Loading...</div>
		</div>
	)
}
