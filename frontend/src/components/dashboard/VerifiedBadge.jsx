import { HiOutlineShieldCheck, HiOutlineBuildingOffice2 } from 'react-icons/hi2';

/**
 * Trust badge shown next to seller / agency names. Three variants:
 *   - "seller"  → blue "Verified Seller"   (Pro plan)
 *   - "agency"  → violet "Verified Agency" (Agency plan)
 *   - "auto"    → infers from `plan` if you pass that instead
 *
 * Sizes: sm | md | lg.
 */
export default function VerifiedBadge({
  variant = 'seller',
  plan,
  size = 'sm',
  className = '',
  showLabel = true,
}) {
  // Auto-resolve variant from plan when caller passes a plan id.
  let resolved = variant;
  if (plan === 'AGENCY') resolved = 'agency';
  else if (plan === 'PRO') resolved = 'seller';
  else if (plan === 'FREE') return null;

  const isAgency = resolved === 'agency';
  const Icon = isAgency ? HiOutlineBuildingOffice2 : HiOutlineShieldCheck;
  const label = isAgency ? 'Verified Agency' : 'Verified Seller';

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    md: 'text-xs px-2 py-1 gap-1',
    lg: 'text-sm px-2.5 py-1 gap-1',
  };
  const iconSizes = { sm: 'h-3 w-3', md: 'h-3.5 w-3.5', lg: 'h-4 w-4' };

  const colorClasses = isAgency
    ? 'bg-violet-50 text-violet-700 border-violet-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${colorClasses} ${sizeClasses[size]} ${className}`}
      title={label}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
