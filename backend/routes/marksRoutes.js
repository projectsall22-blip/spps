const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { 
    bulkEnterMarks, 
    getClassRankList, 
    getStudentReportCard 
} = require('../controllers/marksController');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Mark = require('../models/Mark');

router.post('/bulk-enter', protect, authorize('teacher', 'admin'), bulkEnterMarks);

// Rank list for Admin/Teachers
router.get('/ranklist/:classId/:examId', protect, authorize('admin', 'teacher'), getClassRankList);

// Report card for Student/Admin/Teacher
router.get('/report-card/:studentId/:examId', protect, getStudentReportCard);

router.get('/check-lock/:examId/:subjectId/:classId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { examId, subjectId, classId } = req.params;
        
        // Find the FIRST record ever created for this combination
        const firstEntry = await Mark.findOne({ examId, subjectId, classId }).sort({ createdAt: 1 });

        if (!firstEntry) {
            return res.json({ isLocked: false, exists: false });
        }

        const now = new Date();
        const submissionDate = new Date(firstEntry.createdAt);
        const diffInDays = (now - submissionDate) / (1000 * 60 * 60 * 24);

        res.json({ 
            isLocked: diffInDays > 7, 
            exists: true,
            daysRemaining: Math.max(0, 7 - Math.floor(diffInDays))
        });
    } catch (error) {
        res.status(500).json({ message: "Lock check failed" });
    }
});


router.get('/roster/:examId/:subjectId/:classId', protect, authorize('teacher', 'admin'), async (req, res) => {
    try {
        const { examId, subjectId, classId } = req.params;

        // 1. Get the Class Name to find the students
        const targetClass = await Class.findById(classId);
        if (!targetClass) return res.status(404).json({ message: "Class not found" });

        // 2. Fetch Roster
        const students = await Student.find({ 
            class: targetClass.className, 
            accountStatus: 'active' 
        }).select('name UID').sort({ name: 1 });

        // 3. Fetch Marks (The most critical part)
        // We find all marks for this specific exam and subject in this class
        const existingMarks = await Mark.find({ 
            examId: examId, 
            subjectId: subjectId, 
            classId: classId 
        });

        // 4. THE MATCHING ENGINE (Use .toString() to be 100% safe)
        const rosterWithMarks = students.map(student => {
            // Compare the Student ID to the Mark's Student ID
            const markRecord = existingMarks.find(m => 
                m.studentId.toString() === student._id.toString()
            );

            return {
                _id: student._id,
                name: student.name,
                UID: student.UID,
                // If markRecord exists, extract marksObtained, else empty string
                savedMarks: markRecord ? markRecord.marksObtained : '',
                savedRemarks: markRecord ? markRecord.remarks : ''
            };
        });

        res.json(rosterWithMarks);
    } catch (error) {
        console.error("DEBUG_ROSTER_ERROR:", error);
        res.status(500).json({ message: "Data merge failed" });
    }
});


module.exports = router;
