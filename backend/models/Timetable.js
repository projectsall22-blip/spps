const mongoose = require('mongoose');

// Sub-schema for individual periods within a day
const periodSchema = new mongoose.Schema({
    periodNumber: {
        type: Number,
        required: true // e.g., 1, 2, 3...
    },
    startTime: {
        type: String, // format "08:00"
        required: true
    },
    endTime: {
        type: String, // format "08:45"
        required: false,
        default: null
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: function() { return this.periodType === 'Class'; } // Only required if it's a teaching period
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: function() { return this.periodType === 'Class'; } // Only required if it's a teaching period
    },
    periodType: {
        type: String,
        enum: ['Class', 'Break', 'Assembly', 'Other'],
        default: 'Class'
    }
});

const timetableSchema = new mongoose.Schema({
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        required: true
    },
    periods: [periodSchema], // The array of periods for that day
    academicYear: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, { timestamps: true });

// THE INTEGRITY GUARD: 
// A class can have only ONE timetable document per day per academic year.
// This prevents the Admin from accidentally creating two different "Mondays" for Class 5.
timetableSchema.index({ classId: 1, day: 1, academicYear: 1 }, { unique: true });

// Index for the "Teacher Extraction" logic in Step 4
timetableSchema.index({ "periods.teacherId": 1, day: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);