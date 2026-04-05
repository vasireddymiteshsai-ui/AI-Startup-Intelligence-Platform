const { getDb } = require('../services/firebaseService');
const { generateEmbedding } = require('../services/aiService');
const { findSimilarIdeas, textSimilarity } = require('../services/similarityService');

const SIMILARITY_THRESHOLD = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.35;

/**
 * POST /api/ideas
 * Submit a new startup idea.
 * Checks for duplicates across ALL users, generates embedding for similarity detection.
 */
async function submitIdea(req, res) {
  try {
    const { ideaText } = req.body;
    const { email } = req.user;
    const db = getDb();

    // Check for exact duplicate from same user
    const existing = await db
      .collection('ideas')
      .where('userEmail', '==', email)
      .where('ideaText', '==', ideaText)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({ error: 'You have already submitted this exact idea.' });
    }

    // Check for highly similar ideas across ALL users
    const allSnapshot = await db.collection('ideas').get();
    const allIdeas = allSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const crossUserDuplicates = [];
    for (const idea of allIdeas) {
      const sim = textSimilarity(ideaText, idea.ideaText);
      if (sim > 0.7) {
        crossUserDuplicates.push({
          id: idea.id,
          ideaText: idea.ideaText,
          userEmail: idea.userEmail,
          userName: idea.userName || idea.userEmail?.split('@')[0],
          similarity: parseFloat((sim * 100).toFixed(1)),
        });
      }
    }

    // Generate embedding asynchronously
    const embedding = await generateEmbedding(ideaText);

    // Detect category from idea text
    const category = detectCategory(ideaText);

    const ideaDoc = {
      ideaText,
      userEmail: email,
      userName: req.user.name || email.split('@')[0],
      embedding: embedding || null,
      category,
      scores: null,
      analysis: null,
      mvpPlan: null,
      timestamp: new Date().toISOString(),
      collaborators: [],
    };

    const docRef = await db.collection('ideas').add(ideaDoc);

    // Update user idea count
    const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!userSnap.empty) {
      await userSnap.docs[0].ref.update({
        ideasCount: (userSnap.docs[0].data().ideasCount || 0) + 1,
      });
    }

    // Return with duplicate warning if similar ideas exist
    const response = {
      message: 'Idea submitted successfully.',
      ideaId: docRef.id,
    };

    if (crossUserDuplicates.length > 0) {
      response.warning = 'Similar ideas already exist on the platform!';
      response.similarIdeas = crossUserDuplicates;
      response.suggestion = 'Consider collaborating with these founders. Visit the Invites page to connect.';
    }

    return res.status(201).json(response);
  } catch (err) {
    console.error('submitIdea error:', err);
    return res.status(500).json({ error: 'Failed to submit idea. Please try again.' });
  }
}

/**
 * GET /api/ideas
 * Get all ideas for the current user.
 */
async function getMyIdeas(req, res) {
  try {
    const { email } = req.user;
    const db = getDb();

    const snapshot = await db
      .collection('ideas')
      .where('userEmail', '==', email)
      .get();

    const ideas = snapshot.docs.map((doc) => {
      const data = doc.data();
      const { embedding, ...rest } = data;
      return { id: doc.id, ...rest };
    });

    ideas.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    return res.json({ ideas });
  } catch (err) {
    console.error('getMyIdeas error:', err);
    return res.status(500).json({ error: 'Failed to fetch ideas.' });
  }
}

/**
 * GET /api/ideas/:id
 * Get a single idea by ID.
 */
async function getIdeaById(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const doc = await db.collection('ideas').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Idea not found.' });
    }

    const data = doc.data();
    const { embedding, ...rest } = data;

    return res.json({ idea: { id: doc.id, ...rest } });
  } catch (err) {
    console.error('getIdeaById error:', err);
    return res.status(500).json({ error: 'Failed to fetch idea.' });
  }
}

/**
 * GET /api/ideas/:id/similar
 * Find semantically similar ideas using hybrid text + embedding similarity.
 * Returns ideas from OTHER users that are similar, enabling collaboration.
 */
async function getSimilarIdeas(req, res) {
  try {
    const { id } = req.params;
    const { email } = req.user;
    const db = getDb();

    // Get the target idea
    const ideaDoc = await db.collection('ideas').doc(id).get();
    if (!ideaDoc.exists) {
      return res.status(404).json({ error: 'Idea not found.' });
    }

    const ideaData = ideaDoc.data();

    // Fetch ALL ideas in the platform
    const allSnapshot = await db.collection('ideas').get();
    const allIdeas = allSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Find similar ideas using hybrid matching (text + embedding)
    const similar = findSimilarIdeas(
      ideaData.ideaText,
      ideaData.embedding,
      allIdeas,
      id,             // exclude this idea
      email,          // current user email
      SIMILARITY_THRESHOLD
    );

    return res.json({ similarIdeas: similar });
  } catch (err) {
    console.error('getSimilarIdeas error:', err);
    return res.status(500).json({ error: 'Failed to find similar ideas.' });
  }
}

/**
 * Simple heuristic category detection from idea text.
 */
function detectCategory(text) {
  const lower = text.toLowerCase();
  if (/health|medical|doctor|patient|hospital|wellness|fitness|pharma|clinic/.test(lower)) return 'HealthTech';
  if (/fintech|finance|payment|banking|invest|crypto|wallet|insurance/.test(lower)) return 'FinTech';
  if (/edu|learn|student|teach|school|course|tutor|university/.test(lower)) return 'EdTech';
  if (/\bai\b|machine learning|ml\b|nlp|model|chatbot|gpt|deep learning/.test(lower)) return 'AI/ML';
  if (/saas|software|platform|tool|dashboard|api|automation/.test(lower)) return 'SaaS';
  if (/ecommerce|shop|marketplace|retail|sell|buy|store/.test(lower)) return 'E-Commerce';
  if (/social|community|network|connect|chat|messaging/.test(lower)) return 'Social';
  if (/food|restaurant|delivery|meal|recipe|kitchen/.test(lower)) return 'FoodTech';
  if (/travel|hotel|booking|trip|tourism|flight/.test(lower)) return 'TravelTech';
  if (/game|gaming|entertainment|metaverse|vr|ar|virtual/.test(lower)) return 'Gaming/XR';
  if (/climate|green|sustainability|environment|energy|solar/.test(lower)) return 'CleanTech';
  if (/hr|recruit|job|talent|workforce|employee|hiring/.test(lower)) return 'HRTech';
  if (/security|privacy|lock|protect|cyber|encrypt/.test(lower)) return 'CyberSecurity';
  if (/logistic|supply chain|shipping|warehouse|fleet/.test(lower)) return 'Logistics';
  return 'Other';
}

module.exports = { submitIdea, getMyIdeas, getIdeaById, getSimilarIdeas };
