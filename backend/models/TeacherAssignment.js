const mongoose = require('mongoose');

const teacherAssignmentSchema = new mongoose.Schema({
    teacherId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Teacher', 
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
    assignedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Admin' 
    }
}, { timestamps: true });

// SECURITY: Prevent duplicate assignments for the same subject in the same class
teacherAssignmentSchema.index({ classId: 1, subjectId: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('TeacherAssignment', teacherAssignmentSchema);