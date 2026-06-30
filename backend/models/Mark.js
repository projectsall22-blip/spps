const mongoose = require('mongoose');

const markSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    examId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exam',
        required: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    classId: { // We store this to make class-wise rank reports much faster
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    marksObtained: {
        type: Number,
        required: true,
        min: 0
    },
    maxMarks: {
        type: Number,
        required: true,
        default: 100
    },
    grade: {
        type: String, // Calculated automatically: A+, A, B, etc.
        trim: true
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
    remarks: {
        type: String,
        trim: true,
        maxLength: 200
    }
}, { timestamps: true });

// THE INTEGRITY GUARD: Multi-Key Unique Index
// A student cannot have TWO records for the SAME subject in the SAME exam.
markSchema.index({ studentId: 1, examId: 1, subjectId: 1 }, { unique: true });

// Index for fast Class-wise and Exam-wise reporting
markSchema.index({ classId: 1, examId: 1 });

module.exports = mongoose.model('Mark', markSchema);