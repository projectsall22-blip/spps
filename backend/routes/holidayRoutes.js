const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/authMiddleware');
const { getHolidays, addHoliday, deleteHoliday } = require('../controllers/holidayController');

router.get('/',     protect, getHolidays);                          // All roles
router.post('/',    protect, authorize('admin'), addHoliday);       // Admin only
router.delete('/:id', protect, authorize('admin'), deleteHoliday);  // Admin only

module.exports = router;