const { getDb } = require('../services/firebaseService');

/**
 * GET /api/trends
 * Return trending categories, high-scoring ideas, and domain stats.
 */
async function getTrends(req, res) {
  try {
    const db = getDb();

    // Fetch all ideas
    const snapshot = await db.collection('ideas').get();
    const ideas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    ideas.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    // Category frequency counts
    const categoryCounts = {};
    const recentIdeas = []; // past 30 days
    const highScoringIdeas = [];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    for (const idea of ideas) {
      // Count categories
      const cat = idea.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      // Collect recent ideas
      if (idea.timestamp >= thirtyDaysAgo) {
        recentIdeas.push(idea);
      }

      // Collect high-scoring ideas (overall_score >= 70)
      if (idea.scores && idea.scores.overall_score >= 70) {
        highScoringIdeas.push({
          id: idea.id,
          ideaText: idea.ideaText,
          userName: idea.userName || idea.userEmail.split('@')[0],
          overallScore: idea.scores.overall_score,
          category: idea.category || 'Other',
        });
      }
    }

    // Sort categories by frequency
    const trendingCategories = Object.entries(categoryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top high-scoring ideas
    const topIdeas = highScoringIdeas
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10);

    // Recent activity (ideas per day for past 7 days)
    const weeklyActivity = buildWeeklyActivity(ideas);

    return res.json({
      totalIdeas: ideas.length,
      recentCount: recentIdeas.length,
      trendingCategories,
      topIdeas,
      weeklyActivity,
    });
  } catch (err) {
    console.error('getTrends error:', err);
    return res.status(500).json({ error: 'Failed to fetch trend data.' });
  }
}

/**
 * Build array of {date, count} for the past 7 days.
 */
function buildWeeklyActivity(ideas) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = ideas.filter((idea) => idea.timestamp && idea.timestamp.startsWith(dateStr)).length;
    days.push({ date: dateStr, count });
  }
  return days;
}

module.exports = { getTrends };
