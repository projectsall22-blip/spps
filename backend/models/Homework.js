const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true // The actual homework instructions
    },
    imageUrl: {
        type: String, // Store the URL of the photo (e.g., blackboard photo)
        default: ""
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true
    },
    academicYear: {
        type: String,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Active', 'Archived'],
        default: 'Active'
    }
}, { timestamps: true });

// ARCHITECT'S INDEXING STRATEGY:
// 1. Fast retrieval for a specific class's diary, sorted by newest first
homeworkSchema.index({ classId: 1, createdAt: -1 });

// 2. Fast retrieval for subject-specific homework within a class
homeworkSchema.index({ classId: 1, subjectId: 1 });

module.exports = mongoose.model('Homework', homeworkSchema);