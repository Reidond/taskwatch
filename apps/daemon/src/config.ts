import { homedir } from 'node:os'
import { join } from 'node:path'
import type { DaemonConfig } from '@taskwatch/shared/types'

const CONFIG_PATH = join(homedir(), '.config', 'taskwatch', 'config.json')

export async function loadConfig(): Promise<DaemonConfig> {
	const file = Bun.file(CONFIG_PATH)

	if (!(await file.exists())) {
		throw new Error(`Config file not found at ${CONFIG_PATH}`)
	}

	const raw = await file.json()

	return {
		worktreeRoot: expandPath(raw.worktreeRoot),
		sourceRepos: Object.fromEntries(
			Object.entries(raw.sourceRepos as Record<string, string>).map(
				([name, path]) => [name, expandPath(path)],
			),
		),
		baseBranch: raw.baseBranch ?? 'develop',
		orchestratorUrl: raw.orchestratorUrl,
		orchestratorToken: resolveEnvValue(raw.orchestratorToken),
		gitlabToken: resolveEnvValue(raw.gitlabToken),
		pollIntervalSeconds: raw.pollIntervalSeconds ?? 10,
		opencode: {
			hostname: raw.opencode?.hostname ?? '127.0.0.1',
			port: raw.opencode?.port ?? 4096,
		},
	}
}

function expandPath(path: string): string {
	if (path.startsWith('~/')) {
		return join(homedir(), path.slice(2))
	}
	return path
}

function resolveEnvValue(value: string): string {
	if (value.startsWith('env:')) {
		const envVar = value.slice(4)
		const envValue = process.env[envVar]
		if (!envValue) {
			throw new Error(`Environment variable ${envVar} not set`)
		}
		return envValue
	}
	return value
}
