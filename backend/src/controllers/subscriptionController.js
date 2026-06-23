import prisma from '../lib/prisma.js';
import {
  PLANS,
  PLAN_FREE,
  PLAN_PRO,
  PLAN_AGENCY,
  isUpgradeable,
} from '../config/subscriptionPlans.js';
import {
  activateSubscription,
  cancelSubscription,
  getSubscriptionSnapshot,
} from '../services/subscriptionService.js';

// GET /api/subscription/plans  (public)
// Lets the frontend render pricing cards from a single source of truth.
export const listPlans = (_req, res) => {
  return res.json({
    plans: Object.values(PLANS).map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      priceMonthly: p.priceMonthly,
      currency: p.currency,
      listingLimit: p.listingLimit,
      canBoost: p.canBoost,
      canAccessAnalytics: p.canAccessAnalytics,
      isVerified: p.isVerified,
      isAgency: p.isAgency,
      priorityRanking: p.priorityRanking,
      multiAgent: p.multiAgent,
      bulkManagement: p.bulkManagement,
      features: p.features,
      notIncluded: p.notIncluded,
    })),
  });
};

// GET /api/subscription/me  (authenticated)
// Returns the current plan, expiry, listing usage and entitlements.
export const getMySubscription = async (req, res) => {
  try {
    const snapshot = await getSubscriptionSnapshot(req.user.profile.id);
    return res.json({ subscription: snapshot });
  } catch (err) {
    console.error('Get subscription error:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Failed to fetch subscription',
    });
  }
};

// GET /api/subscription/transactions  (authenticated)
// Lets a user see their subscription payment history.
export const getMySubscriptionTransactions = async (req, res) => {
  try {
    const transactions = await prisma.subscriptionTransaction.findMany({
      where: { userId: req.user.profile.id },
      orderBy: { transactionDate: 'desc' },
    });
    return res.json({ transactions });
  } catch (err) {
    console.error('Get subscription transactions error:', err);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

const upgradeToPlan = (planKey) => async (req, res) => {
  if (req.user.profile.role !== 'SELLER') {
    return res.status(403).json({
      error: 'Only sellers can subscribe to a paid plan',
    });
  }

  const { transactionId, paidAmount } = req.body;

  if (!transactionId || typeof transactionId !== 'string') {
    return res.status(400).json({
      error: 'transactionId from the simulated payment is required',
    });
  }

  // Allow same-tier renewals but block downgrades through this endpoint.
  const currentPlan = req.user.profile.subscriptionPlan || PLAN_FREE;
  if (
    currentPlan !== PLAN_FREE &&
    currentPlan !== planKey &&
    !isUpgradeable(currentPlan, planKey)
  ) {
    return res.status(400).json({
      error: `You cannot downgrade from ${currentPlan} to ${planKey} via this endpoint`,
    });
  }

  try {
    const result = await activateSubscription({
      profileId: req.user.profile.id,
      plan: planKey,
      externalTxnId: transactionId,
      paidAmount,
    });

    return res.status(result.alreadyProcessed ? 200 : 201).json({
      message: result.alreadyProcessed
        ? 'Transaction already processed'
        : `Subscription upgraded to ${PLANS[planKey].name}`,
      subscription: {
        plan: result.profile.subscriptionPlan,
        status: result.profile.subscriptionStatus,
        startDate: result.profile.subscriptionStartDate,
        endDate: result.profile.subscriptionEndDate,
        listingLimit: result.profile.listingLimit,
        isVerified: result.profile.isVerified,
      },
      transaction: result.transaction,
    });
  } catch (err) {
    console.error(`Upgrade to ${planKey} error:`, err);
    return res
      .status(err.status || 500)
      .json({ error: err.message || `Failed to upgrade to ${planKey}` });
  }
};

// POST /api/subscription/upgrade/pro
export const upgradeToPro = upgradeToPlan(PLAN_PRO);

// POST /api/subscription/upgrade/agency
export const upgradeToAgency = upgradeToPlan(PLAN_AGENCY);

// POST /api/subscription/cancel
export const cancelMySubscription = async (req, res) => {
  try {
    const result = await cancelSubscription(req.user.profile.id);
    return res.json({
      message: result.alreadyFree
        ? 'You are already on the Free plan'
        : 'Subscription cancelled — you keep premium access until the end of the current period',
      subscription: {
        plan: result.profile.subscriptionPlan,
        status: result.profile.subscriptionStatus,
        endDate: result.profile.subscriptionEndDate,
      },
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    return res
      .status(err.status || 500)
      .json({ error: err.message || 'Failed to cancel subscription' });
  }
};
