/** Predefined checkout plans — aligned with Pakistan society-style sale schedules and common rent practice. */

export const SALE_PAYMENT_PLANS = [
  {
    id: 'society_standard',
    name: 'Society Standard (DHA / Bahria style)',
    description: '20% token within 7 days · 30% on possession · 50% balance within 180 days of possession',
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
    description: '15% booking within 14 days · 35% on possession · 50% within 12 months of possession',
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
    description: '30% token within 7 days · 30% on possession · 40% within 120 days of possession',
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
    description: '2 months security deposit · 2 months advance rent · monthly rent on the 1st',
    securityMonths: 2,
    advanceMonths: 2,
    dueDayOfMonth: 1,
    leaseMonths: 12,
  },
  {
    id: 'reduced_deposit',
    name: 'Reduced deposit',
    description: '1 month security · 1 month advance · monthly rent on the 5th',
    securityMonths: 1,
    advanceMonths: 1,
    dueDayOfMonth: 5,
    leaseMonths: 12,
  },
];

const STORAGE_PREFIX = 'realnest_checkout_plan_';

export function saveCheckoutPlan(propertyId, payload) {
  if (!propertyId) return;
  sessionStorage.setItem(`${STORAGE_PREFIX}${propertyId}`, JSON.stringify(payload));
}

export function loadCheckoutPlan(propertyId) {
  if (!propertyId) return null;
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${propertyId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

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
  const security = Math.round(monthlyRent * p.securityMonths);
  const advance = Math.round(monthlyRent * p.advanceMonths);
  return { security, advance, monthly: monthlyRent, plan: p };
}
