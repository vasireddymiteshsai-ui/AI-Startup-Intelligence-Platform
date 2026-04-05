const { getDb } = require('../services/firebaseService');
const { analyzeIdea, scoreIdea, generateMVPPlan } = require('../services/aiService');

/**
 * POST /api/analysis/:ideaId
 * Run full AI analysis on a stored idea.
 * Stores results back to Firestore.
 */
async function runAnalysis(req, res) {
  try {
    const { ideaId } = req.params;
    const { email } = req.user;
    const db = getDb();

    // Verify idea belongs to user
    const ideaDoc = await db.collection('ideas').doc(ideaId).get();
    if (!ideaDoc.exists) {
      return res.status(404).json({ error: 'Idea not found.' });
    }

    const ideaData = ideaDoc.data();
    if (ideaData.userEmail !== email) {
      return res.status(403).json({ error: 'You do not have permission to analyze this idea.' });
    }

    const { ideaText } = ideaData;

    // Run AI calls sequentially with delays to avoid rate limiting on free tier
    const analysis = await analyzeIdea(ideaText);
    await new Promise(r => setTimeout(r, 1500));
    const scores = await scoreIdea(ideaText);
    await new Promise(r => setTimeout(r, 1500));
    const mvpPlan = await generateMVPPlan(ideaText);

    // Store results in Firestore
    await db.collection('ideas').doc(ideaId).update({
      analysis,
      scores,
      mvpPlan,
      analyzedAt: new Date().toISOString(),
    });

    return res.json({
      message: 'Analysis complete.',
      analysis,
      scores,
      mvpPlan,
    });
  } catch (err) {
    console.error('runAnalysis error:', err);
    return res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
}

/**
 * GET /api/analysis/:ideaId
 * Retrieve stored analysis results for an idea.
 */
async function getAnalysis(req, res) {
  try {
    const { ideaId } = req.params;
    const db = getDb();

    const doc = await db.collection('ideas').doc(ideaId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Idea not found.' });
    }

    const { analysis, scores, mvpPlan, analyzedAt, ideaText } = doc.data();

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not yet run for this idea.' });
    }

    // If the stored analysis has old fallback data, force re-analysis
    const isStaleDefault = analysis.summary === 'Analysis unavailable at this time.' || 
                           (scores && scores.market_demand === 50 && scores.monetization_potential === 50 && scores.overall_score === 50);
    if (isStaleDefault) {
      return res.status(404).json({ error: 'Previous analysis was incomplete. Please re-run.' });
    }

    return res.json({ analysis, scores, mvpPlan, analyzedAt, ideaText });
  } catch (err) {
    console.error('getAnalysis error:', err);
    return res.status(500).json({ error: 'Failed to retrieve analysis.' });
  }
}

module.exports = { runAnalysis, getAnalysis };
