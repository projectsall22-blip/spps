const TeacherAssignment = require('../models/TeacherAssignment');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

// @desc    Assign a teacher to a class and subject
// @route   POST /api/admin/assignments
const assignTeacher = async (req, res) => {
    try {
        const { teacherId, classId, subjectId } = req.body;

        // 1. Validation (Corrected message)
        if (!teacherId || !classId || !subjectId ) {
            return res.status(400).json({ message: "Please provide Teacher, Class, and Subject IDs" });
        }
        
        // 2. Verification
        const [teacher, classObj, subject] = await Promise.all([
            Teacher.findById(teacherId),
            Class.findById(classId),
            Subject.findById(subjectId)
        ]);

        if (!teacher || !classObj || !subject) {
            return res.status(404).json({ message: "One or more entities (Teacher/Class/Subject) not found" });
        }

        // 3. Create/Update Assignment (Static)
        // Architect's Note: We use create because your unique index in the model 
        // will handle the 11000 error if they try to assign a 2nd teacher to the same subject.
        const assignment = await TeacherAssignment.create({
            teacherId,
            classId,
            subjectId,
            assignedBy: req.user._id
        });

        res.status(201).json({
            message: "Teacher assigned successfully",
            assignment
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: "This subject in this class is already assigned to a teacher." });
        }
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Get all assignments for the logged-in teacher (Corrected Bug)
const getMyAssignments = async (req, res) => {
    try {  
        // FIX: Removed the 'getClassAssignments' variable from the query object
        const assignments = await TeacherAssignment.find({ teacherId: req.user._id })
            .populate('classId', 'className')
            .populate('subjectId', 'subjectName maxMarks');

        res.status(200).json({
            count: assignments.length,
            assignments
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


// @desc    Get all teachers/subjects assigned to a specific class
// @route   GET /api/admin/assignments/class/:classId
const getClassAssignments = async (req, res) => {
    try {
        const assignments = await TeacherAssignment.find({ classId: req.params.classId })
            .populate('teacherId', 'name employeeCode phone')
            .populate('subjectId', 'subjectName');

        res.status(200).json(assignments);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const removeAssignment = async (req, res) => {
    try {
        await TeacherAssignment.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Assignment removed successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};



// @desc    Update an existing assignment (Switch Teacher)
// @route   PUT /api/admin/assignments/:id
const updateAssignment = async (req, res) => {
    try {
        const { teacherId } = req.body;

        if (!teacherId) {
            return res.status(400).json({ message: "Please select a teacher to switch to." });
        }

        const assignment = await TeacherAssignment.findByIdAndUpdate(
            req.params.id,
            { teacherId },
            { new: true }
        ).populate('teacherId', 'name').populate('subjectId', 'subjectName');

        if (!assignment) {
            return res.status(404).json({ message: "Assignment record not found." });
        }

        res.status(200).json({ message: "Teacher switched successfully!", assignment });
    } catch (error) {
        res.status(500).json({ message: "Update Failed", error: error.message });
    }
};



// Update exports at the bottom
module.exports = { assignTeacher, getMyAssignments, getClassAssignments, removeAssignment, updateAssignment };