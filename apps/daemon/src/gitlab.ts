import { Gitlab } from '@gitbeaker/rest'
import type { DaemonConfig } from '@taskwatch/shared/types'

export class GitLabClient {
	private client: InstanceType<typeof Gitlab>
	private config: DaemonConfig

	constructor(config: DaemonConfig) {
		this.config = config
		this.client = new Gitlab({
			token: config.gitlabToken,
		})
	}

	async createMergeRequest(
		repoName: string,
		branchName: string,
		taskTitle: string,
		taskId: string,
		planSummary: string,
	): Promise<{ mrUrl: string; mrIid: number }> {
		const projectPath = await this.getProjectPath(repoName)

		const mr = await this.client.MergeRequests.create(
			projectPath,
			branchName,
			this.config.baseBranch,
			`[TaskWatch] ${taskTitle}`,
			{
				description: this.buildMRDescription(taskId, planSummary),
				removeSourceBranch: true,
			},
		)

		return {
			mrUrl: String(mr.web_url),
			mrIid: mr.iid,
		}
	}

	private async getProjectPath(repoName: string): Promise<string> {
		const projects = await this.client.Projects.search(repoName)
		const project = projects.find(
			(p) => p.path === repoName || p.name === repoName,
		)

		if (!project) {
			throw new Error(`GitLab project not found for repo: ${repoName}`)
		}

		return String(project.path_with_namespace)
	}

	private buildMRDescription(taskId: string, planSummary: string): string {
		return `## TaskWatch Automated MR

**Task ID:** ${taskId}

### Summary
${planSummary}

---
*This MR was created automatically by TaskWatch.*`
	}
}
