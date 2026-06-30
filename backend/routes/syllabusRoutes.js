const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const {
    getAllSyllabus,
    createSyllabus,
    updateSyllabus,
    deleteSyllabus,
    getMySyllabus,
    getSyllabusByClass,
    toggleTopic
} = require('../controllers/syllabusController');

// Student: get their own class syllabus
router.get('/my',            protect, authorize('student'),          getMySyllabus);

// Teacher: get syllabus for a class they teach
router.get('/class/:classId', protect, authorize('teacher', 'admin'), getSyllabusByClass);

// Admin: full CRUD
router.get('/',      protect, authorize('admin'),           getAllSyllabus);
router.post('/',     protect, authorize('admin'),           createSyllabus);
router.put('/:id',   protect, authorize('admin'),           updateSyllabus);
router.delete('/:id',protect, authorize('admin'),           deleteSyllabus);

// Admin: toggle single topic complete/incomplete
router.patch('/:id/topic/:topicId/toggle', protect, authorize('admin'), toggleTopic);

module.exports = router;