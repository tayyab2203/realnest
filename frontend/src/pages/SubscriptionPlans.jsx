import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineRocketLaunch,
  HiOutlineArrowLeft,
  HiOutlineXCircle,
  HiOutlineQuestionMarkCircle,
} from 'react-icons/hi2';
import {
  useSubscriptionPlans,
  useMySubscription,
  useUpgradeToPro,
  useUpgradeToAgency,
  useCancelSubscription,
} from '../hooks/useSubscription';
import { useAuth } from '../context/AuthContext';
import SubscriptionCard from '../components/subscription/SubscriptionCard';
import SubscriptionComparisonTable from '../components/subscription/SubscriptionComparisonTable';
import SubscriptionPaymentModal from '../components/subscription/SubscriptionPaymentModal';

const formatExpiry = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export default function SubscriptionPlans() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: plans = [], isLoading: plansLoading } = useSubscriptionPlans();
  const { data: subscription, refetch: refetchSubscription } = useMySubscription({
    enabled: !!user,
  });
  const upgradePro = useUpgradeToPro();
  const upgradeAgency = useUpgradeToAgency();
  const cancelSub = useCancelSubscription();

  const [pendingPlan, setPendingPlan] = useState(null);

  const currentPlanId = subscription?.plan || 'FREE';

  const sortedPlans = useMemo(
    () =>
      [...plans].sort((a, b) => {
        const order = { FREE: 0, PRO: 1, AGENCY: 2 };
        return (order[a.id] ?? 99) - (order[b.id] ?? 99);
      }),
    [plans]
  );

  const handleSelect = (plan) => {
    if (!user) {
      toast.error('Please log in to upgrade');
      navigate('/login');
      return;
    }
    if (profile?.role !== 'SELLER') {
      toast.error('Only sellers can purchase subscription plans');
      return;
    }
    if (plan.id === currentPlanId) return;
    if (plan.priceMonthly === 0) {
      // Downgrades to free are managed via cancel only.
      handleCancel();
      return;
    }
    setPendingPlan(plan);
  };

  const handleCancel = async () => {
    if (currentPlanId === 'FREE') return;
    if (!window.confirm('Cancel your subscription? You will keep premium access until the end of the current billing period.')) {
      return;
    }
    try {
      await cancelSub.mutateAsync();
      toast.success('Subscription cancelled');
      refetchSubscription();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel subscription');
    }
  };

  const handleConfirmPayment = async ({ transactionId, amount }) => {
    if (!pendingPlan) return;
    const mutation = pendingPlan.id === 'PRO' ? upgradePro : upgradeAgency;
    try {
      await mutation.mutateAsync({ transactionId, paidAmount: amount });
      toast.success(`Welcome to ${pendingPlan.name}!`);
      setPendingPlan(null);
      refetchSubscription();
      // Send agency users to their dedicated dashboard for a discovery boost.
      if (pendingPlan.id === 'AGENCY') {
        navigate('/dashboard/agency');
      }
    } catch (err) {
      toast.error(err.message || 'Could not activate subscription');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50/60 via-white to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <Link
            to={profile?.role === 'SELLER' ? '/dashboard/seller' : '/'}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <HiOutlineArrowLeft className="h-4 w-4" /> Back
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-700 border border-blue-100 mb-4">
            <HiOutlineSparkles className="h-3.5 w-3.5" /> Pricing & Plans
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            Choose the plan that grows with you
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            From your first listing to running an entire agency, RealNest scales with your real-estate business.
          </p>

          {subscription && currentPlanId !== 'FREE' && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2 text-sm text-emerald-800">
              <HiOutlineShieldCheck className="h-4 w-4" />
              You are currently on the
              <span className="font-bold">
                {sortedPlans.find((p) => p.id === currentPlanId)?.name || currentPlanId}
              </span>
              plan
              {subscription.endDate && (
                <span className="text-emerald-700/80">
                  · expires {formatExpiry(subscription.endDate)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Cards */}
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl bg-gray-100 h-[520px] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {sortedPlans.map((plan) => (
              <SubscriptionCard
                key={plan.id}
                plan={plan}
                isCurrent={plan.id === currentPlanId}
                isHighlighted={plan.id === 'PRO'}
                endDate={plan.id === currentPlanId ? subscription?.endDate : null}
                onSelect={() => handleSelect(plan)}
                isProcessing={
                  (plan.id === 'PRO' && upgradePro.isPending) ||
                  (plan.id === 'AGENCY' && upgradeAgency.isPending)
                }
              />
            ))}
          </div>
        )}

        {/* Cancel subscription */}
        {currentPlanId !== 'FREE' && subscription?.status !== 'CANCELLED' && (
          <div className="mb-16 flex justify-center">
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelSub.isPending}
              className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              <HiOutlineXCircle className="h-4 w-4" />
              {cancelSub.isPending ? 'Cancelling...' : 'Cancel my subscription'}
            </button>
          </div>
        )}

        {/* Comparison */}
        <div className="mb-16">
          <SubscriptionComparisonTable plans={sortedPlans} />
        </div>

        {/* FAQ */}
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Frequently asked questions
          </h2>
          <p className="text-center text-sm text-gray-500 mb-8">
            Everything you need to know before upgrading.
          </p>
          <div className="space-y-3">
            {[
              {
                q: 'Can I switch plans later?',
                a: 'Yes — you can upgrade at any time. Downgrades happen automatically when your current paid period ends.',
              },
              {
                q: 'How is payment handled?',
                a: 'This is a demo project, so payments are fully simulated — no real charge is made.',
              },
              {
                q: 'What happens when my subscription expires?',
                a: 'You are reverted to the Free plan, premium features are disabled, and your listing limit is reset to 2.',
              },
              {
                q: 'Do unused boosts roll over?',
                a: 'Boost credits are separate from your plan. Any credits left in your wallet stay there regardless of your plan.',
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-gray-100 bg-white p-5 hover:bg-gray-50/50 transition-colors"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="flex items-start gap-2 text-sm font-semibold text-gray-900">
                    <HiOutlineQuestionMarkCircle className="h-5 w-5 text-blue-600 shrink-0" />
                    {item.q}
                  </span>
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="mt-3 ml-7 text-sm text-gray-600 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-10 text-center text-white shadow-xl">
          <HiOutlineRocketLaunch className="h-10 w-10 mx-auto mb-3 text-white" />
          <h2 className="text-2xl sm:text-3xl font-bold">
            Ready to grow your real-estate business?
          </h2>
          <p className="mt-2 text-white/80 text-sm sm:text-base">
            Upgrade today and start reaching more buyers in minutes.
          </p>
          {currentPlanId === 'FREE' && (
            <button
              type="button"
              onClick={() => {
                const proPlan = sortedPlans.find((p) => p.id === 'PRO');
                if (proPlan) handleSelect(proPlan);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-blue-600 hover:bg-gray-100 transition-colors active:scale-95"
            >
              <HiOutlineRocketLaunch className="h-4 w-4" />
              Get started with Pro
            </button>
          )}
        </div>
      </div>

      <SubscriptionPaymentModal
        plan={pendingPlan}
        open={!!pendingPlan}
        onClose={() => setPendingPlan(null)}
        onConfirm={handleConfirmPayment}
      />
    </div>
  );
}
