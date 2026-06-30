const express = require('express');
const router = express.Router();
const { getMyAssignments } = require('../controllers/assignmentController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getTeacherDashboard } = require('../controllers/dashboardController');
const { getManagedClasses, getClassRoster } = require('../controllers/classController');

router.get('/my-assignments', protect, authorize('teacher'), getMyAssignments);
router.get('/dashboard', protect, authorize('teacher'), getTeacherDashboard);
router.get('/managed-classes', protect, authorize('teacher'), getManagedClasses);
router.get('/class-roster/:classId', protect, authorize('teacher', 'admin'), getClassRoster);

module.exports = router;