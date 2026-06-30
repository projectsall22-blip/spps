const express = require('express');
const router = express.Router(); // Fixed: removed the extra '.express'
const { registerStudent } = require('../controllers/studentController');

// Public route for student registration
router.post('/register', registerStudent);

module.exports = router;