const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Please provide a title for the announcement"],
        trim: true,
        maxLength: 100
    },
    message: {
        type: String,
        required: [true, "Please provide the announcement content"],
        trim: true
    },
    targetAudience: {
        type: String,
        required: true,
        enum: ['Teachers', 'Students', 'Everyone'],
        default: 'Everyone'
    },
    priority: {
        type: String,
        enum: ['Normal', 'Important', 'Urgent'],
        default: 'Normal'
    },
    expiryDate: {
        type: Date,
        // If not provided, it stays indefinitely or until manually deleted
    },
    isActive: {
        type: Boolean,
        default: true
    },
    academicYear: { 
        type: String, 
        required: true // 
    },
    attachments: [{
        type: String // URLs for images or PDF circulars
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    // Track who has viewed this announcement
    viewedBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, required: true },
        role:   { type: String, enum: ['teacher', 'student'], required: true },
        viewedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// ARCHITECT'S INDEXING STRATEGY:
// 1. For role-based filtering and activity status
announcementSchema.index({ targetAudience: 1, isActive: 1 });

// 2. For sorting the feed by priority and date
announcementSchema.index({ priority: 1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);