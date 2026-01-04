import type { ClickUpTask } from '@taskwatch/shared/types'
import type { Env } from '../types'
import { getTaskByClickUpId, updateTaskStatus, upsertTask } from './db'

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2'

interface ClickUpListTasksResponse {
	tasks: ClickUpTask[]
}

export async function syncClickUpTasks(env: Env): Promise<void> {
	const tasks = await fetchAssignedTasks(env)

	for (const clickupTask of tasks) {
		const existingTask = await getTaskByClickUpId(env.DB, clickupTask.id)

		const normalizedTask = {
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
			await updateTaskStatus(env.DB, existingTask.id, 'NEW')
		}
	}
}

async function fetchAssignedTasks(env: Env): Promise<ClickUpTask[]> {
	const allTasks: ClickUpTask[] = []

	const listsResponse = await fetch(
		`${CLICKUP_API_BASE}/team/${env.CLICKUP_TEAM_ID}/space?archived=false`,
		{
			headers: { Authorization: env.CLICKUP_API_TOKEN },
		},
	)

	if (!listsResponse.ok) {
		console.error('Failed to fetch ClickUp spaces:', await listsResponse.text())
		return []
	}

	const spacesData = (await listsResponse.json()) as {
		spaces: Array<{ id: string }>
	}

	for (const space of spacesData.spaces) {
		const foldersResponse = await fetch(
			`${CLICKUP_API_BASE}/space/${space.id}/folder?archived=false`,
			{
				headers: { Authorization: env.CLICKUP_API_TOKEN },
			},
		)

		if (!foldersResponse.ok) continue

		const foldersData = (await foldersResponse.json()) as {
			folders: Array<{ id: string; lists: Array<{ id: string }> }>
		}

		for (const folder of foldersData.folders) {
			for (const list of folder.lists) {
				const tasks = await fetchTasksFromList(env, list.id)
				allTasks.push(...tasks)
			}
		}

		const folderlessListsResponse = await fetch(
			`${CLICKUP_API_BASE}/space/${space.id}/list?archived=false`,
			{
				headers: { Authorization: env.CLICKUP_API_TOKEN },
			},
		)

		if (folderlessListsResponse.ok) {
			const listsData = (await folderlessListsResponse.json()) as {
				lists: Array<{ id: string }>
			}
			for (const list of listsData.lists) {
				const tasks = await fetchTasksFromList(env, list.id)
				allTasks.push(...tasks)
			}
		}
	}

	return allTasks.filter(
		(task) =>
			task.assignees.some(
				(a) => a.id.toString() === env.CLICKUP_ANDRIY_USER_ID,
			) && isEligibleStatus(task.status.status),
	)
}

async function fetchTasksFromList(
	env: Env,
	listId: string,
): Promise<ClickUpTask[]> {
	const response = await fetch(
		`${CLICKUP_API_BASE}/list/${listId}/task?assignees[]=${env.CLICKUP_ANDRIY_USER_ID}&include_closed=false`,
		{
			headers: { Authorization: env.CLICKUP_API_TOKEN },
		},
	)

	if (!response.ok) {
		console.error(
			`Failed to fetch tasks from list ${listId}:`,
			await response.text(),
		)
		return []
	}

	const data = (await response.json()) as ClickUpListTasksResponse
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
	taskId: string,
): Promise<string[]> {
	const response = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/comment`, {
		headers: { Authorization: env.CLICKUP_API_TOKEN },
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
