const mongoose = require('mongoose');

// Each topic/unit inside a syllabus
const topicSchema = new mongoose.Schema({
    title:       { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isCompleted: { type: Boolean, default: false },
}, { _id: true });

const syllabusSchema = new mongoose.Schema({
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
    academicYear: {
        type: String,
        required: true
    },
    // Optional: term/semester split
    term: {
        type: String,
        enum: ['Unit-1', 'Half Yearly Exam', 'Unit-2', 'Annual Exam'],
        default: 'Unit-1'
    },
    topics: [topicSchema],
    // Extra notes from admin (e.g. reference book, instructions)
    notes: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, { timestamps: true });

// One syllabus per class + subject + term + year
syllabusSchema.index({ classId: 1, subjectId: 1, academicYear: 1, term: 1 }, { unique: true });

module.exports = mongoose.model('Syllabus', syllabusSchema);