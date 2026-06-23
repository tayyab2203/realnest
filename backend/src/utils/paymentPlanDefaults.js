/** Mirrors frontend paymentPlans.js — used when embedding plan in PDFs. */

export const SALE_PAYMENT_PLANS = [
  {
    id: 'society_standard',
    name: 'Society Standard (DHA / Bahria style)',
    tokenPct: 0.2,
    possessionPct: 0.3,
    balancePct: 0.5,
    tokenDueDays: 7,
    possessionDueDays: 60,
    balanceDueDaysAfterPossession: 180,
  },
  {
    id: 'smart_city_balanced',
    name: 'Smart City Balanced',
    tokenPct: 0.15,
    possessionPct: 0.35,
    balancePct: 0.5,
    tokenDueDays: 14,
    possessionDueDays: 90,
    balanceDueDaysAfterPossession: 365,
  },
  {
    id: 'accelerated_token',
    name: 'Accelerated Token',
    tokenPct: 0.3,
    possessionPct: 0.3,
    balancePct: 0.4,
    tokenDueDays: 7,
    possessionDueDays: 45,
    balanceDueDaysAfterPossession: 120,
  },
];

export const RENT_PAYMENT_PLANS = [
  {
    id: 'standard_lease',
    name: 'Standard lease (Pakistan practice)',
    securityMonths: 2,
    advanceMonths: 2,
    dueDayOfMonth: 1,
    leaseMonths: 12,
  },
  {
    id: 'reduced_deposit',
    name: 'Reduced deposit',
    securityMonths: 1,
    advanceMonths: 1,
    dueDayOfMonth: 5,
    leaseMonths: 12,
  },
];

export function getSalePlanById(planId) {
  return SALE_PAYMENT_PLANS.find((p) => p.id === planId) || SALE_PAYMENT_PLANS[0];
}

export function getRentPlanById(planId) {
  return RENT_PAYMENT_PLANS.find((p) => p.id === planId) || RENT_PAYMENT_PLANS[0];
}

export function computeSaleAmounts(totalPrice, plan) {
  const p = plan || SALE_PAYMENT_PLANS[0];
  const token = Math.round(totalPrice * p.tokenPct);
  const onPoss = Math.round(totalPrice * p.possessionPct);
  const balance = Math.round((totalPrice - token - onPoss) * 100) / 100;
  return { token, onPoss, balance, plan: p };
}

export function computeRentAmounts(monthlyRent, plan) {
  const p = plan || RENT_PAYMENT_PLANS[0];
  return {
    security: Math.round(monthlyRent * p.securityMonths),
    advance: Math.round(monthlyRent * p.advanceMonths),
    monthly: monthlyRent,
    plan: p,
  };
}
