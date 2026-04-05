/**
 * Cosine similarity between two numeric vectors.
 * Returns a value between -1 and 1 (higher = more similar).
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  const magnitudeProduct = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (magnitudeProduct === 0) return 0;

  return dotProduct / magnitudeProduct;
}

/**
 * Text-based similarity using word overlap (Jaccard-like).
 * Works reliably even without AI embeddings.
 */
function textSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  
  // Normalize: lowercase, remove punctuation, split to words
  const normalize = (t) => t.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2); // skip tiny words like "a", "to", "is"
  
  const wordsA = new Set(normalize(textA));
  const wordsB = new Set(normalize(textB));
  
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  
  // Count intersection
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }
  
  // Jaccard coefficient
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Find ideas that are similar to a given idea.
 * Uses hybrid approach: text similarity + embedding cosine similarity.
 * @param {string} queryText - the idea text to compare
 * @param {Array<number>|null} queryEmbedding - embedding of the new idea (may be null)
 * @param {Array<{id, ideaText, embedding, userEmail, userName}>} allIdeas - all stored ideas
 * @param {string} excludeIdeaId - exclude this idea's own ID from results
 * @param {string} currentUserEmail - the current user's email
 * @param {number} threshold - minimum similarity to be considered "similar"
 * @returns {Array} Similar ideas with similarity score
 */
function findSimilarIdeas(queryText, queryEmbedding, allIdeas, excludeIdeaId, currentUserEmail, threshold = 0.35) {
  const results = [];

  for (const idea of allIdeas) {
    // Skip the same idea document
    if (idea.id === excludeIdeaId) continue;

    // Calculate text similarity (always works)
    const textSim = textSimilarity(queryText, idea.ideaText);
    
    // Calculate embedding similarity if both have embeddings
    let embeddingSim = 0;
    if (queryEmbedding && idea.embedding) {
      embeddingSim = cosineSimilarity(queryEmbedding, idea.embedding);
    }
    
    // Use the higher of text or embedding similarity
    const similarity = Math.max(textSim, embeddingSim);
    
    if (similarity >= threshold) {
      results.push({
        id: idea.id,
        ideaText: idea.ideaText,
        userEmail: idea.userEmail,
        userName: idea.userName || idea.userEmail?.split('@')[0] || 'Unknown',
        category: idea.category || 'Other',
        similarity: parseFloat(similarity.toFixed(4)),
        isExactMatch: textSim > 0.9,
        isSameUser: idea.userEmail === currentUserEmail,
      });
    }
  }

  // Sort by similarity descending
  return results.sort((a, b) => b.similarity - a.similarity);
}

module.exports = { cosineSimilarity, textSimilarity, findSimilarIdeas };
