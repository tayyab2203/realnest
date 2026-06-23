import {
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineSparkles,
  HiOutlineRocketLaunch,
  HiOutlineBuildingOffice2,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';

const PLAN_VISUALS = {
  FREE: {
    icon: HiOutlineSparkles,
    accent: 'text-gray-700',
    chipBg: 'bg-gray-100',
    btn: 'bg-gray-900 hover:bg-black text-white',
    border: 'border-gray-200',
    gradient: 'from-gray-50 to-white',
  },
  PRO: {
    icon: HiOutlineRocketLaunch,
    accent: 'text-blue-700',
    chipBg: 'bg-blue-50',
    btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30',
    border: 'border-blue-200 ring-2 ring-blue-500/20',
    gradient: 'from-blue-50/60 via-white to-indigo-50/40',
  },
  AGENCY: {
    icon: HiOutlineBuildingOffice2,
    accent: 'text-violet-700',
    chipBg: 'bg-violet-50',
    btn: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-lg shadow-violet-500/30',
    border: 'border-violet-200',
    gradient: 'from-violet-50/60 via-white to-fuchsia-50/40',
  },
};

export default function SubscriptionCard({
  plan,
  isCurrent,
  isHighlighted,
  endDate,
  onSelect,
  isProcessing = false,
}) {
  const visuals = PLAN_VISUALS[plan.id] || PLAN_VISUALS.FREE;
  const Icon = visuals.icon;
  const priceLabel =
    plan.priceMonthly === 0
      ? 'Free'
      : `${plan.currency} ${Number(plan.priceMonthly).toLocaleString()}`;

  return (
    <div
      className={`relative rounded-3xl border bg-gradient-to-b ${visuals.gradient} p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${visuals.border} ${
        isHighlighted ? 'scale-[1.02]' : ''
      }`}
    >
      {isHighlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-blue-500/40">
            <HiOutlineSparkles className="h-3.5 w-3.5" /> Most Popular
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${visuals.chipBg}`}>
          <Icon className={`h-6 w-6 ${visuals.accent}`} />
        </div>
        <div>
          <h3 className={`text-lg font-bold ${visuals.accent}`}>{plan.name}</h3>
          <p className="text-xs text-gray-500">{plan.tagline}</p>
        </div>
      </div>

      <div className="mt-6 flex items-baseline gap-1.5">
        <span className="text-4xl font-extrabold text-gray-900 tracking-tight">
          {priceLabel}
        </span>
        {plan.priceMonthly > 0 && (
          <span className="text-sm font-medium text-gray-500">/month</span>
        )}
      </div>

      {isCurrent && (
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
          <HiOutlineShieldCheck className="h-3.5 w-3.5" />
          Current Plan
          {endDate && plan.priceMonthly > 0 && (
            <span className="text-emerald-700/70 font-normal">
              · until {new Date(endDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
      )}

      <ul className="mt-6 space-y-2.5">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
            <HiOutlineCheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
        {plan.notIncluded?.map((f, i) => (
          <li key={`x-${i}`} className="flex items-start gap-2.5 text-sm text-gray-400">
            <HiOutlineXCircle className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
            <span className="line-through">{f}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSelect}
        disabled={isCurrent || isProcessing}
        className={`mt-7 w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 ${
          isCurrent
            ? 'bg-gray-100 text-gray-500'
            : visuals.btn
        }`}
      >
        {isCurrent
          ? 'You are on this plan'
          : isProcessing
            ? 'Processing...'
            : plan.priceMonthly === 0
              ? 'Switch to Free'
              : `Upgrade to ${plan.name}`}
      </button>
    </div>
  );
}
