import { useEffect, useRef } from 'react';
import api from '../api/axios';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export function usePushNotifications(isAuthenticated) {
    const attempted = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || attempted.current) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        // Only attempt once per session
        attempted.current = true;

        const setup = async () => {
            try {
                // 1. Register service worker
                const registration = await navigator.serviceWorker.register('/sw.js');

                // Wait for SW to be ready
                await navigator.serviceWorker.ready;

                // 2. Check notification permission
                if (Notification.permission === 'denied') {
                    console.log('[Push] Notifications blocked by user');
                    return;
                }

                // 3. Get VAPID public key
                const { data } = await api.get('/push/vapid-public-key');
                const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

                // 4. Check existing subscription — always re-send to backend
                //    in case it was lost (e.g. server redeploy wiped DB)
                let subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    // Will trigger permission prompt if not yet granted
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey
                    });
                }

                // 5. Always sync subscription to backend on login
                await api.post('/push/subscribe', {
                    endpoint: subscription.endpoint,
                    keys: {
                        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
                        auth:   btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
                    }
                });

                console.log('[Push] Subscription synced');
            } catch (err) {
                console.log('[Push] Setup failed:', err.message);
            }
        };

        setup();
    }, [isAuthenticated]);
}
