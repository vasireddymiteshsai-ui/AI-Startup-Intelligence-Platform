const express = require('express');
const { getTrends } = require('../controllers/trendsController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// GET /api/trends
router.get('/', getTrends);

module.exports = router;
