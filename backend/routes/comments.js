const express = require('express');
const { body, param } = require('express-validator');
const { addComment, getComments } = require('../controllers/commentsController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateInput');

const router = express.Router();

router.use(authMiddleware);

// POST /api/comments
router.post(
  '/',
  [
    body('ideaId').notEmpty().withMessage('Idea ID is required.'),
    body('text')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Comment must be 1-500 characters.'),
  ],
  validateRequest,
  addComment
);

// GET /api/comments/:ideaId
router.get('/:ideaId', getComments);

module.exports = router;
