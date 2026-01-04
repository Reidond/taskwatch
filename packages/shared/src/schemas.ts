import { z } from 'zod'

export const TaskStatusSchema = z.enum([
	'NEW',
	'PLANNING',
	'PLAN_READY',
	'PLAN_REVISION',
	'PLAN_APPROVED',
	'IMPLEMENTING',
	'PR_READY',
	'DONE',
	'BLOCKED',
])

export const PlanStatusSchema = z.enum([
	'PENDING',
	'APPROVED',
	'CHANGES_REQUESTED',
])

export const RunTypeSchema = z.enum(['PLAN', 'IMPLEMENT'])

export const RunStatusSchema = z.enum([
	'QUEUED',
	'RUNNING',
	'SUCCEEDED',
	'FAILED',
])

export const MergeRequestStatusSchema = z.enum(['OPEN', 'MERGED', 'CLOSED'])

export const GeneratePlanRequestSchema = z.object({
	feedback: z.string().optional(),
})

export const SubmitFeedbackRequestSchema = z.object({
	content: z.string().min(1),
})

export const PushSubscriptionRequestSchema = z.object({
	endpoint: z.string().url(),
	keys: z.object({
		p256dh: z.string(),
		auth: z.string(),
	}),
})

export const JobClaimRequestSchema = z.object({
	daemonId: z.string(),
})

export const JobProgressRequestSchema = z.object({
	logs: z.string().optional(),
	status: z.string().optional(),
})

export const JobCompleteRequestSchema = z.object({
	result: z.record(z.unknown()).optional(),
})

export const JobFailRequestSchema = z.object({
	errorSummary: z.string(),
	logs: z.string().optional(),
})

export const RegisterWorktreeRequestSchema = z.object({
	taskId: z.string(),
	repoName: z.string(),
	path: z.string(),
	branchName: z.string(),
})

export const FileChangesSchema = z.record(z.array(z.string()))

export const PlanResultSchema = z.object({
	assumptions: z.string(),
	approach: z.string(),
	fileChanges: FileChangesSchema,
})

export const ImplementResultSchema = z.object({
	commits: z.array(
		z.object({
			repoName: z.string(),
			commitHash: z.string(),
			message: z.string(),
		}),
	),
	mergeRequests: z.array(
		z.object({
			repoName: z.string(),
			mrUrl: z.string(),
			mrIid: z.number(),
		}),
	),
})
