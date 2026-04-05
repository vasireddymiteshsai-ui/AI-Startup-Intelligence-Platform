const express = require('express');
const { runAnalysis, getAnalysis } = require('../controllers/analysisController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// POST /api/analysis/:ideaId — trigger AI analysis
router.post('/:ideaId', runAnalysis);

// GET /api/analysis/:ideaId — retrieve stored analysis
router.get('/:ideaId', getAnalysis);

module.exports = router;
