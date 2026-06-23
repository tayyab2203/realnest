// Single source of truth for subscription plans, prices, limits and benefits.
// Both controllers and the frontend (via /api/subscription/plans) read from here
// so pricing/feature edits ripple through the whole app from a single file.

export const PLAN_FREE = 'FREE';
export const PLAN_PRO = 'PRO';
export const PLAN_AGENCY = 'AGENCY';

export const STATUS_INACTIVE = 'INACTIVE';
export const STATUS_ACTIVE = 'ACTIVE';
export const STATUS_EXPIRED = 'EXPIRED';
export const STATUS_CANCELLED = 'CANCELLED';

export const SUBSCRIPTION_DURATION_DAYS = 30;

// Sentinel meaning "no upper bound" — Prisma can't store Infinity, so we
// persist this large integer when a plan grants unlimited listings.
export const UNLIMITED_LISTINGS = 9999;

export const PLANS = {
  [PLAN_FREE]: {
    id: PLAN_FREE,
    name: 'Free',
    tagline: 'Get started for free',
    priceMonthly: 0,
    currency: 'PKR',
    listingLimit: 2,
    canBoost: false,
    canAccessAnalytics: false,
    isVerified: false,
    isAgency: false,
    priorityRanking: false,
    multiAgent: false,
    bulkManagement: false,
    features: [
      'Up to 2 active property listings',
      'Basic visibility in search',
      'Standard support',
    ],
    notIncluded: [
      'Boosted listings (Hot / Premium / Platinum)',
      'Seller analytics dashboard',
      'Verified seller badge',
      'Priority listing ranking',
    ],
  },
  [PLAN_PRO]: {
    id: PLAN_PRO,
    name: 'Pro Seller',
    tagline: 'For active sellers who need more reach',
    priceMonthly: 2999,
    currency: 'PKR',
    listingLimit: UNLIMITED_LISTINGS,
    canBoost: true,
    canAccessAnalytics: true,
    isVerified: true,
    isAgency: false,
    priorityRanking: true,
    multiAgent: false,
    bulkManagement: false,
    features: [
      'Unlimited property listings',
      'Hot / Premium / Platinum boosts',
      'Seller analytics dashboard',
      'Verified seller badge',
      'Priority listing ranking',
    ],
    notIncluded: [
      'Multi-agent management',
      'Company / agency profile',
      'Bulk listing management',
    ],
  },
  [PLAN_AGENCY]: {
    id: PLAN_AGENCY,
    name: 'Agency / Enterprise',
    tagline: 'For real estate agencies and teams',
    priceMonthly: 7999,
    currency: 'PKR',
    listingLimit: UNLIMITED_LISTINGS,
    canBoost: true,
    canAccessAnalytics: true,
    isVerified: true,
    isAgency: true,
    priorityRanking: true,
    multiAgent: true,
    bulkManagement: true,
    features: [
      'Everything in Pro Seller',
      'Multi-agent management',
      'Company / agency profile',
      'Bulk listing management',
      'Premium boosts included',
      'Priority support',
      'Verified agency badge',
    ],
    notIncluded: [],
  },
};

export const isUpgradeable = (currentPlan, targetPlan) => {
  const order = { [PLAN_FREE]: 0, [PLAN_PRO]: 1, [PLAN_AGENCY]: 2 };
  return order[targetPlan] > order[currentPlan];
};

export const getPlan = (planId) => PLANS[planId] || PLANS[PLAN_FREE];
