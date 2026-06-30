const express = require('express');
const router = express.Router();
const { adminLogin, studentLogin, teacherLogin, createFirstAdmin } = require('../controllers/authController');

router.post('/admin-login', adminLogin);
router.post('/student-login', studentLogin);
router.post('/teacher-login', teacherLogin);
router.post('/create-secret-admin-12345', createFirstAdmin);

module.exports = router;