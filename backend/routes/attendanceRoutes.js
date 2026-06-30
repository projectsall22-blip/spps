const express = require('express');
const router = express.Router();
const { 
    markAttendance, 
    getMyAttendance, 
    getClassReport,
    checkAttendanceStatus
} = require('../controllers/attendanceController');

const { protect, authorize } = require('../middlewares/authMiddleware');

// Only Teachers and Admins can mark attendance
router.post('/mark', protect, authorize('teacher', 'admin'), markAttendance);

// Student specific
router.get('/my-summary', protect, authorize('student'), getMyAttendance);

// Admin/Teacher specific
router.get('/class-report/:classId', protect, authorize('admin', 'teacher'), getClassReport);

router.get('/check-status', protect, checkAttendanceStatus);

module.exports = router;