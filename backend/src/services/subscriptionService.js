import prisma from '../lib/prisma.js';
import {
  PLANS,
  PLAN_FREE,
  PLAN_PRO,
  PLAN_AGENCY,
  STATUS_ACTIVE,
  STATUS_INACTIVE,
  STATUS_EXPIRED,
  SUBSCRIPTION_DURATION_DAYS,
  isUpgradeable,
} from '../config/subscriptionPlans.js';

const VALID_PLANS = new Set([PLAN_FREE, PLAN_PRO, PLAN_AGENCY]);

const addDays = (date, days) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * Apply the FREE-plan defaults to a profile when its subscription expires
 * or is cancelled. Returns the updated profile row.
 */
const revertToFreePlan = async (profileId) => {
  const freePlan = PLANS[PLAN_FREE];
  return prisma.profile.update({
    where: { id: profileId },
    data: {
      subscriptionPlan: PLAN_FREE,
      subscriptionStatus: STATUS_EXPIRED,
      subscriptionEndDate: null,
      listingLimit: freePlan.listingLimit,
      isVerified: false,
      verifiedBadge: false,
    },
  });
};

/**
 * Inspect a profile's subscription window. If the plan is non-free and the
 * end date has passed, downgrade to free + strip premium privileges. Safe to
 * call repeatedly — it's a no-op when nothing has expired.
 *
 * @param {object} profile — full Prisma profile row (must include subscription fields)
 * @returns {Promise<object>} the profile (refreshed if it was downgraded)
 */
export const checkSubscriptionExpiry = async (profile) => {
  if (!profile) return profile;
  if (profile.subscriptionPlan === PLAN_FREE) return profile;
  if (!profile.subscriptionEndDate) return profile;

  const now = new Date();
  const endsAt = new Date(profile.subscriptionEndDate);
  if (endsAt > now) return profile;

  return revertToFreePlan(profile.id);
};

/**
 * Activate (or extend) a paid subscription on the given profile.
 * Idempotent on `externalTxnId` — replaying the same simulated payment will
 * not double-count revenue.
 */
export const activateSubscription = async ({
  profileId,
  plan,
  externalTxnId,
  paidAmount,
}) => {
  if (!VALID_PLANS.has(plan)) {
    const err = new Error(`Unknown plan: ${plan}`);
    err.status = 400;
    throw err;
  }
  if (plan === PLAN_FREE) {
    const err = new Error('Free plan does not require activation');
    err.status = 400;
    throw err;
  }

  const planConfig = PLANS[plan];

  // Idempotency: if we've already recorded this txn, return the existing state.
  if (externalTxnId) {
    const existing = await prisma.subscriptionTransaction.findUnique({
      where: { externalTxnId },
    });
    if (existing) {
      const profile = await prisma.profile.findUnique({ where: { id: profileId } });
      return { profile, transaction: existing, alreadyProcessed: true };
    }
  }

  const startDate = new Date();
  const endDate = addDays(startDate, SUBSCRIPTION_DURATION_DAYS);

  const result = await prisma.$transaction(async (tx) => {
    const updatedProfile = await tx.profile.update({
      where: { id: profileId },
      data: {
        subscriptionPlan: plan,
        subscriptionStatus: STATUS_ACTIVE,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate,
        listingLimit: planConfig.listingLimit,
        isVerified: planConfig.isVerified,
        // Mirror to legacy verifiedBadge so existing UI keeps showing the badge.
        verifiedBadge: planConfig.isVerified,
      },
    });

    const transaction = await tx.subscriptionTransaction.create({
      data: {
        userId: profileId,
        plan,
        amount: paidAmount ?? planConfig.priceMonthly,
        paymentStatus: 'completed',
        externalTxnId: externalTxnId || null,
      },
    });

    return { profile: updatedProfile, transaction, alreadyProcessed: false };
  });

  return result;
};

/**
 * Manually cancel a subscription. Subscription remains active until the
 * paid period ends — we just flip the status flag so the user knows it
 * won't auto-renew (we have no real renewal logic, this is FYP-grade).
 */
export const cancelSubscription = async (profileId) => {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }
  if (profile.subscriptionPlan === PLAN_FREE) {
    return { profile, alreadyFree: true };
  }

  const updated = await prisma.profile.update({
    where: { id: profileId },
    data: {
      subscriptionStatus: 'CANCELLED',
    },
  });

  return { profile: updated, alreadyFree: false };
};

/**
 * Build a snapshot of a profile's current plan + entitlements that the
 * frontend can consume without needing to know about plan internals.
 */
export const getSubscriptionSnapshot = async (profileId) => {
  let profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) {
    const err = new Error('Profile not found');
    err.status = 404;
    throw err;
  }

  // Lazy expiry — never trust stale dates.
  profile = await checkSubscriptionExpiry(profile);

  const planConfig = PLANS[profile.subscriptionPlan] || PLANS[PLAN_FREE];

  // Count active listings to surface the limit warning in the dashboard.
  const activeListings = await prisma.property.count({
    where: {
      sellerId: profile.id,
      status: { notIn: ['SOLD', 'PAUSED'] },
    },
  });

  return {
    plan: profile.subscriptionPlan,
    status:
      profile.subscriptionPlan === PLAN_FREE
        ? STATUS_INACTIVE
        : profile.subscriptionStatus,
    startDate: profile.subscriptionStartDate,
    endDate: profile.subscriptionEndDate,
    listingLimit: planConfig.listingLimit,
    activeListings,
    isUnlimited: planConfig.listingLimit >= 9999,
    isVerified: planConfig.isVerified,
    canBoost: planConfig.canBoost,
    canAccessAnalytics: planConfig.canAccessAnalytics,
    isAgency: planConfig.isAgency,
    priorityRanking: planConfig.priorityRanking,
    multiAgent: planConfig.multiAgent,
    bulkManagement: planConfig.bulkManagement,
    planConfig,
  };
};

export {
  PLANS,
  PLAN_FREE,
  PLAN_PRO,
  PLAN_AGENCY,
  STATUS_ACTIVE,
  STATUS_INACTIVE,
  STATUS_EXPIRED,
  SUBSCRIPTION_DURATION_DAYS,
  isUpgradeable,
  revertToFreePlan,
};
