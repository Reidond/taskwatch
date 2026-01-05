import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
	planQueryOptions,
	taskPlansQueryOptions,
	taskQueryOptions,
	taskRunsQueryOptions,
	useApprovePlan,
	useGeneratePlan,
	useSubmitFeedback,
	useTriggerImplementation,
} from '@/lib/queries'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import type {
	FileChanges,
	MergeRequest,
	Plan,
	Run,
} from '@taskwatch/shared/types'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

export const Route = createFileRoute('/tasks/$taskId')({
	component: TaskDetailPage,
})

function TaskDetailPage() {
	const { taskId } = Route.useParams()
	const { data: taskData, isLoading: taskLoading } = useQuery(
		taskQueryOptions(taskId),
	)
	const { data: plansData } = useQuery(taskPlansQueryOptions(taskId))
	const { data: runsData } = useQuery(taskRunsQueryOptions(taskId))

	const generatePlan = useGeneratePlan()
	const triggerImplementation = useTriggerImplementation()

	if (taskLoading) {
		return <LoadingState />
	}

	const task = taskData?.task
	if (!task) {
		return <NotFoundState />
	}

	const currentPlan = plansData?.plans?.[0]
	const runs = runsData?.runs ?? []

	return (
		<div className="space-y-8">
			<div className="flex items-start justify-between">
				<div>
					<Link
						to="/tasks"
						className="text-muted-foreground hover:text-foreground text-sm mb-2 block transition-colors"
					>
						← Back to Tasks
					</Link>
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						{task.title}
					</h1>
					<div className="mt-2 flex items-center gap-4">
						<StatusBadge status={task.status} />
						<a
							href={task.url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-primary hover:text-primary/80 text-sm transition-colors"
						>
							View in ClickUp →
						</a>
					</div>
				</div>
				<div className="flex gap-2">
					{(task.status === 'NEW' || task.status === 'BLOCKED') && (
						<Button
							onClick={() => generatePlan.mutate(taskId)}
							disabled={generatePlan.isPending}
							variant="default"
						>
							{generatePlan.isPending ? 'Generating...' : 'Generate Plan'}
						</Button>
					)}
					{task.status === 'PLAN_APPROVED' && (
						<Button
							onClick={() => triggerImplementation.mutate(taskId)}
							disabled={triggerImplementation.isPending}
							className="bg-green-600 hover:bg-green-700 text-white"
						>
							{triggerImplementation.isPending
								? 'Starting...'
								: 'Start Implementation'}
						</Button>
					)}
				</div>
			</div>

			{task.descriptionMd && (
				<Card>
					<CardHeader>
						<CardTitle>Description</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="prose prose-invert prose-sm max-w-none text-muted-foreground">
							<ReactMarkdown>{task.descriptionMd}</ReactMarkdown>
						</div>
					</CardContent>
				</Card>
			)}

			{currentPlan && (
				<PlanSection plan={currentPlan} taskStatus={task.status} />
			)}

			{task.mergeRequests && task.mergeRequests.length > 0 && (
				<MergeRequestsSection mergeRequests={task.mergeRequests} />
			)}

			{runs.length > 0 && <RunsSection runs={runs} />}
		</div>
	)
}

function PlanSection({ plan, taskStatus }: { plan: Plan; taskStatus: string }) {
	const { data: planData } = useQuery(planQueryOptions(plan.id))
	const [feedbackText, setFeedbackText] = useState('')
	const submitFeedback = useSubmitFeedback()
	const approvePlan = useApprovePlan()

	const fullPlan = planData?.plan
	const feedback = fullPlan?.feedback ?? []

	let fileChanges: FileChanges = {}
	try {
		fileChanges = JSON.parse(plan.fileChanges || '{}')
	} catch {
		fileChanges = {}
	}

	const handleSubmitFeedback = () => {
		if (!feedbackText.trim()) return
		submitFeedback.mutate({ planId: plan.id, content: feedbackText })
		setFeedbackText('')
	}

	const canApprove = plan.status === 'PENDING' && taskStatus === 'PLAN_READY'
	const canAddFeedback = plan.status !== 'APPROVED'

	return (
		<Card className="space-y-4">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-xl font-semibold">
					Plan (v{plan.version})
				</CardTitle>
				<div className="flex items-center gap-2">
					<StatusBadge status={plan.status} />
					{canApprove && (
						<Button
							size="sm"
							onClick={() => approvePlan.mutate(plan.id)}
							disabled={approvePlan.isPending}
							className="bg-green-600 hover:bg-green-700 text-white"
						>
							{approvePlan.isPending ? 'Approving...' : 'Approve'}
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				<div>
					<h3 className="text-sm font-medium text-muted-foreground mb-2">
						Assumptions
					</h3>
					<div className="prose prose-invert prose-sm max-w-none bg-muted/50 rounded-md p-3 text-foreground">
						<ReactMarkdown>{plan.assumptions}</ReactMarkdown>
					</div>
				</div>

				<div>
					<h3 className="text-sm font-medium text-muted-foreground mb-2">
						Approach
					</h3>
					<div className="prose prose-invert prose-sm max-w-none bg-muted/50 rounded-md p-3 text-foreground">
						<ReactMarkdown>{plan.approach}</ReactMarkdown>
					</div>
				</div>

				{Object.keys(fileChanges).length > 0 && (
					<div>
						<h3 className="text-sm font-medium text-muted-foreground mb-2">
							File Changes
						</h3>
						<div className="bg-muted/50 rounded-md p-3 font-mono text-sm">
							{Object.entries(fileChanges).map(([repo, files]) => (
								<div key={repo} className="mb-3 last:mb-0">
									<div className="text-primary font-medium">{repo}</div>
									{(files as string[]).map((file: string) => (
										<div key={file} className="text-muted-foreground ml-4">
											{file}
										</div>
									))}
								</div>
							))}
						</div>
					</div>
				)}

				{feedback.length > 0 && (
					<div>
						<h3 className="text-sm font-medium text-muted-foreground mb-2">
							Feedback History
						</h3>
						<div className="space-y-2">
							{feedback.map(
								(fb: { id: string; createdAt: string; content: string }) => (
									<div key={fb.id} className="bg-muted/50 rounded-md p-3">
										<div className="text-xs text-muted-foreground mb-1">
											{new Date(fb.createdAt).toLocaleString()}
										</div>
										<div className="text-foreground text-sm">{fb.content}</div>
									</div>
								),
							)}
						</div>
					</div>
				)}

				{canAddFeedback && (
					<div className="space-y-2">
						<h3 className="text-sm font-medium text-muted-foreground">
							Add Feedback
						</h3>
						<Textarea
							value={feedbackText}
							onChange={(e) => setFeedbackText(e.target.value)}
							placeholder="Enter your feedback for plan revision..."
							className="min-h-25"
						/>
						<Button
							onClick={handleSubmitFeedback}
							disabled={!feedbackText.trim() || submitFeedback.isPending}
							variant="secondary"
						>
							{submitFeedback.isPending ? 'Submitting...' : 'Request Changes'}
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

function MergeRequestsSection({
	mergeRequests,
}: { mergeRequests: MergeRequest[] }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Merge Requests</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{mergeRequests.map((mr) => (
						<div
							key={mr.id}
							className="flex items-center justify-between py-2 border-b border-border last:border-0"
						>
							<div>
								<span className="text-muted-foreground">{mr.repoName}</span>
								<a
									href={mr.mrUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="ml-2 text-primary hover:text-primary/80 transition-colors"
								>
									!{mr.mrIid}
								</a>
							</div>
							<StatusBadge status={mr.status} />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

function RunsSection({ runs }: { runs: Run[] }) {
	const [expandedRun, setExpandedRun] = useState<string | null>(null)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Run History</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{runs.map((run) => (
						<div
							key={run.id}
							className="border border-border rounded-lg overflow-hidden"
						>
							<button
								type="button"
								onClick={() =>
									setExpandedRun(expandedRun === run.id ? null : run.id)
								}
								className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
							>
								<div className="flex items-center gap-3">
									<span className="text-foreground capitalize font-medium">
										{run.type.toLowerCase()}
									</span>
									<span className="text-muted-foreground text-sm">
										{run.startedAt && new Date(run.startedAt).toLocaleString()}
									</span>
								</div>
								<StatusBadge status={run.status} />
							</button>
							{expandedRun === run.id && run.logs && (
								<div className="p-3 bg-muted/30 border-t border-border">
									<pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono overflow-x-auto">
										{run.logs}
									</pre>
									{run.errorSummary && (
										<div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm">
											{run.errorSummary}
										</div>
									)}
								</div>
							)}
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center h-64">
			<div className="text-muted-foreground animate-pulse">Loading...</div>
		</div>
	)
}

function NotFoundState() {
	return (
		<div className="flex flex-col items-center justify-center h-64">
			<div className="text-muted-foreground mb-4">Task not found</div>
			<Link
				to="/tasks"
				className="text-primary hover:text-primary/80 transition-colors"
			>
				← Back to Tasks
			</Link>
		</div>
	)
}
