import { addDays, numberToWordsPkr, rentOrdinanceLine, saleGoverningLaw, regionFromCity } from './documentHelpers.js';
import { computeRentAmounts, computeSaleAmounts, getRentPlanById, getSalePlanById } from './paymentPlanDefaults.js';

export function formatPkt(dt) {
  if (!dt) return '';
  const d = dt instanceof Date ? dt : new Date(dt);
  return d.toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatCnicPlaceholder() {
  return 'XXXXX-XXXXXXX-X (on file with RealNest)';
}

export function buildSaleClauses(data, planId = 'society_standard') {
  const { document: d, property: p, seller: s, buyer: b } = data;
  const price = p.price;
  const words = numberToWordsPkr(price);
  const plan = getSalePlanById(planId);
  const { token, onPoss, balance } = computeSaleAmounts(price, plan);
  const generated = d.generatedAt || new Date();
  const possession = addDays(generated, plan.possessionDueDays);
  const tokenDue = addDays(generated, plan.tokenDueDays);
  const balanceDue = addDays(possession, plan.balanceDueDaysAfterPossession);
  const penaltySeller = Math.round(price * 0.05);
  const penaltyBuyer = Math.round(price * 0.02);
  const law = saleGoverningLaw(p.city);

  return [
    {
      title: 'PROPERTY PURCHASE DEED (AGREEMENT FOR SALE)',
      body: `This instrument records an outright purchase (not a tenancy), styled after agreements used in planned communities such as DHA, Bahria Town, and Smart City developments. Agreement ID: ${d.id}. Generated: ${formatPkt(generated)} PKT. Between ${s?.name || 'Seller'} ("Seller") and ${b?.name || 'Buyer'} ("Buyer").`,
    },
    {
      title: '1. Parties',
      body: `Seller: ${s?.name || '—'}, CNIC ${formatCnicPlaceholder()}, email ${s?.email || '—'}, phone ${s?.phone || '—'}.\nBuyer: ${b?.name || '—'}, CNIC ${formatCnicPlaceholder()}, email ${b?.email || '—'}, phone ${b?.phone || '—'}.`,
    },
    {
      title: '2. Property particulars',
      body: `Title: ${p.title}. Address: ${p.address}, ${p.city}. Type: ${p.type}. Area: ${p.area} sq ft. Bedrooms/Baths: ${p.bedrooms}/${p.bathrooms}.`,
    },
    {
      title: '3. Total property value',
      body: `PKR ${price.toLocaleString('en-PK')} (${words} Rupees only).`,
    },
    {
      title: '4. Selected payment plan',
      body: `${plan.name}. Down payment (token): PKR ${token.toLocaleString('en-PK')} (${Math.round(plan.tokenPct * 100)}%). On possession: PKR ${onPoss.toLocaleString('en-PK')} (${Math.round(plan.possessionPct * 100)}%). Balance: PKR ${balance.toLocaleString('en-PK')} (${Math.round(plan.balancePct * 100)}%).`,
    },
    {
      title: '5. Installment breakdown & due dates',
      body: `Token/earnest: PKR ${token.toLocaleString('en-PK')} due by ${formatPkt(tokenDue)}. On possession: PKR ${onPoss.toLocaleString('en-PK')} due on or before ${formatPkt(possession)}. Balance: PKR ${balance.toLocaleString('en-PK')} due by ${formatPkt(balanceDue)}.`,
    },
    {
      title: '6. Possession conditions',
      body: `Vacant/physical possession upon receipt of token and clearance of society/authority dues known to Seller, subject to Buyer completing KYC on RealNest. Delay beyond ${formatPkt(possession)} without force majeure may trigger remedies in clause 8.`,
    },
    {
      title: '7. Ownership transfer',
      body: 'Seller shall cooperate in registration/transfer (sale deed, mutation, society transfer) after receipt of agreed installments and applicable government charges paid by Buyer unless otherwise agreed in writing.',
    },
    {
      title: '8. Late payment penalties',
      body: `After 15 days written notice via RealNest, late installments may attract mark-up at 2% per month on overdue amount and liquidated inconvenience of PKR ${penaltyBuyer.toLocaleString('en-PK')} for Buyer default. Seller delay in possession may attract PKR ${penaltySeller.toLocaleString('en-PK')} subject to court discretion.`,
    },
    {
      title: '9. Tax responsibilities',
      body: 'Buyer bears stamp duty, registration, withholding tax (where applicable), and transfer fees unless law mandates otherwise. Seller bears capital gains/withholding on seller side as per FBR rules at time of transfer.',
    },
    {
      title: '10. Cancellation & refund',
      body: 'Token may be forfeited if Buyer defaults after notice. If Seller cannot deliver title, token and documented payments shall be refunded within 30 days minus bona fide third-party costs disclosed in writing.',
    },
    {
      title: '11. Fraud prevention',
      body: 'Parties confirm identities via RealNest OTP. Any misrepresentation of title, encumbrance, or identity may void this agreement and be reported to authorities. Payments only through RealNest checkout for traceability.',
    },
    {
      title: '12. Digital signatures & electronic consent',
      body: 'Seller and Buyer signatures are captured via OTP on RealNest with timestamp and IP log. Electronic consent is valid under the Electronic Transactions Ordinance, 2002 (Pakistan).',
    },
    {
      title: '13. Legal jurisdiction',
      body: `${law} Courts at ${p.city} shall have exclusive jurisdiction subject to mandatory consumer forums.`,
    },
    {
      title: '14. Force majeure',
      body: 'Neither party is liable for delay due to acts of God, war, civil unrest, government orders, or infrastructure failure beyond reasonable control, provided notice is given within 7 days.',
    },
    {
      title: '15. Signature blocks',
      body: `Seller: _________________________  Date: _________\nBuyer: _________________________  Date: _________\n(Digitally executed on RealNest when OTP verified.)`,
    },
  ];
}

export function buildRentClauses(data, planId = 'standard_lease') {
  const { document: d, property: p, seller: s, buyer: b } = data;
  const monthly = p.price;
  const plan = getRentPlanById(planId);
  const { security, advance } = computeRentAmounts(monthly, plan);
  const start = d.generatedAt || new Date();
  const end = addDays(start, plan.leaseMonths * 30);
  const ord = rentOrdinanceLine(p.city);

  return [
    {
      title: 'TENANCY / LEASE AGREEMENT',
      body: `Tenancy only (not a sale of title). Agreement ID: ${d.id}. Generated: ${formatPkt(start)} PKT. Landlord: ${s?.name || '—'}. Tenant: ${b?.name || '—'}.`,
    },
    {
      title: '1. Parties',
      body: `Landlord: ${s?.name || '—'}, CNIC ${formatCnicPlaceholder()}, ${s?.email || ''}, ${s?.phone || ''}.\nTenant: ${b?.name || '—'}, CNIC ${formatCnicPlaceholder()}, ${b?.email || ''}, ${b?.phone || ''}.`,
    },
    {
      title: '2. Premises',
      body: `${p.title}, ${p.address}, ${p.city}. Type: ${p.type}. Area: ${p.area} sq ft.`,
    },
    {
      title: '3. Lease term',
      body: `From ${formatPkt(start)} to ${formatPkt(end)} (${plan.leaseMonths} months) unless renewed in writing.`,
    },
    {
      title: '4. Rent, security & advance',
      body: `Monthly rent: PKR ${monthly.toLocaleString('en-PK')} (${numberToWordsPkr(monthly)} Rupees). Security: PKR ${security.toLocaleString('en-PK')} (${plan.securityMonths} month(s)). Advance: PKR ${advance.toLocaleString('en-PK')} (${plan.advanceMonths} month(s)). Plan: ${plan.name}.`,
    },
    {
      title: '5. Monthly payment due date',
      body: `Rent due on or before the ${plan.dueDayOfMonth}${plan.dueDayOfMonth === 1 ? 'st' : 'th'} of each calendar month via RealNest or agreed channel.`,
    },
    {
      title: '6. Utilities',
      body: 'Tenant pays metered electricity, gas, water, and internet unless included in rent in writing. Fixed charges and society maintenance as per society bylaws.',
    },
    {
      title: '7. Maintenance',
      body: 'Tenant: routine upkeep and damage caused by Tenant. Landlord: structural defects and major plumbing/electrical not caused by misuse.',
    },
    {
      title: '8. Visitors & subletting',
      body: 'No subletting or assignment without written Landlord consent. Long-term guests beyond 14 consecutive days require notice.',
    },
    {
      title: '9. Property damage liability',
      body: 'Tenant shall restore premises to fair wear except normal aging. Security deposit may be applied to arrears or damage after inspection.',
    },
    {
      title: '10. Eviction',
      body: 'As per applicable rent law and lease breach (non-payment after 15 days notice, illegal use, material damage). Court orders shall be followed.',
    },
    {
      title: '11. Late payment penalties',
      body: 'Late rent may attract PKR 500 per day after grace of 5 days, capped at one month rent, without prejudice to eviction rights.',
    },
    {
      title: '12. Renewal',
      body: 'Parties may renew by written addendum on RealNest at least 30 days before expiry. Rent revision per mutual agreement or applicable law.',
    },
    {
      title: '13. Electronic acceptance & signatures',
      body: 'OTP verification on RealNest constitutes electronic acceptance under ETO 2002. Digital signature log retained with agreement ID.',
    },
    {
      title: '14. Legal jurisdiction',
      body: `${ord} Region: ${regionFromCity(p.city)}. Courts at ${p.city}, Pakistan.`,
    },
    {
      title: '15. Signature blocks',
      body: `Landlord: _________________________  Date: _________\nTenant: _________________________  Date: _________`,
    },
  ];
}
