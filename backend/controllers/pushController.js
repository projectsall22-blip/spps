const PushSubscription = require('../models/PushSubscription');

// @desc  Save browser push subscription
// @route POST /api/push/subscribe
// @access Private
const subscribe = async (req, res) => {
    try {
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ message: "Invalid subscription object" });
        }

        // Upsert: same endpoint = same device, just update userId if needed
        await PushSubscription.findOneAndUpdate(
            { endpoint },
            {
                userId:   req.user._id,
                userRole: req.user.role,
                endpoint,
                keys
            },
            { upsert: true, new: true }
        );

        res.status(200).json({ message: "Subscribed to push notifications" });
    } catch (error) {
        console.error("PUSH_SUBSCRIBE_ERROR:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc  Remove push subscription (user logs out or disables notifications)
// @route POST /api/push/unsubscribe
// @access Private
const unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
        res.status(200).json({ message: "Unsubscribed" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc  Return VAPID public key (frontend needs this to subscribe)
// @route GET /api/push/vapid-public-key
// @access Public
const getVapidPublicKey = (_req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

module.exports = { subscribe, unsubscribe, getVapidPublicKey };