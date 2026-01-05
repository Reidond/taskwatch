import {
	queryOptions,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query'
import {
	approvePlan,
	deleteWorktree,
	generatePlan,
	getDaemonStatus,
	getPlan,
	getTask,
	getTaskMergeRequests,
	getTaskPlans,
	getTaskRuns,
	getTasks,
	getWorktrees,
	submitFeedback,
	triggerImplementation,
} from './api'

export const tasksQueryOptions = queryOptions({
	queryKey: ['tasks'],
	queryFn: getTasks,
})

export const taskQueryOptions = (taskId: string) =>
	queryOptions({
		queryKey: ['tasks', taskId],
		queryFn: () => getTask(taskId),
	})

export const taskPlansQueryOptions = (taskId: string) =>
	queryOptions({
		queryKey: ['tasks', taskId, 'plans'],
		queryFn: () => getTaskPlans(taskId),
	})

export const taskRunsQueryOptions = (taskId: string) =>
	queryOptions({
		queryKey: ['tasks', taskId, 'runs'],
		queryFn: () => getTaskRuns(taskId),
	})

export const taskMergeRequestsQueryOptions = (taskId: string) =>
	queryOptions({
		queryKey: ['tasks', taskId, 'merge-requests'],
		queryFn: () => getTaskMergeRequests(taskId),
	})

export const planQueryOptions = (planId: string) =>
	queryOptions({
		queryKey: ['plans', planId],
		queryFn: () => getPlan(planId),
	})

export const worktreesQueryOptions = queryOptions({
	queryKey: ['worktrees'],
	queryFn: getWorktrees,
})

export function useGeneratePlan() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: generatePlan,
		onSuccess: (_, taskId) => {
			queryClient.invalidateQueries({ queryKey: ['tasks'] })
			queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
			queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'runs'] })
		},
	})
}

export function useSubmitFeedback() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: ({ planId, content }: { planId: string; content: string }) =>
			submitFeedback(planId, content),
		onSuccess: (_, { planId }) => {
			queryClient.invalidateQueries({ queryKey: ['plans', planId] })
			queryClient.invalidateQueries({ queryKey: ['tasks'] })
		},
	})
}

export function useApprovePlan() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: approvePlan,
		onSuccess: (_, planId) => {
			queryClient.invalidateQueries({ queryKey: ['plans', planId] })
			queryClient.invalidateQueries({ queryKey: ['tasks'] })
		},
	})
}

export function useTriggerImplementation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: triggerImplementation,
		onSuccess: (_, taskId) => {
			queryClient.invalidateQueries({ queryKey: ['tasks'] })
			queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
			queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'runs'] })
		},
	})
}

export function useDeleteWorktree() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: deleteWorktree,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['worktrees'] })
		},
	})
}

export const daemonStatusQueryOptions = queryOptions({
	queryKey: ['daemon', 'status'],
	queryFn: getDaemonStatus,
	refetchInterval: 10000,
})
