import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { subscribePush, unsubscribePush } from '@/lib/api'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/settings')({
	component: SettingsPage,
})

function SettingsPage() {
	const [pushSupported, setPushSupported] = useState(false)
	const [pushEnabled, setPushEnabled] = useState(false)
	const [loading, setLoading] = useState(true)

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
