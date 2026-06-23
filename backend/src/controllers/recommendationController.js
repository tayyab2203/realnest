import { getRecommendations } from '../services/recommendations.js';

export const getRecommendationsForUser = async (req, res) => {
  const userId = req.user.profile.id;
  const limit = parseInt(req.query.limit) || 12;

  try {
    const recommendations = await getRecommendations(userId, limit);
    return res.json({ recommendations });
  } catch (err) {
    console.error('Recommendation error:', err);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
};
