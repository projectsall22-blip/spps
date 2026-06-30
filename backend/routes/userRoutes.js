const express = require('express');
const router = express.Router();
const { protect,authorize } = require('../middlewares/authMiddleware');
const { getMyAnnouncements, getNewAnnouncementCount, getLatestAnnouncements, markAnnouncementsViewed } = require('../controllers/announcementController');
const { getStudentDashboard } = require('../controllers/dashboardController');
const { changePassword, getNotifications, markNotificationsRead, updateProfilePicture, updateUserInfo } = require('../controllers/userController');


router.put('/change-password', protect, changePassword);

// Shared Announcement Discovery (Role-based filtering happens inside)
router.get('/announcements', protect, getMyAnnouncements);
router.get('/announcements/count', protect, getNewAnnouncementCount);

// Add this route for the Dashboard Widget
router.get('/announcements/latest', protect, getLatestAnnouncements);
router.post('/announcements/mark-viewed', protect, markAnnouncementsViewed);

// Add Student Dashboard

router.get('/dashboard', protect, authorize('student'), getStudentDashboard);


router.get('/notifications', protect, getNotifications);
router.put('/notifications/read-all', protect, markNotificationsRead);

router.put('/profile-picture', protect, updateProfilePicture);

router.put('/update-info', protect, updateUserInfo);

module.exports = router;