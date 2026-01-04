#!/usr/bin/env bun

import { loadConfig } from './config'
import { Daemon } from './daemon'

const command = process.argv[2]

async function main() {
	switch (command) {
		case 'start':
			await startDaemon()
			break
		case 'status':
			console.log('Daemon status: Not implemented yet')
			break
		case 'stop':
			console.log('Stop: Use Ctrl+C to stop the daemon')
			break
		default:
			printUsage()
	}
}

async function startDaemon() {
	console.log('[CLI] Loading configuration...')
	const config = await loadConfig()

	console.log('[CLI] Starting daemon...')
	const daemon = new Daemon(config)

	process.on('SIGINT', () => {
		console.log('\n[CLI] Received SIGINT, shutting down...')
		daemon.stop()
		process.exit(0)
	})

	process.on('SIGTERM', () => {
		console.log('\n[CLI] Received SIGTERM, shutting down...')
		daemon.stop()
		process.exit(0)
	})

	await daemon.start()
}

function printUsage() {
	console.log(`
TaskWatch Daemon

Usage:
  taskwatch-daemon start     Start the daemon
  taskwatch-daemon stop      Stop the daemon
  taskwatch-daemon status    Check daemon status

Configuration:
  Config file: ~/.config/taskwatch/config.json
`)
}

main().catch((error) => {
	console.error('[CLI] Fatal error:', error)
	process.exit(1)
})
