const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    examName: { 
        type: String,
        required: true,
        trim: true
    },

    examType: {
        type: String,
        required: true,
        enum: ['Unit Test-I', 'Unit Test-II', 'Final Exam'] 
    },

    academicYear: {
        type: String,
        required: true
    },

    startDate: {
        type: Date,
        required: true
    },

    endDate: {
        type: Date,
        required: true
    },

    // Subject-wise max marks: { subjectId: maxMarks }
    subjectMaxMarks: {
        type: Map,
        of: Number,
        default: {}
    },

    // Fallback default if a subject is not found in subjectMaxMarks
    defaultMaxMarks: { 
        type: Number,
        required: true,
        default: 100 
    },

    status: { 
        type: String,
        enum: ['Scheduled', 'Ongoing', 'Completed', 'Cancelled'],
        default: 'Scheduled' 
    },

    createdBy: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
    
}, { timestamps: true });

examSchema.index({ academicYear: 1, examType: 1 });

module.exports = mongoose.model('Exam', examSchema);