const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Late', 'Half-day'],
        default: 'Present',
        required: true
    },
    markedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher', // Can also be an Admin
        required: true
    },
    academicYear: {
        type: String,
        required: true // e.g., "2024-2025"
    },
    remarks: {
        type: String,
        trim: true,
        maxLength: 100
    },
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    editReason: {
        type: String,
        trim: true
    }
}, { timestamps: true });

// THE INTEGRITY GUARD: Compound Index
// This ensures a student can only have ONE attendance record per day.
// It also makes searching for a student's history extremely fast.
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

// Index for Admin/Teacher to fetch whole class attendance quickly
attendanceSchema.index({ classId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);