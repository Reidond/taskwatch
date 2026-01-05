declare const self: ServiceWorkerGlobalScope
export type {}

self.addEventListener('install', () => {
	self.skipWaiting()
})

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
	const pushEvent = event as PushEvent
	if (!pushEvent.data) return

	const data = pushEvent.data.json()
	const title = data.title ?? 'TaskWatch'
	const options: NotificationOptions = {
		body: data.body,
		icon: '/favicon.svg',
		badge: '/favicon.svg',
		data: data.url,
		tag: data.tag,
	}

	event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
	const notificationEvent = event as NotificationEvent
	notificationEvent.notification.close()

	const url = notificationEvent.notification.data
	if (url) {
		event.waitUntil(self.clients.openWindow(url))
	}
})
