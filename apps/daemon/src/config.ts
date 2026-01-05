import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import type { DaemonConfig } from '@taskwatch/shared/types'

const CONFIG_PATH = join(homedir(), '.config', 'taskwatch', 'config.json')

const DEFAULT_CONFIG = {
	worktreeRoot: '~/agent-worktrees',
	sourceRepos: {},
	baseBranch: 'develop',
	orchestratorUrl: 'http://localhost:8787',
	orchestratorToken: 'env:DAEMON_AUTH_TOKEN',
	gitlabToken: 'env:GITLAB_TOKEN',
	pollIntervalSeconds: 10,
	opencode: {
		hostname: '127.0.0.1',
		port: 4096,
	},
}

export async function loadConfig(): Promise<DaemonConfig> {
	const file = Bun.file(CONFIG_PATH)
	const exists = await file.exists()

	if (!exists) {
		await createDefaultConfig()
		console.log(`[Config] Created default config at ${CONFIG_PATH}`)
		console.log('[Config] Please edit the config file and restart the daemon.')
		process.exit(0)
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

async function createDefaultConfig(): Promise<void> {
	await mkdir(dirname(CONFIG_PATH), { recursive: true })
	await Bun.write(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, '\t'))
}
