const express = require('express');
const { body } = require('express-validator');
const {
  sendInvite,
  getReceivedInvites,
  getSentInvites,
  respondToInvite,
  getConnections,
} = require('../controllers/collaborationController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateInput');

const router = express.Router();

router.use(authMiddleware);

// POST /api/collaboration/invite
router.post(
  '/invite',
  [
    body('toEmail').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
    body('ideaId').notEmpty().withMessage('Idea ID is required.'),
    body('role')
      .optional()
      .isIn(['Founder', 'Developer', 'Marketer', 'Designer', 'Collaborator'])
      .withMessage('Invalid role.'),
  ],
  validateRequest,
  sendInvite
);

// GET /api/collaboration/invites
router.get('/invites', getReceivedInvites);

// GET /api/collaboration/sent-invites
router.get('/sent-invites', getSentInvites);

// PATCH /api/collaboration/invite/:inviteId
router.patch(
  '/invite/:inviteId',
  [body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject.')],
  validateRequest,
  respondToInvite
);

// GET /api/collaboration/connections
router.get('/connections', getConnections);

module.exports = router;
