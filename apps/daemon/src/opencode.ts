import type { ImplementJobPayload, PlanJobPayload } from '@taskwatch/shared/api'
import type { DaemonConfig } from '@taskwatch/shared/types'
import type { FileChanges } from '@taskwatch/shared/types'

export class OpencodeClient {
	private hostname: string
	private port: number

	constructor(config: DaemonConfig) {
		this.hostname = config.opencode.hostname
		this.port = config.opencode.port
	}

	private get baseUrl(): string {
		return `http://${this.hostname}:${this.port}`
	}

	async createSession(title: string): Promise<string> {
		const response = await fetch(`${this.baseUrl}/session`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title }),
		})

		if (!response.ok) {
			throw new Error(`Failed to create opencode session: ${response.status}`)
		}

		const data = (await response.json()) as { id: string }
		return data.id
	}

	async sendPrompt(
		sessionId: string,
		prompt: string,
		onProgress?: (text: string) => void,
	): Promise<string> {
		const response = await fetch(
			`${this.baseUrl}/session/${sessionId}/prompt`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					parts: [{ type: 'text', text: prompt }],
				}),
			},
		)

		if (!response.ok) {
			throw new Error(`Failed to send prompt: ${response.status}`)
		}

		if (!response.body) {
			throw new Error('No response body')
		}

		let fullResponse = ''
		const reader = response.body.getReader()
		const decoder = new TextDecoder()

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			const chunk = decoder.decode(value, { stream: true })
			fullResponse += chunk
			onProgress?.(chunk)
		}

		return fullResponse
	}

	buildPlanPrompt(payload: PlanJobPayload): string {
		let prompt = `Analyze the following ClickUp task and create a technical implementation plan.

## Task: ${payload.task.title}

### Description
${payload.task.description || 'No description provided.'}

### Comments
${payload.task.comments.length > 0 ? payload.task.comments.join('\n\n') : 'No comments.'}

### ClickUp URL
${payload.task.clickupUrl}
`

		if (payload.previousPlan) {
			prompt += `
## Previous Plan (Revision Requested)

### Previous Assumptions
${payload.previousPlan.assumptions}

### Previous Approach
${payload.previousPlan.approach}

### Feedback to Address
${payload.previousPlan.feedback}

Please revise the plan based on the feedback above.
`
		}

		prompt += `
## Instructions

Create a plan with:
1. **Assumptions** - List any assumptions you're making about requirements or implementation
2. **Approach** - Describe the technical approach step by step
3. **File Changes** - List expected file modifications per repository

Format your response as JSON:
\`\`\`json
{
  "assumptions": "markdown text",
  "approach": "markdown text", 
  "fileChanges": {
    "repo-name": ["path/to/file1.ts", "path/to/file2.ts"]
  }
}
\`\`\`
`
		return prompt
	}

	buildImplementPrompt(
		payload: ImplementJobPayload,
		repoPaths: Record<string, string>,
	): string {
		const workingDirs = Object.entries(repoPaths)
			.map(([repo, path]) => `- ./${repo} (${path})`)
			.join('\n')

		const expectedChanges = Object.entries(payload.plan.fileChanges)
			.map(
				([repo, files]) =>
					`### ${repo}\n${files.map((f) => `- ${f}`).join('\n')}`,
			)
			.join('\n\n')

		return `Implement the following approved plan.

## Working Directories
${workingDirs}

## Plan

### Assumptions
${payload.plan.assumptions}

### Approach
${payload.plan.approach}

### Expected File Changes
${expectedChanges}

## Instructions

1. Implement all changes described in the plan
2. Run any available tests before completing
3. If you encounter issues, describe what's blocking

When complete, summarize what was implemented.
`
	}

	parsePlanResponse(response: string): {
		assumptions: string
		approach: string
		fileChanges: FileChanges
	} {
		const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/)
		if (!jsonMatch) {
			throw new Error('Could not parse plan response - no JSON block found')
		}

		try {
			const parsed = JSON.parse(jsonMatch[1])
			return {
				assumptions: parsed.assumptions || '',
				approach: parsed.approach || '',
				fileChanges: parsed.fileChanges || {},
			}
		} catch (e) {
			throw new Error(`Failed to parse plan JSON: ${e}`)
		}
	}
}
