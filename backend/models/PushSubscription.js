const mongoose = require('mongoose');

// Stores browser push subscriptions for each user
// One user can have multiple devices/browsers
const pushSubscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    userRole: {
        type: String,
        enum: ['admin', 'teacher', 'student'],
        required: true
    },
    // The subscription object from browser's PushManager.subscribe()
    endpoint:   { type: String, required: true, unique: true },
    keys: {
        p256dh: { type: String, required: true },
        auth:   { type: String, required: true }
    }
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);