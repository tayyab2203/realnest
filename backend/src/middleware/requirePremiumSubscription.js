import {
  PLAN_FREE,
  PLAN_PRO,
  PLAN_AGENCY,
} from '../config/subscriptionPlans.js';

const PREMIUM_PLANS = new Set([PLAN_PRO, PLAN_AGENCY]);

/**
 * Blocks routes that should only be available to paying customers (Pro / Agency).
 * Assumes `authenticate` (and therefore `checkSubscriptionExpiry`) has already
 * run, so `req.user.profile.subscriptionPlan` is fresh.
 *
 * @returns 403 with an upgrade prompt if the caller is on the FREE plan.
 */
export const requirePremiumSubscription = (req, res, next) => {
  const profile = req.user?.profile;

  if (!profile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const plan = profile.subscriptionPlan || PLAN_FREE;

  if (!PREMIUM_PLANS.has(plan)) {
    return res.status(403).json({
      error:
        'This feature requires a Pro or Agency subscription. Please upgrade your plan.',
      currentPlan: plan,
      requiresUpgrade: true,
    });
  }

  next();
};

/**
 * Stricter variant: only the Agency plan is allowed (e.g. multi-agent management).
 */
export const requireAgencySubscription = (req, res, next) => {
  const profile = req.user?.profile;

  if (!profile) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (profile.subscriptionPlan !== PLAN_AGENCY) {
    return res.status(403).json({
      error:
        'This feature is exclusive to the Agency / Enterprise plan. Please upgrade.',
      currentPlan: profile.subscriptionPlan,
      requiresUpgrade: true,
    });
  }

  next();
};
