const express = require('express');
const router = express.Router();
const { 
    createHomework, 
    getStudentHomework, 
    toggleHomeworkStatus, 
    getAdminDiary,
    getTeacherHomeworkPosts,
    deleteHomework
} = require('../controllers/homeworkController');

const { protect, authorize } = require('../middlewares/authMiddleware');

// Teacher/Admin can create
router.post('/create', protect, authorize('teacher', 'admin'), createHomework);

// Student can view their feed
router.get('/my-feed', protect, authorize('student'), getStudentHomework);


// Step 4: Toggle Status
router.post('/toggle-status/:homeworkId', protect, authorize('student'), toggleHomeworkStatus);

// Step 5: Admin Diary
router.get('/admin/diary/:classId', protect, authorize('admin'), getAdminDiary);

router.get('/teacher/my-posts', protect, authorize('teacher'), getTeacherHomeworkPosts);

router.delete('/:id', protect, authorize('teacher', 'admin'), deleteHomework);

module.exports = router;