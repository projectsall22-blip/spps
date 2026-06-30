const express = require('express');
const router = express.Router();
const { getPendingStudents, approveStudent, addTeacher, getAllTeachers, updateTeacher, deleteTeacher,
    getAllStudents, updateStudent, deleteStudent, bulkUploadStudents, promoteStudents, getSettings, updateSettings,
    massPromote, resetPassword, addStudent } = require('../controllers/adminController');

const { createExam, getAllExams, updateExamStatus, deleteExam, getAcademicSessions } = require('../controllers/examController');

const { protect, authorize } = require('../middlewares/authMiddleware');

const { createClass, getClasses, updateClass,deleteClass } = require('../controllers/classController');

const { createSubject, getSubjectsByClass, getAllSubjects, deleteSubject, updateSubject } = require('../controllers/subjectController');

const { assignTeacher, getClassAssignments, removeAssignment, updateAssignment } = require('../controllers/assignmentController');

const { createAnnouncement, getAdminAnnouncements, updateAnnouncement, deleteAnnouncement, getAnnouncementViews } = require('../controllers/announcementController');

const { getAdminStats, getAdminDashboard, globalSearch } = require('../controllers/dashboardController');

const { getClassRankList, bulkEnterMarks} = require('../controllers/marksController');

// Admin paths
router.get('/pending-students', protect, authorize('admin'), getPendingStudents);
router.put('/approve-student/:id', protect, authorize('admin'), approveStudent);


router.post('/teachers', protect, authorize('admin'), addTeacher);
router.get('/teachers', protect, authorize('admin'), getAllTeachers);
router.put('/teachers/:id', protect, authorize('admin'), updateTeacher);
router.delete('/teachers/:id', protect, authorize('admin'), deleteTeacher);

// Student Management (Active Students)
router.post('/students', protect, authorize('admin'), addStudent);
router.get('/students', protect, authorize('admin'), getAllStudents);
router.put('/students/:id', protect, authorize('admin'), updateStudent);
router.delete('/students/:id', protect, authorize('admin'), deleteStudent);


// Special Operations
router.post('/students/bulk-upload', protect, authorize('admin'), bulkUploadStudents);
router.put('/students/promote', protect, authorize('admin'), promoteStudents);


// Class Routes
router.post('/classes', protect, authorize('admin'), createClass);
router.get('/classes', protect, authorize('admin', 'teacher'), getClasses);
router.put('/classes/:id', protect, authorize('admin'), updateClass);
router.delete('/classes/:id', protect, authorize('admin'), deleteClass);

// Subject Routes
router.post('/subjects', protect, authorize('admin'), createSubject);
router.get('/subjects/:className', protect, authorize('admin'), getSubjectsByClass);
router.get('/subjects', protect, authorize('admin'), getAllSubjects);
router.delete('/subjects/:id', protect, authorize('admin'), deleteSubject);
router.put('/subjects/:id', protect, authorize('admin'), updateSubject);

// Teacher Assignment Route
router.post('/assignments', protect, authorize('admin'), assignTeacher);
router.delete('/assignments/:id', protect, authorize('admin'), removeAssignment); 
router.get('/assignments/class/:classId', protect, authorize('admin'), getClassAssignments);
router.put('/assignments/:id', protect, authorize('admin'), updateAssignment);


// Add these to your Admin Routes section
router.post('/exams', protect, authorize('admin'), createExam);
router.get('/exams', protect, authorize('admin', 'teacher', 'student'), getAllExams);
router.put('/exams/:id/status', protect, authorize('admin'), updateExamStatus);
router.put('/exams/:id/subject-marks', protect, authorize('admin'), async (req, res) => {
    try {
        const { subjectMaxMarks, defaultMaxMarks } = req.body;
        const exam = await require('../models/Exam').findByIdAndUpdate(
            req.params.id,
            { $set: { subjectMaxMarks, defaultMaxMarks } },
            { new: true }
        );
        if (!exam) return res.status(404).json({ message: "Exam not found" });
        res.json({ message: "Subject marks updated", exam });
    } catch (e) {
        res.status(500).json({ message: e.message });
    }
});


// Announcement Routes
router.post('/announcements', protect, authorize('admin'), createAnnouncement);
router.get('/announcements', protect, authorize('admin'), getAdminAnnouncements);
router.put('/announcements/:id', protect, authorize('admin'), updateAnnouncement);
router.delete('/announcements/:id', protect, authorize('admin'), deleteAnnouncement);
router.get('/announcements/:id/views', protect, authorize('admin'), getAnnouncementViews);


// Add to the bottom of the routes list
router.get('/dashboard-stats', protect, authorize('admin'), getAdminStats);


router.get('/dashboard', protect, authorize('admin'), getAdminDashboard);

// Add Global Search
router.get('/search', protect, authorize('admin'), globalSearch);

//Marks Routes
router.get('/marks/ranklist/:classId/:examId', protect, authorize('admin', 'teacher'), getClassRankList);

router.delete('/announcements/:id', protect, authorize('admin'), deleteAnnouncement);



router.get('/settings', getSettings);
router.put('/settings', protect, authorize('admin'), updateSettings);


router.post('/promote-mass', protect, authorize('admin'), massPromote);

router.put('/reset-password', protect, authorize('admin'), resetPassword);

router.delete('/exams/:id', protect, authorize('admin'), deleteExam);


router.get('/exams/sessions', protect, authorize('admin', 'teacher'), getAcademicSessions);


module.exports = router;
