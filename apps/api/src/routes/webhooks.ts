import { Hono } from 'hono'
import { verifyGitlabWebhook } from '../middleware/auth'
import {
	getMergeRequestsByTaskId,
	updateMergeRequestStatus,
	updateTaskStatus,
} from '../services/db'
import type { Env } from '../types'

export const webhooksRoutes = new Hono<{ Bindings: Env }>()

interface GitLabMergeRequestEvent {
	object_kind: 'merge_request'
	project: {
		path_with_namespace: string
	}
	object_attributes: {
		iid: number
		state: 'opened' | 'closed' | 'merged'
		action: string
	}
}

webhooksRoutes.post('/gitlab', verifyGitlabWebhook, async (c) => {
	const body = (await c.req.json()) as GitLabMergeRequestEvent

	if (body.object_kind !== 'merge_request') {
		return c.json({ message: 'Ignored non-MR event' })
	}

	const repoPath = body.project.path_with_namespace
	const repoName = repoPath.split('/').pop() ?? repoPath
	const mrIid = body.object_attributes.iid
	const state = body.object_attributes.state

	let status: 'OPEN' | 'MERGED' | 'CLOSED' = 'OPEN'
	if (state === 'merged') status = 'MERGED'
	if (state === 'closed') status = 'CLOSED'

	await updateMergeRequestStatus(c.env.DB, mrIid, repoName, status)

	if (status === 'MERGED') {
		const mrs = await c.env.DB.prepare(
			'SELECT task_id FROM merge_requests WHERE mr_iid = ? AND repo_name = ?',
		)
			.bind(mrIid, repoName)
			.first<{ task_id: string }>()

		if (mrs) {
			const allMrs = await getMergeRequestsByTaskId(c.env.DB, mrs.task_id)
			const allMerged = allMrs.every((mr) => mr.status === 'MERGED')

			if (allMerged) {
				await updateTaskStatus(c.env.DB, mrs.task_id, 'DONE')
			}
		}
	}

	return c.json({ success: true })
})
