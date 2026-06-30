const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const {
    getRoutes, createRoute, updateRoute, deleteRoute,
    getRouteStudents, assignStudent, removeStudent, getStudentBusRoute,
} = require('../controllers/busController');

router.get   ('/',                    protect, authorize('admin','teacher'),  asyncHandler(getRoutes));
router.post  ('/',                    protect, authorize('admin'),            asyncHandler(createRoute));
router.put   ('/:id',                 protect, authorize('admin'),            asyncHandler(updateRoute));
router.delete('/:id',                 protect, authorize('admin'),            asyncHandler(deleteRoute));

router.get   ('/:id/students',        protect, authorize('admin','teacher'),  asyncHandler(getRouteStudents));
router.post  ('/:id/students',        protect, authorize('admin'),            asyncHandler(assignStudent));
router.delete('/:id/students/:studentId', protect, authorize('admin'),        asyncHandler(removeStudent));

router.get   ('/student/:studentId',  protect, authorize('admin','student','teacher'), asyncHandler(getStudentBusRoute));

module.exports = router;