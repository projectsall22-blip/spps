const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { 
    createDatesheetEntry, 
    getDatesheetByExam, 
    getMyDatesheet,
    deleteDatesheetEntry,
    updateDatesheetEntry
} = require('../controllers/datesheetController');

// Admin Routes
router.post('/create', protect, authorize('admin'), createDatesheetEntry);
router.get('/exam/:examId', protect, authorize('admin', 'teacher'), getDatesheetByExam);
router.put('/:id', protect, authorize('admin'), updateDatesheetEntry);
router.delete('/:id', protect, authorize('admin'), deleteDatesheetEntry);

// Student Route
router.get('/my-schedule/:examId', protect, authorize('student'), getMyDatesheet);

module.exports = router;