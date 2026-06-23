import { HiOutlineCheck, HiOutlineXMark } from 'react-icons/hi2';

const COMPARISON_ROWS = [
  {
    label: 'Active property listings',
    get: (p) => (p.listingLimit >= 9999 ? 'Unlimited' : `Up to ${p.listingLimit}`),
  },
  { label: 'Hot / Premium / Platinum boosts', get: (p) => p.canBoost },
  { label: 'Seller analytics dashboard', get: (p) => p.canAccessAnalytics },
  { label: 'Verified seller badge', get: (p) => p.isVerified },
  { label: 'Priority listing ranking', get: (p) => p.priorityRanking },
  { label: 'Multi-agent management', get: (p) => p.multiAgent },
  { label: 'Company / agency profile', get: (p) => p.isAgency },
  { label: 'Bulk listing management', get: (p) => p.bulkManagement },
];

const renderCell = (value) => {
  if (typeof value === 'boolean') {
    return value ? (
      <HiOutlineCheck className="h-5 w-5 text-emerald-500 mx-auto" />
    ) : (
      <HiOutlineXMark className="h-5 w-5 text-gray-300 mx-auto" />
    );
  }
  return <span className="text-sm text-gray-700 font-medium">{value}</span>;
};

export default function SubscriptionComparisonTable({ plans = [] }) {
  if (plans.length === 0) return null;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Compare features</h2>
        <p className="text-sm text-gray-500 mt-1">
          See what's included in each plan at a glance.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Feature
              </th>
              {plans.map((p) => (
                <th
                  key={p.id}
                  className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center min-w-[140px]"
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {COMPARISON_ROWS.map((row) => (
              <tr key={row.label} className="hover:bg-gray-50/50">
                <td className="px-6 py-3.5 text-gray-700">{row.label}</td>
                {plans.map((p) => (
                  <td key={p.id} className="px-6 py-3.5 text-center">
                    {renderCell(row.get(p))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
