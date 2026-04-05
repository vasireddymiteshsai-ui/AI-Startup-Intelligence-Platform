const { getDb } = require('../services/firebaseService');

/**
 * POST /api/comments
 * Add a comment to an idea.
 */
async function addComment(req, res) {
  try {
    const { ideaId, text } = req.body;
    const { email } = req.user;
    const db = getDb();

    // Verify the idea exists
    const ideaDoc = await db.collection('ideas').doc(ideaId).get();
    if (!ideaDoc.exists) {
      return res.status(404).json({ error: 'Idea not found.' });
    }

    // Check if user is the owner or a collaborator
    const ideaData = ideaDoc.data();
    const isOwner = ideaData.userEmail === email;
    const isCollaborator = (ideaData.collaborators || []).includes(email);

    if (!isOwner && !isCollaborator) {
      // Check if there's a connection between them
      const connSnapshot = await db
        .collection('connections')
        .where('ideaId', '==', ideaId)
        .where('users', 'array-contains', email)
        .limit(1)
        .get();
      if (connSnapshot.empty) {
        return res.status(403).json({ error: 'You must be a collaborator to comment.' });
      }
    }

    const comment = {
      ideaId,
      userEmail: email,
      userName: req.user.name || email.split('@')[0],
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const ref = await db.collection('comments').add(comment);
    return res.status(201).json({ message: 'Comment added.', commentId: ref.id, comment });
  } catch (err) {
    console.error('addComment error:', err);
    return res.status(500).json({ error: 'Failed to add comment.' });
  }
}

/**
 * GET /api/comments/:ideaId
 * Get all comments for an idea.
 */
async function getComments(req, res) {
  try {
    const { ideaId } = req.params;
    const db = getDb();

    const snapshot = await db
      .collection('comments')
      .where('ideaId', '==', ideaId)
      .get();

    const comments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    comments.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    return res.json({ comments });
  } catch (err) {
    console.error('getComments error:', err);
    return res.status(500).json({ error: 'Failed to fetch comments.' });
  }
}

module.exports = { addComment, getComments };
