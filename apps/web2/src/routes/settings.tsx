import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { subscribePush, unsubscribePush } from '@/lib/api'
import { authClient } from '@/lib/auth-client'
import {
	clickUpWorkspacesQueryOptions,
	useDisableClickUpWorkspace,
	useDisconnectClickUp,
	useEnableClickUpWorkspace,
} from '@/lib/queries'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/settings')({
	component: SettingsPage,
})

function SettingsPage() {
	const [pushSupported, setPushSupported] = useState(false)
	const [pushEnabled, setPushEnabled] = useState(false)
	const [loading, setLoading] = useState(true)

	const {
		data: clickUpData,
		error: clickUpError,
		refetch: refetchClickUp,
		isLoading: isClickUpLoading,
	} = useQuery({ ...clickUpWorkspacesQueryOptions, retry: false })

	const enableWorkspace = useEnableClickUpWorkspace()
	const disableWorkspace = useDisableClickUpWorkspace()
	const disconnectClickUp = useDisconnectClickUp()

	useEffect(() => {
		checkPushStatus()
	}, [])

	async function checkPushStatus() {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			setLoading(false)
			return
		}

		setPushSupported(true)

		try {
			const registration = await navigator.serviceWorker.ready
			const subscription = await registration.pushManager.getSubscription()
			setPushEnabled(!!subscription)
		} catch (err) {
			console.error('Failed to check push status:', err)
		}

		setLoading(false)
	}

	async function togglePush() {
		if (!pushSupported) return

		setLoading(true)

		try {
			const registration = await navigator.serviceWorker.ready

			if (pushEnabled) {
				const subscription = await registration.pushManager.getSubscription()
				if (subscription) {
					await subscription.unsubscribe()
					await unsubscribePush(subscription.endpoint)
				}
				setPushEnabled(false)
			} else {
				const permission = await Notification.requestPermission()
				if (permission !== 'granted') {
					setLoading(false)
					return
				}

				const subscription = await registration.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(
						import.meta.env.VITE_VAPID_PUBLIC_KEY || '',
					),
				})

				await subscribePush(subscription)
				setPushEnabled(true)
			}
		} catch (err) {
			console.error('Failed to toggle push:', err)
		}

		setLoading(false)
	}

	return (
		<div className="space-y-6">
			<h1 className="text-3xl font-bold tracking-tight text-foreground">
				Settings
			</h1>

			<Card>
				<CardHeader>
					<CardTitle>ClickUp Integration</CardTitle>
				</CardHeader>
				<CardContent>
					{isClickUpLoading ? (
						<p className="text-muted-foreground">Loading workspaces...</p>
					) : clickUpError ? (
						<div className="flex flex-col gap-4">
							<p className="text-muted-foreground">
								Connect your ClickUp account to sync tasks and generate plans.
							</p>
							<div className="flex gap-2">
								<Button
									onClick={() =>
										authClient.oauth2.link({
											providerId: 'clickup',
											callbackURL: window.location.href,
										})
									}
								>
									Connect ClickUp
								</Button>
								<Button variant="outline" onClick={() => refetchClickUp()}>
									Check Connection
								</Button>
							</div>
						</div>
					) : (
						<div className="space-y-6">
							<div className="space-y-4">
								{clickUpData?.workspaces.length === 0 && (
									<p className="text-muted-foreground">No workspaces found.</p>
								)}
								{clickUpData?.workspaces.map((workspace) => (
									<div
										key={workspace.teamId}
										className="flex items-center justify-between"
									>
										<div>
											<p className="font-medium">{workspace.name}</p>
											<p className="text-sm text-muted-foreground">
												{workspace.enabled ? 'Active' : 'Inactive'}
											</p>
										</div>
										<Button
											variant={workspace.enabled ? 'outline' : 'default'}
											size="sm"
											onClick={() => {
												if (workspace.enabled) {
													disableWorkspace.mutate(workspace.teamId)
												} else {
													enableWorkspace.mutate({
														teamId: workspace.teamId,
														name: workspace.name,
													})
												}
											}}
											disabled={
												enableWorkspace.isPending || disableWorkspace.isPending
											}
										>
											{workspace.enabled ? 'Disable' : 'Enable'}
										</Button>
									</div>
								))}
							</div>

							<div className="pt-4 border-t">
								<Button
									variant="destructive"
									onClick={() => disconnectClickUp.mutate()}
									disabled={disconnectClickUp.isPending}
								>
									{disconnectClickUp.isPending
										? 'Disconnecting...'
										: 'Disconnect Integration'}
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Push Notifications</CardTitle>
				</CardHeader>
				<CardContent>
					{!pushSupported ? (
						<p className="text-muted-foreground">
							Push notifications are not supported in this browser.
						</p>
					) : (
						<div className="flex items-center justify-between">
							<div>
								<p className="text-foreground font-medium">
									{pushEnabled
										? 'Notifications enabled'
										: 'Notifications disabled'}
								</p>
								<p className="text-muted-foreground text-sm">
									Get notified when plans are ready or implementations complete.
								</p>
							</div>
							<Button
								onClick={togglePush}
								disabled={loading}
								variant={pushEnabled ? 'destructive' : 'default'}
							>
								{loading ? 'Loading...' : pushEnabled ? 'Disable' : 'Enable'}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
	const rawData = window.atob(base64)
	const outputArray = new Uint8Array(rawData.length)
	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i)
	}
	return outputArray.buffer as ArrayBuffer
}
