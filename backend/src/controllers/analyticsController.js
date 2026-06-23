import { buildSellerAnalytics } from '../services/analyticsService.js';
import { PLANS, PLAN_FREE } from '../config/subscriptionPlans.js';

// GET /api/analytics/seller
// Restricted to Pro / Agency plans (entitlement check is done here so the
// analytics route stays a single line in the routes file).
export const getSellerAnalytics = async (req, res) => {
  const profile = req.user.profile;

  if (profile.role !== 'SELLER') {
    return res.status(403).json({ error: 'Only sellers can view analytics' });
  }

  const planConfig = PLANS[profile.subscriptionPlan] || PLANS[PLAN_FREE];
  if (!planConfig.canAccessAnalytics) {
    return res.status(403).json({
      error:
        'Analytics dashboard is available on Pro and Agency plans. Please upgrade.',
      currentPlan: profile.subscriptionPlan,
      requiresUpgrade: true,
    });
  }

  try {
    const analytics = await buildSellerAnalytics(profile.id);
    return res.json({ analytics });
  } catch (err) {
    console.error('Get seller analytics error:', err);
    return res.status(500).json({ error: 'Failed to load analytics' });
  }
};
