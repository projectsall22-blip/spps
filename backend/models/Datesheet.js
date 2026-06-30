const mongoose = require('mongoose');

const datesheetSchema = new mongoose.Schema({
    examId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Exam', 
        required: true 
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
    examDate: { 
        type: Date, 
        required: true 
    },
    startTime: { 
        type: String, 
        required: true 
    },
    endTime: { 
        type: String, 
        required: true 
    },
    roomNumber: { 
        type: String, 
        default: 'TBA' 
    },
    academicYear: { 
        type: String, 
        required: true 
    },
    instructions: { 
        type: String, 
        default: '' 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin' 
    }
}, { timestamps: true });

// INTEGRITY GUARD: Prevent duplicate subject in same exam for same class
datesheetSchema.index({ examId: 1, classId: 1, subjectId: 1 }, { unique: true });

// PERFORMANCE INDEX: Fast retrieval by exam
datesheetSchema.index({ examId: 1, classId: 1 });

module.exports = mongoose.model('Datesheet', datesheetSchema);