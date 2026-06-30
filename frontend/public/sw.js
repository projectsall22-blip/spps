// Service Worker for DV Convent School PWA
// Handles push notifications

// Install event
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Push event - fires when server sends a push notification
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        data = { title: 'DV Convent School', body: event.data.text(), url: '/' };
    }

    const options = {
        body:    data.body || '',
        icon:    '/school_logo.png',
        badge:   '/school_logo.png',
        vibrate: [200, 100, 200],
        data:    { url: data.url || '/' },
        actions: [
            { action: 'open',    title: 'Open App' },
            { action: 'dismiss', title: 'Dismiss'  }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click - open the app at the right page
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.navigate(targetUrl);
                    return;
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
