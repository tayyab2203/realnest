import prisma from '../lib/prisma.js';
import {
  PLANS,
  PLAN_FREE,
  UNLIMITED_LISTINGS,
} from '../config/subscriptionPlans.js';

/**
 * Blocks new listing creation when a seller has reached the cap for their plan.
 * "Active" means anything not SOLD or PAUSED — the same definition used in the
 * subscription snapshot so the dashboard banner and this guard agree.
 *
 * Free → 2 active listings. Pro / Agency → unlimited.
 *
 * On block: 403 + the user-facing copy from the spec so the frontend can pop
 * a toast/banner directing the user to upgrade.
 */
export const enforceListingLimit = async (req, res, next) => {
  try {
    const profile = req.user?.profile;
    if (!profile) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const plan = profile.subscriptionPlan || PLAN_FREE;
    const limit = PLANS[plan]?.listingLimit ?? PLANS[PLAN_FREE].listingLimit;

    if (limit >= UNLIMITED_LISTINGS) {
      return next();
    }

    const activeCount = await prisma.property.count({
      where: {
        sellerId: profile.id,
        status: { notIn: ['SOLD', 'PAUSED'] },
        archiveStatus: 'ACTIVE',
      },
    });

    if (activeCount >= limit) {
      return res.status(403).json({
        message:
          'Free plan allows maximum 2 listings. Upgrade to Pro for unlimited listings.',
        currentPlan: plan,
        listingLimit: limit,
        activeListings: activeCount,
        requiresUpgrade: true,
      });
    }

    return next();
  } catch (err) {
    console.error('enforceListingLimit error:', err);
    return res.status(500).json({ error: 'Failed to verify listing limit' });
  }
};
