const { getDb } = require('../services/firebaseService');

/**
 * POST /api/collaboration/invite
 * Send a collaboration invite to another user.
 */
async function sendInvite(req, res) {
  try {
    const { toEmail, ideaId, role } = req.body;
    const { email: fromEmail } = req.user;
    const db = getDb();

    if (toEmail.toLowerCase() === fromEmail.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot invite yourself.' });
    }

    // Verify target user exists
    const targetUser = await db
      .collection('users')
      .where('email', '==', toEmail.toLowerCase())
      .limit(1)
      .get();
    if (targetUser.empty) {
      return res.status(404).json({ error: 'User with that email not found.' });
    }

    // Verify idea exists and belongs to sender
    const ideaDoc = await db.collection('ideas').doc(ideaId).get();
    if (!ideaDoc.exists) {
      return res.status(404).json({ error: 'Idea not found.' });
    }

    // Check for duplicate pending invite
    const dupCheck = await db
      .collection('invites')
      .where('fromEmail', '==', fromEmail)
      .where('toEmail', '==', toEmail.toLowerCase())
      .where('ideaId', '==', ideaId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    if (!dupCheck.empty) {
      return res.status(409).json({ error: 'An invite has already been sent to this user for this idea.' });
    }

    const invite = {
      fromEmail,
      fromName: req.user.name || fromEmail.split('@')[0],
      toEmail: toEmail.toLowerCase(),
      ideaId,
      ideaText: ideaDoc.data().ideaText,
      role: role || 'Collaborator',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const ref = await db.collection('invites').add(invite);
    return res.status(201).json({ message: 'Invite sent successfully.', inviteId: ref.id });
  } catch (err) {
    console.error('sendInvite error:', err);
    return res.status(500).json({ error: 'Failed to send invite.' });
  }
}

/**
 * GET /api/collaboration/invites
 * Get all invites received by the current user.
 */
async function getReceivedInvites(req, res) {
  try {
    const { email } = req.user;
    const db = getDb();

    const snapshot = await db
      .collection('invites')
      .where('toEmail', '==', email)
      .get();

    const invites = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    invites.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return res.json({ invites });
  } catch (err) {
    console.error('getReceivedInvites error:', err);
    return res.status(500).json({ error: 'Failed to fetch invites.' });
  }
}

/**
 * GET /api/collaboration/sent-invites
 * Get all invites sent by the current user.
 */
async function getSentInvites(req, res) {
  try {
    const { email } = req.user;
    const db = getDb();

    const snapshot = await db
      .collection('invites')
      .where('fromEmail', '==', email)
      .get();

    const invites = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    invites.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return res.json({ invites });
  } catch (err) {
    console.error('getSentInvites error:', err);
    return res.status(500).json({ error: 'Failed to fetch sent invites.' });
  }
}

/**
 * PATCH /api/collaboration/invite/:inviteId
 * Accept or reject an invite.
 */
async function respondToInvite(req, res) {
  try {
    const { inviteId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const { email } = req.user;
    const db = getDb();

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be "accept" or "reject".' });
    }

    const inviteDoc = await db.collection('invites').doc(inviteId).get();
    if (!inviteDoc.exists) {
      return res.status(404).json({ error: 'Invite not found.' });
    }

    const invite = inviteDoc.data();
    if (invite.toEmail !== email) {
      return res.status(403).json({ error: 'You cannot respond to this invite.' });
    }
    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'This invite has already been responded to.' });
    }

    await inviteDoc.ref.update({ status: action === 'accept' ? 'accepted' : 'rejected' });

    // On accept → create connection
    if (action === 'accept') {
      // Check if connection already exists
      const existingConn = await db
        .collection('connections')
        .where('users', 'array-contains', email)
        .get();

      const alreadyConnected = existingConn.docs.some((doc) => {
        const data = doc.data();
        return data.users.includes(invite.fromEmail);
      });

      if (!alreadyConnected) {
        await db.collection('connections').add({
          users: [invite.fromEmail, email],
          ideaId: invite.ideaId,
          ideaText: invite.ideaText,
          roles: { [invite.fromEmail]: 'Founder', [email]: invite.role },
          connectedAt: new Date().toISOString(),
        });
      }
    }

    return res.json({ message: `Invite ${action}ed successfully.` });
  } catch (err) {
    console.error('respondToInvite error:', err);
    return res.status(500).json({ error: 'Failed to respond to invite.' });
  }
}

/**
 * GET /api/collaboration/connections
 * Get all connections for the current user.
 */
async function getConnections(req, res) {
  try {
    const { email } = req.user;
    const db = getDb();

    const snapshot = await db
      .collection('connections')
      .where('users', 'array-contains', email)
      .get();

    const connections = snapshot.docs.map((doc) => {
      const data = doc.data();
      const partnerEmail = data.users.find((u) => u !== email);
      return {
        id: doc.id,
        partnerEmail,
        ideaId: data.ideaId,
        ideaText: data.ideaText,
        myRole: data.roles?.[email] || 'Collaborator',
        partnerRole: data.roles?.[partnerEmail] || 'Collaborator',
        connectedAt: data.connectedAt,
      };
    });

    return res.json({ connections });
  } catch (err) {
    console.error('getConnections error:', err);
    return res.status(500).json({ error: 'Failed to fetch connections.' });
  }
}

module.exports = { sendInvite, getReceivedInvites, getSentInvites, respondToInvite, getConnections };
