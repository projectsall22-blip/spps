const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // THE TARGET: Who should see this?
    // We store the ID here. Since we have 3 user models, we don't use a specific 'ref' 
    // to keep the query lightweight.
    recipient: { 
        type: mongoose.Schema.Types.ObjectId, 
        default: null 
    },

    // THE SCOPE: Is this for all teachers? All admins?
    recipientRole: { 
        type: String, 
        enum: ['admin', 'teacher', 'student'], 
        required: true 
    },

    // THE CONTENT
    title: { 
        type: String, 
        required: [true, "Notification must have a title"],
        trim: true 
    },
    message: { 
        type: String, 
        required: [true, "Notification must have a message"],
        trim: true 
    },

    // THE ACTION: Where should the user go when they click the notification?
    link: { 
        type: String, 
        default: '#' 
    },

    // THE STATE
    isRead: { 
        type: Boolean, 
        default: false 
    },

    // THE SELF-CLEANING ENGINE (TTL Index)
    // This tells MongoDB to check this field and delete the document 
    // exactly 7 days after this date.
    createdAt: { 
        type: Date, 
        default: Date.now, 
        expires: 604800 // 7 days in seconds
    },

    metadata: {
    type: { type: String }, // 'attendance', 'homework', 'exam'
    date: { type: Date }    // The date of the attendance
    }

}, { timestamps: true });

// ARCHITECT'S INDEXING:
// This index makes the Bell Icon's query extremely fast even if the 
// database grows. It sorts by role and then by the newest items.
notificationSchema.index({ recipientRole: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);