import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { DaemonConfig } from '@taskwatch/shared/types'
import { $ } from 'bun'

export class GitManager {
	private config: DaemonConfig

	constructor(config: DaemonConfig) {
		this.config = config
	}

	async createWorktree(
		taskId: string,
		repoName: string,
	): Promise<{ path: string; branchName: string }> {
		const sourceRepo = this.config.sourceRepos[repoName]
		if (!sourceRepo) {
			throw new Error(`Unknown repository: ${repoName}`)
		}

		const slug = taskId.slice(0, 8)
		const branchName = `taskwatch/${taskId}-${slug}`
		const taskDir = join(this.config.worktreeRoot, taskId)
		const worktreePath = join(taskDir, repoName)

		await mkdir(taskDir, { recursive: true })

		await $`git -C ${sourceRepo} fetch origin ${this.config.baseBranch}`.quiet()

		await $`git -C ${sourceRepo} worktree add -b ${branchName} ${worktreePath} origin/${this.config.baseBranch}`.quiet()

		return { path: worktreePath, branchName }
	}

	async removeWorktree(taskId: string, repoName: string): Promise<void> {
		const sourceRepo = this.config.sourceRepos[repoName]
		if (!sourceRepo) return

		const taskDir = join(this.config.worktreeRoot, taskId)
		const worktreePath = join(taskDir, repoName)

		try {
			await $`git -C ${sourceRepo} worktree remove ${worktreePath} --force`.quiet()
		} catch {
			await rm(worktreePath, { recursive: true, force: true })
		}
	}

	async commitAndPush(
		worktreePath: string,
		message: string,
	): Promise<{ commitHash: string }> {
		await $`git -C ${worktreePath} add -A`.quiet()

		const status = await $`git -C ${worktreePath} status --porcelain`.text()
		if (!status.trim()) {
			const hash = await $`git -C ${worktreePath} rev-parse HEAD`.text()
			return { commitHash: hash.trim() }
		}

		await $`git -C ${worktreePath} commit -m ${message}`.quiet()

		const hash = await $`git -C ${worktreePath} rev-parse HEAD`.text()

		await $`git -C ${worktreePath} push -u origin HEAD`.quiet()

		return { commitHash: hash.trim() }
	}

	async getBranchName(worktreePath: string): Promise<string> {
		const branch =
			await $`git -C ${worktreePath} rev-parse --abbrev-ref HEAD`.text()
		return branch.trim()
	}

	getTaskDir(taskId: string): string {
		return join(this.config.worktreeRoot, taskId)
	}
}
