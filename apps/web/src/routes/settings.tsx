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
			<h1 className="text-2xl font-bold text-white">Settings</h1>

			<section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
				<h2 className="text-lg font-semibold text-white mb-4">
					Push Notifications
				</h2>

				{!pushSupported ? (
					<p className="text-slate-400">
						Push notifications are not supported in this browser.
					</p>
				) : (
					<div className="flex items-center justify-between">
						<div>
							<p className="text-white">
								{pushEnabled
									? 'Notifications enabled'
									: 'Notifications disabled'}
							</p>
							<p className="text-slate-400 text-sm">
								Get notified when plans are ready or implementations complete.
							</p>
						</div>
						<button
							type="button"
							onClick={togglePush}
							disabled={loading}
							className={`px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
								pushEnabled
									? 'bg-red-600 text-white hover:bg-red-700'
									: 'bg-blue-600 text-white hover:bg-blue-700'
							}`}
						>
							{loading ? 'Loading...' : pushEnabled ? 'Disable' : 'Enable'}
						</button>
					</div>
				)}
			</section>
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
