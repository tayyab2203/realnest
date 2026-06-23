import { Link } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineEye,
  HiOutlineBookmark,
  HiOutlineChatBubbleLeftRight,
  HiOutlineFire,
  HiOutlineCurrencyDollar,
  HiOutlineCheckBadge,
  HiOutlinePauseCircle,
  HiOutlineRocketLaunch,
  HiOutlineLockClosed,
  HiOutlineSparkles,
  HiOutlineChartBar,
} from 'react-icons/hi2';
import { useSellerAnalytics } from '../../hooks/useAnalytics';

const formatNumber = (n) => Number(n || 0).toLocaleString();
const formatPkr = (n) => `PKR ${formatNumber(n)}`;

const StatTile = ({ icon, label, value, accent = 'blue', sub }) => {
  const Icon = icon;
  const palette = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl shrink-0 ${palette[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

/**
 * Renders the seller analytics dashboard. Free users see an upgrade lock
 * card instead of stats; Pro / Agency users see full KPIs.
 *
 * @param {object} subscription — current subscription snapshot from useMySubscription()
 */
export default function SellerAnalyticsPanel({ subscription }) {
  const isPremium =
    subscription && (subscription.plan === 'PRO' || subscription.plan === 'AGENCY');

  const { data: analytics, isLoading, error } = useSellerAnalytics({
    enabled: !!isPremium,
  });

  if (!isPremium) {
    return (
      <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/40 p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <HiOutlineLockClosed className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          Analytics is a Pro feature
        </h2>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Unlock detailed insights about views, inquiries and the listings that perform best for you.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {[
            { icon: HiOutlineEye, label: 'Property views' },
            { icon: HiOutlineChartBar, label: 'Top performers' },
            { icon: HiOutlineSparkles, label: 'Inquiry trends' },
          ].map((f, i) => (
            <div
              key={i}
              className="rounded-xl bg-white border border-gray-100 p-4 flex items-center gap-3"
            >
              <f.icon className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">{f.label}</span>
            </div>
          ))}
        </div>

        <Link
          to="/subscription"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95"
        >
          <HiOutlineRocketLaunch className="h-4 w-4" />
          Upgrade to Pro
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">
          {error?.message || 'Failed to load analytics. Please try again.'}
        </p>
      </div>
    );
  }

  const { summary, mostViewed, topListings } = analytics;

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          icon={HiOutlineHome}
          label="Total Listings"
          value={formatNumber(summary.totalListings)}
        />
        <StatTile
          icon={HiOutlineCheckBadge}
          label="Active Listings"
          value={formatNumber(summary.activeListings)}
          accent="emerald"
        />
        <StatTile
          icon={HiOutlineEye}
          label="Property Views"
          value={formatNumber(summary.propertyViews)}
          accent="violet"
        />
        <StatTile
          icon={HiOutlineChatBubbleLeftRight}
          label="Inquiries"
          value={formatNumber(summary.inquiries)}
          accent="indigo"
          sub="Likes + saves + favorites"
        />
        <StatTile
          icon={HiOutlineBookmark}
          label="Saved Count"
          value={formatNumber(summary.savedCount)}
          accent="blue"
        />
        <StatTile
          icon={HiOutlineFire}
          label="Boosted Listings"
          value={formatNumber(summary.boostedListings)}
          accent="rose"
        />
        <StatTile
          icon={HiOutlinePauseCircle}
          label="Paused / Sold"
          value={`${formatNumber(summary.pausedListings)} / ${formatNumber(summary.soldListings)}`}
          accent="amber"
        />
        <StatTile
          icon={HiOutlineCurrencyDollar}
          label="Sales Revenue"
          value={formatPkr(summary.salesRevenue)}
          accent="emerald"
          sub={`${summary.totalSales} sale(s)`}
        />
      </div>

      {/* Most viewed + top listings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top performing listings</h3>
          {topListings.length === 0 ? (
            <p className="text-sm text-gray-500">
              No listings yet — add a few to start tracking performance.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {topListings.map((p, i) => (
                <li key={p.id} className="flex items-center gap-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{p.title}</p>
                    <p className="text-xs text-gray-500">
                      {p.city} · {formatPkr(p.price)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p className="text-sm font-semibold text-gray-900 flex items-center justify-end gap-1">
                      <HiOutlineEye className="h-3.5 w-3.5" /> {p.views}
                    </p>
                    <p className="flex items-center justify-end gap-1">
                      <HiOutlineBookmark className="h-3 w-3" /> {p.saves}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Most viewed listing</h3>
          {mostViewed ? (
            <div className="space-y-3">
              {mostViewed.image && (
                <img
                  src={mostViewed.image}
                  alt={mostViewed.title}
                  className="w-full h-32 rounded-xl object-cover"
                />
              )}
              <p className="font-semibold text-gray-900">{mostViewed.title}</p>
              <p className="text-sm text-gray-500">
                {mostViewed.city} · {formatPkr(mostViewed.price)}
              </p>
              <p className="text-3xl font-extrabold text-blue-700">
                {formatNumber(mostViewed.views)}{' '}
                <span className="text-sm font-medium text-blue-600">views</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Not enough data yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
