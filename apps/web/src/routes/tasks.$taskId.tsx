import { StatusBadge } from '@/components/StatusBadge'
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
						className="text-slate-400 hover:text-white text-sm mb-2 block"
					>
						← Back to Tasks
					</Link>
					<h1 className="text-2xl font-bold text-white">{task.title}</h1>
					<div className="mt-2 flex items-center gap-4">
						<StatusBadge status={task.status} />
						<a
							href={task.url}
							target="_blank"
							rel="noopener noreferrer"
							className="text-blue-400 hover:text-blue-300 text-sm"
						>
							View in ClickUp →
						</a>
					</div>
				</div>
				<div className="flex gap-2">
					{(task.status === 'NEW' || task.status === 'BLOCKED') && (
						<button
							type="button"
							onClick={() => generatePlan.mutate(taskId)}
							disabled={generatePlan.isPending}
							className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
						>
							{generatePlan.isPending ? 'Generating...' : 'Generate Plan'}
						</button>
					)}
					{task.status === 'PLAN_APPROVED' && (
						<button
							type="button"
							onClick={() => triggerImplementation.mutate(taskId)}
							disabled={triggerImplementation.isPending}
							className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
						>
							{triggerImplementation.isPending
								? 'Starting...'
								: 'Start Implementation'}
						</button>
					)}
				</div>
			</div>

			{task.descriptionMd && (
				<section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
					<h2 className="text-lg font-semibold text-white mb-3">Description</h2>
					<div className="prose prose-invert prose-sm max-w-none">
						<ReactMarkdown>{task.descriptionMd}</ReactMarkdown>
					</div>
				</section>
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
		<section className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold text-white">
					Plan (v{plan.version})
				</h2>
				<div className="flex items-center gap-2">
					<StatusBadge status={plan.status} />
					{canApprove && (
						<button
							type="button"
							onClick={() => approvePlan.mutate(plan.id)}
							disabled={approvePlan.isPending}
							className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
						>
							{approvePlan.isPending ? 'Approving...' : 'Approve'}
						</button>
					)}
				</div>
			</div>

			<div>
				<h3 className="text-sm font-medium text-slate-300 mb-2">Assumptions</h3>
				<div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 rounded p-3">
					<ReactMarkdown>{plan.assumptions}</ReactMarkdown>
				</div>
			</div>

			<div>
				<h3 className="text-sm font-medium text-slate-300 mb-2">Approach</h3>
				<div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 rounded p-3">
					<ReactMarkdown>{plan.approach}</ReactMarkdown>
				</div>
			</div>

			{Object.keys(fileChanges).length > 0 && (
				<div>
					<h3 className="text-sm font-medium text-slate-300 mb-2">
						File Changes
					</h3>
					<div className="bg-slate-900/50 rounded p-3 font-mono text-sm">
						{Object.entries(fileChanges).map(([repo, files]) => (
							<div key={repo} className="mb-3 last:mb-0">
								<div className="text-blue-400 font-medium">{repo}</div>
								{files.map((file) => (
									<div key={file} className="text-slate-300 ml-4">
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
					<h3 className="text-sm font-medium text-slate-300 mb-2">
						Feedback History
					</h3>
					<div className="space-y-2">
						{feedback.map((fb) => (
							<div key={fb.id} className="bg-slate-900/50 rounded p-3">
								<div className="text-xs text-slate-500 mb-1">
									{new Date(fb.createdAt).toLocaleString()}
								</div>
								<div className="text-slate-300 text-sm">{fb.content}</div>
							</div>
						))}
					</div>
				</div>
			)}

			{canAddFeedback && (
				<div>
					<h3 className="text-sm font-medium text-slate-300 mb-2">
						Add Feedback
					</h3>
					<textarea
						value={feedbackText}
						onChange={(e) => setFeedbackText(e.target.value)}
						placeholder="Enter your feedback for plan revision..."
						className="w-full h-24 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500"
					/>
					<button
						type="button"
						onClick={handleSubmitFeedback}
						disabled={!feedbackText.trim() || submitFeedback.isPending}
						className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
					>
						{submitFeedback.isPending ? 'Submitting...' : 'Request Changes'}
					</button>
				</div>
			)}
		</section>
	)
}

function MergeRequestsSection({
	mergeRequests,
}: { mergeRequests: MergeRequest[] }) {
	return (
		<section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
			<h2 className="text-lg font-semibold text-white mb-3">Merge Requests</h2>
			<div className="space-y-2">
				{mergeRequests.map((mr) => (
					<div
						key={mr.id}
						className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0"
					>
						<div>
							<span className="text-slate-400">{mr.repoName}</span>
							<a
								href={mr.mrUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="ml-2 text-blue-400 hover:text-blue-300"
							>
								!{mr.mrIid}
							</a>
						</div>
						<StatusBadge status={mr.status} />
					</div>
				))}
			</div>
		</section>
	)
}

function RunsSection({ runs }: { runs: Run[] }) {
	const [expandedRun, setExpandedRun] = useState<string | null>(null)

	return (
		<section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
			<h2 className="text-lg font-semibold text-white mb-3">Run History</h2>
			<div className="space-y-2">
				{runs.map((run) => (
					<div
						key={run.id}
						className="border border-slate-700 rounded-lg overflow-hidden"
					>
						<button
							type="button"
							onClick={() =>
								setExpandedRun(expandedRun === run.id ? null : run.id)
							}
							className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors"
						>
							<div className="flex items-center gap-3">
								<span className="text-slate-300 capitalize">
									{run.type.toLowerCase()}
								</span>
								<span className="text-slate-500 text-sm">
									{run.startedAt && new Date(run.startedAt).toLocaleString()}
								</span>
							</div>
							<StatusBadge status={run.status} />
						</button>
						{expandedRun === run.id && run.logs && (
							<div className="p-3 bg-slate-900 border-t border-slate-700">
								<pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono overflow-x-auto">
									{run.logs}
								</pre>
								{run.errorSummary && (
									<div className="mt-2 p-2 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
										{run.errorSummary}
									</div>
								)}
							</div>
						)}
					</div>
				))}
			</div>
		</section>
	)
}

function LoadingState() {
	return (
		<div className="flex items-center justify-center h-64">
			<div className="text-slate-400">Loading...</div>
		</div>
	)
}

function NotFoundState() {
	return (
		<div className="flex flex-col items-center justify-center h-64">
			<div className="text-slate-400 mb-4">Task not found</div>
			<Link to="/tasks" className="text-blue-400 hover:text-blue-300">
				← Back to Tasks
			</Link>
		</div>
	)
}
