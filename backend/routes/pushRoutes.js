const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { subscribe, unsubscribe, getVapidPublicKey } = require('../controllers/pushController');

router.get('/vapid-public-key', getVapidPublicKey);          // Public
router.post('/subscribe',   protect, subscribe);              // Private
router.post('/unsubscribe', protect, unsubscribe);            // Private

module.exports = router;