const express = require('express');
const router = express.Router();
const { saveTimetable, getMyTimetable, getTeacherAgenda, getLiveStatus, getTimetableForAdmin } = require('../controllers/timetableController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Only Admin can create/save the master timetable
router.post('/save', protect, authorize('admin'), saveTimetable);

// Student Route
router.get('/my-timetable', protect, authorize('student'), getMyTimetable);

// Teacher Extraction Route
router.get('/teacher-agenda', protect, authorize('teacher'), getTeacherAgenda);

// Universal Live Status Route
router.get('/live-status', protect, getLiveStatus);

router.get('/admin/fetch', protect, authorize('admin'), getTimetableForAdmin);

module.exports = router;