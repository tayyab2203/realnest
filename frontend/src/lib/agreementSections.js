import { formatCnicDisplay } from './documentDisplay';
import {
  computeRentAmounts,
  computeSaleAmounts,
  getRentPlanById,
  getSalePlanById,
  loadCheckoutPlan,
} from './paymentPlans';

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatPkt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function getAgreementClauses(doc) {
  if (!doc?.property) return [];
  const p = doc.property;
  const seller = doc.seller;
  const buyer = doc.buyer;
  const stored = loadCheckoutPlan(p.id);
  const generated = doc.generatedAt || new Date();

  if (doc.type === 'SALE_DEED') {
    const planId = stored?.salePlanId || 'society_standard';
    const plan = getSalePlanById(planId);
    const { token, onPoss, balance } = computeSaleAmounts(p.price, plan);
    const possession = addDays(generated, plan.possessionDueDays);
    const tokenDue = addDays(generated, plan.tokenDueDays);
    const balanceDue = addDays(possession, plan.balanceDueDaysAfterPossession);

    return [
      {
        title: 'Property Purchase Deed',
        body: `RealNest · Agreement ID ${doc.id} · Generated ${formatPkt(generated)} PKT. Outright purchase (not tenancy). Styled for Pakistan planned-community practice (DHA, Bahria Town, Smart City).`,
      },
      {
        title: 'Parties',
        body: `Seller: ${seller?.name} · CNIC ${formatCnicDisplay(seller)} · ${seller?.email} · ${seller?.phone || '—'}\nBuyer: ${buyer?.name || '—'} · CNIC ${formatCnicDisplay(buyer)} · ${buyer?.email || '—'} · ${buyer?.phone || '—'}`,
      },
      {
        title: 'Property',
        body: `${p.title} · ${p.address}, ${p.city} · ${p.type} · ${p.area} sq ft · ${p.bedrooms} bed / ${p.bathrooms} bath`,
      },
      {
        title: 'Total property value',
        body: `PKR ${Number(p.price).toLocaleString('en-PK')}`,
      },
      {
        title: 'Selected payment plan',
        body: `${plan.name} — ${plan.description}`,
      },
      {
        title: 'Down payment & installments',
        body: `Token (down payment): PKR ${token.toLocaleString('en-PK')} due by ${formatPkt(tokenDue)}.\nOn possession: PKR ${onPoss.toLocaleString('en-PK')} by ${formatPkt(possession)}.\nBalance: PKR ${balance.toLocaleString('en-PK')} by ${formatPkt(balanceDue)}.`,
      },
      {
        title: 'Possession & ownership transfer',
        body: 'Possession after token and disclosed dues clearance. Seller cooperates in registration/mutation after scheduled payments and government charges paid by Buyer.',
      },
      {
        title: 'Late payment penalties',
        body: '15 days notice via RealNest; 2% monthly mark-up on overdue installments may apply. Seller delay remedies as per deed PDF.',
      },
      {
        title: 'Taxes, cancellation, fraud prevention',
        body: 'Buyer: stamp duty, registration, transfer fees. Seller: seller-side withholding/CGT as per FBR. Token forfeiture on buyer default; seller refund if title fails. OTP identity verification required; pay only via RealNest.',
      },
      {
        title: 'Electronic consent & jurisdiction',
        body: 'Binding under Electronic Transactions Ordinance, 2002 (Pakistan). Courts at property city. Force majeure: notice within 7 days for qualifying events.',
      },
      {
        title: 'Digital signatures',
        body: 'Seller and Buyer signatures captured via OTP with timestamp. Placeholders satisfied upon full execution on RealNest.',
      },
    ];
  }

  const rentPlanId = stored?.rentPlanId || 'standard_lease';
  const plan = getRentPlanById(rentPlanId);
  const { security, advance } = computeRentAmounts(p.price, plan);
  const end = addDays(generated, plan.leaseMonths * 30);

  return [
    {
      title: 'Rental / Lease Agreement',
      body: `RealNest · Agreement ID ${doc.id} · Generated ${formatPkt(generated)} PKT. Tenancy only (not sale of title). Pakistan rental practice.`,
    },
    {
      title: 'Parties',
      body: `Landlord: ${seller?.name} · CNIC ${formatCnicDisplay(seller)}\nTenant: ${buyer?.name || '—'} · CNIC ${formatCnicDisplay(buyer)}`,
    },
    {
      title: 'Premises',
      body: `${p.title} · ${p.address}, ${p.city} · ${p.area} sq ft`,
    },
    {
      title: 'Lease term',
      body: `${formatPkt(generated)} to ${formatPkt(end)} (${plan.leaseMonths} months).`,
    },
    {
      title: 'Rent & deposits',
      body: `Monthly rent PKR ${Number(p.price).toLocaleString('en-PK')}. Security PKR ${security.toLocaleString('en-PK')} (${plan.securityMonths} mo). Advance PKR ${advance.toLocaleString('en-PK')} (${plan.advanceMonths} mo). Plan: ${plan.name}.`,
    },
    {
      title: 'Payment due date',
      body: `Rent due on the ${plan.dueDayOfMonth}${plan.dueDayOfMonth === 1 ? 'st' : 'th'} of each month.`,
    },
    {
      title: 'Utilities & maintenance',
      body: 'Tenant: metered utilities and routine upkeep. Landlord: structural repairs not caused by tenant misuse.',
    },
    {
      title: 'Visitors, subletting, damage',
      body: 'No subletting without consent. Guest notice over 14 days. Tenant liable for damage beyond fair wear; deposit may apply.',
    },
    {
      title: 'Eviction, late fees, renewal',
      body: 'Eviction per applicable rent law after notice. Late rent: PKR 500/day after 5-day grace (cap one month). Renewal 30 days before expiry via written addendum.',
    },
    {
      title: 'Electronic acceptance & jurisdiction',
      body: 'OTP acceptance under ETO 2002. Courts at property city, Pakistan.',
    },
    {
      title: 'Digital signatures',
      body: 'Landlord and Tenant OTP signatures with audit log on execution.',
    },
  ];
}
