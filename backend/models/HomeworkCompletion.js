const mongoose = require('mongoose');

const homeworkCompletionSchema = new mongoose.Schema({
    homeworkId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Homework',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Ensure a student can only mark a specific homework "Done" once
homeworkCompletionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('HomeworkCompletion', homeworkCompletionSchema);