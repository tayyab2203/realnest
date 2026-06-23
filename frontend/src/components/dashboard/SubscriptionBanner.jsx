import { Link } from 'react-router-dom';
import {
  HiOutlineRocketLaunch,
  HiOutlineExclamationTriangle,
  HiOutlineSparkles,
  HiOutlineArrowRight,
  HiOutlineShieldCheck,
} from 'react-icons/hi2';

/**
 * Surfaces the current plan, listing usage and any "limit reached" warnings.
 *
 * Free users:
 *   - shows a usage meter (e.g. "1 / 2 listings used")
 *   - flips into a stronger amber banner when the limit is reached
 *
 * Pro / Agency:
 *   - shows current plan + expiry date + a positive "unlimited" badge
 */
export default function SubscriptionBanner({ subscription }) {
  if (!subscription) return null;

  const isFree = subscription.plan === 'FREE';
  const isLimitReached =
    isFree && subscription.activeListings >= subscription.listingLimit;

  if (isFree && isLimitReached) {
    return (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 shadow-sm">
        <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 rounded-xl shrink-0">
              <HiOutlineExclamationTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Free plan limit reached. Upgrade to Pro for unlimited listings.
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                You're using {subscription.activeListings} of {subscription.listingLimit} active listings on the Free plan.
              </p>
            </div>
          </div>
          <Link
            to="/subscription"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-500/30 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-95 whitespace-nowrap"
          >
            <HiOutlineRocketLaunch className="h-4 w-4" />
            Upgrade to Pro
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (isFree) {
    return (
      <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 p-5 shadow-sm">
        <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-100 rounded-xl shrink-0">
              <HiOutlineSparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                You're on the Free plan
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                {subscription.activeListings} of {subscription.listingLimit} active listings used. Unlock unlimited listings, boosts and analytics with Pro.
              </p>
            </div>
          </div>
          <Link
            to="/subscription"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 whitespace-nowrap"
          >
            <HiOutlineRocketLaunch className="h-4 w-4" />
            Upgrade
            <HiOutlineArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Paid plan banner — celebratory tone, shows expiry.
  const planLabel = subscription.plan === 'PRO' ? 'Pro Seller' : 'Agency / Enterprise';
  const accent = subscription.plan === 'AGENCY' ? 'violet' : 'blue';
  const fromColor = accent === 'violet' ? 'from-violet-50' : 'from-blue-50';
  const viaColor = accent === 'violet' ? 'via-fuchsia-50' : 'via-indigo-50';
  const iconBg = accent === 'violet' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600';
  const borderColor = accent === 'violet' ? 'border-violet-200' : 'border-blue-200';
  const chipColor = accent === 'violet' ? 'bg-violet-600' : 'bg-blue-600';

  return (
    <div className={`mb-6 rounded-2xl border ${borderColor} bg-gradient-to-r ${fromColor} ${viaColor} to-white p-5 shadow-sm`}>
      <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>
            <HiOutlineShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900">
                You're on the {planLabel} plan
              </p>
              <span className={`inline-flex items-center gap-1 ${chipColor} text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full`}>
                Unlimited
              </span>
              {subscription.status === 'CANCELLED' && (
                <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                  Cancelled
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              {subscription.activeListings} active listings · Premium boosts and analytics enabled
              {subscription.endDate && (
                <span className="text-gray-500">
                  {' '}· Renews on {new Date(subscription.endDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
            </p>
          </div>
        </div>
        <Link
          to="/subscription"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all whitespace-nowrap"
        >
          Manage Plan
          <HiOutlineArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
