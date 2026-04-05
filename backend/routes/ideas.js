const express = require('express');
const { body } = require('express-validator');
const { submitIdea, getMyIdeas, getIdeaById, getSimilarIdeas } = require('../controllers/ideasController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateInput');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// POST /api/ideas — submit new idea
router.post(
  '/',
  [
    body('ideaText')
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage('Idea must be between 20 and 2000 characters.'),
  ],
  validateRequest,
  submitIdea
);

// GET /api/ideas — get my ideas
router.get('/', getMyIdeas);

// GET /api/ideas/:id — get single idea
router.get('/:id', getIdeaById);

// GET /api/ideas/:id/similar — find similar ideas
router.get('/:id/similar', getSimilarIdeas);

module.exports = router;
