import type { ClickUpTask } from '@taskwatch/shared/types'
import { createAuth } from '../lib/auth'
import type { Auth } from '../lib/auth'
import type { Env } from '../types'
import {
	getClickUpAccounts,
	getEnabledClickUpWorkspaces,
	getTaskByClickUpId,
	updateTaskStatus,
	upsertTask,
} from './db'

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2'

interface FetchTasksParams {
	accessToken: string
	teamId: string
	clickupUserId: string
}

export async function syncClickUpTasks(env: Env): Promise<void> {
	const auth = createAuth(env)
	const accounts = await getClickUpAccounts(env.DB)

	for (const account of accounts) {
		const enabledWorkspaces = await getEnabledClickUpWorkspaces(
			env.DB,
			account.userId,
		)

		if (enabledWorkspaces.length === 0) {
			continue
		}

		const accessToken = await getAccessTokenForUser(auth, account.userId)
		if (!accessToken) {
			console.warn(`No ClickUp access token for user ${account.userId}`)
			continue
		}

		for (const workspace of enabledWorkspaces) {
			const tasks = await fetchAssignedTasks({
				accessToken,
				teamId: workspace.clickupTeamId,
				clickupUserId: account.accountId,
			})

			for (const clickupTask of tasks) {
				const existingTask = await getTaskByClickUpId(
					env.DB,
					clickupTask.id,
					account.userId,
				)

				const normalizedTask = {
					userId: account.userId,
					clickupTaskId: clickupTask.id,
					title: clickupTask.name,
					descriptionMd: clickupTask.description,
					clickupStatus: clickupTask.status.status.toLowerCase(),
					assigneeId: clickupTask.assignees[0]?.id?.toString() ?? null,
					url: clickupTask.url,
					status: existingTask?.status ?? ('NEW' as const),
					updatedAtClickup: clickupTask.date_updated,
				}

				await upsertTask(env.DB, normalizedTask)

				if (
					existingTask &&
					existingTask.status === 'DONE' &&
					isEligibleStatus(clickupTask.status.status)
				) {
					await updateTaskStatus(env.DB, existingTask.id, 'NEW', account.userId)
				}
			}
		}
	}
}

async function fetchAssignedTasks(
	params: FetchTasksParams,
): Promise<ClickUpTask[]> {
	const { accessToken, teamId, clickupUserId } = params
	const allTasks: ClickUpTask[] = []

	const spacesResponse = await fetch(
		`${CLICKUP_API_BASE}/team/${teamId}/space?archived=false`,
		{
			headers: { Authorization: accessToken },
		},
	)

	if (!spacesResponse.ok) {
		console.error(
			'Failed to fetch ClickUp spaces:',
			await spacesResponse.text(),
		)
		return []
	}

	const spacesData = (await spacesResponse.json()) as {
		spaces: Array<{ id: string }>
	}

	for (const space of spacesData.spaces) {
		const foldersResponse = await fetch(
			`${CLICKUP_API_BASE}/space/${space.id}/folder?archived=false`,
			{
				headers: { Authorization: accessToken },
			},
		)

		if (foldersResponse.ok) {
			const foldersData = (await foldersResponse.json()) as {
				folders: Array<{ id: string; lists: Array<{ id: string }> }>
			}

			for (const folder of foldersData.folders) {
				for (const list of folder.lists) {
					const tasks = await fetchTasksFromList(
						accessToken,
						list.id,
						clickupUserId,
					)
					allTasks.push(...tasks)
				}
			}
		}

		const listsResponse = await fetch(
			`${CLICKUP_API_BASE}/space/${space.id}/list?archived=false`,
			{
				headers: { Authorization: accessToken },
			},
		)

		if (listsResponse.ok) {
			const listsData = (await listsResponse.json()) as {
				lists: Array<{ id: string }>
			}

			for (const list of listsData.lists) {
				const tasks = await fetchTasksFromList(
					accessToken,
					list.id,
					clickupUserId,
				)
				allTasks.push(...tasks)
			}
		}
	}

	return allTasks.filter(
		(task) =>
			task.assignees.some((a) => a.id.toString() === clickupUserId) &&
			isEligibleStatus(task.status.status),
	)
}

async function fetchTasksFromList(
	accessToken: string,
	listId: string,
	clickupUserId: string,
): Promise<ClickUpTask[]> {
	const response = await fetch(
		`${CLICKUP_API_BASE}/list/${listId}/task?assignees[]=${clickupUserId}&include_closed=false`,
		{
			headers: { Authorization: accessToken },
		},
	)

	if (!response.ok) {
		console.error(
			`Failed to fetch tasks from list ${listId}:`,
			await response.text(),
		)
		return []
	}

	const data = (await response.json()) as { tasks: ClickUpTask[] }
	return data.tasks
}

function isEligibleStatus(status: string): boolean {
	const normalized = status.toLowerCase()
	return (
		normalized === 'todo' ||
		normalized === 'to do' ||
		normalized === 'in progress'
	)
}

export async function fetchTaskComments(
	env: Env,
	userId: string,
	taskId: string,
): Promise<string[]> {
	const accessToken = await getClickUpAccessToken(env, userId)
	if (!accessToken) {
		return []
	}

	const response = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/comment`, {
		headers: { Authorization: accessToken },
	})

	if (!response.ok) {
		console.error(
			`Failed to fetch comments for task ${taskId}:`,
			await response.text(),
		)
		return []
	}

	const data = (await response.json()) as {
		comments: Array<{ comment_text: string }>
	}

	return data.comments.map((c) => c.comment_text)
}

export async function getClickUpAccessToken(
	env: Env,
	userId: string,
): Promise<string | null> {
	const auth = createAuth(env)
	return getAccessTokenForUser(auth, userId)
}

async function getAccessTokenForUser(
	auth: Auth,
	userId: string,
): Promise<string | null> {
	try {
		const tokenResponse = await auth.api.getAccessToken({
			body: { providerId: 'clickup', userId },
		})

		const accessToken =
			(tokenResponse as { accessToken?: string }).accessToken ||
			(tokenResponse as { data?: { accessToken?: string } }).data?.accessToken

		return accessToken ?? null
	} catch (error) {
		console.error('Failed to get ClickUp access token', error)
		return null
	}
}
