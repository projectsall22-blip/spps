const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Configure VAPID lazily — only when keys are available
// This prevents server crash if VAPID keys are not set in env
let vapidConfigured = false;

const configureVapid = () => {
    if (vapidConfigured) return true;
    const { VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
    if (!VAPID_EMAIL || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
        console.warn('[Push] VAPID keys not set — push notifications disabled');
        return false;
    }
    try {
        webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        vapidConfigured = true;
        return true;
    } catch (err) {
        console.warn('[Push] VAPID config failed:', err.message);
        return false;
    }
};

/**
 * Send push notification to specific user(s) by userId array
 */
const sendPushToUsers = async (userIds, payload) => {
    if (!configureVapid()) return;
    if (!userIds || userIds.length === 0) return;

    const subscriptions = await PushSubscription.find({ userId: { $in: userIds } });
    if (subscriptions.length === 0) return;

    const notifPayload = JSON.stringify({
        title: payload.title,
        body:  payload.body,
        url:   payload.url || '/'
    });

    await Promise.allSettled(
        subscriptions.map(sub =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                notifPayload
            ).catch(async (err) => {
                if (err.statusCode === 410) {
                    await PushSubscription.deleteOne({ _id: sub._id });
                }
            })
        )
    );
};

/**
 * Send push notification to ALL users of a role
 */
const sendPushToRole = async (role, payload) => {
    if (!configureVapid()) return;

    const subscriptions = await PushSubscription.find({ userRole: role });
    if (subscriptions.length === 0) return;

    const notifPayload = JSON.stringify({
        title: payload.title,
        body:  payload.body,
        url:   payload.url || '/'
    });

    await Promise.allSettled(
        subscriptions.map(sub =>
            webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                notifPayload
            ).catch(async (err) => {
                if (err.statusCode === 410) {
                    await PushSubscription.deleteOne({ _id: sub._id });
                }
            })
        )
    );
};

module.exports = { sendPushToUsers, sendPushToRole };
