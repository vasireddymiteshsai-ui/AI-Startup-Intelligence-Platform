const express = require('express');
const { body } = require('express-validator');
const { signup, login, getMe } = require('../controllers/authController');
const validateRequest = require('../middleware/validateInput');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/signup
router.post(
  '/signup',
  [
    body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters.'),
    body('role').optional().isIn(['Founder', 'Developer', 'Marketer', 'Designer', 'Other']),
  ],
  validateRequest,
  signup
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validateRequest,
  login
);

// GET /api/auth/me (protected)
router.get('/me', authMiddleware, getMe);

module.exports = router;
