import { useEffect, useState } from 'react';
import {
  HiOutlineXMark,
  HiOutlineLockClosed,
  HiOutlineCheckCircle,
  HiOutlineShieldCheck,
  HiOutlineCreditCard,
} from 'react-icons/hi2';

const PROCESS_MS = 2200;

const buildTxnId = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SUB-${Date.now()}-${rand}`;
};

/**
 * Fully simulated payment modal for subscription upgrades.
 *
 * Flow: form -> processing (animated) -> success -> on continue, calls
 * `onConfirm({ transactionId, amount })` which the parent uses to hit the
 * backend upgrade endpoint. NO real payment provider is integrated.
 *
 * @param {object}   plan        - the plan being purchased ({ id, name, priceMonthly, currency, ... })
 * @param {boolean}  open
 * @param {() => void} onClose
 * @param {(payload: { transactionId: string; amount: number }) => Promise<void>} onConfirm
 */
export default function SubscriptionPaymentModal({
  plan,
  open,
  onClose,
  onConfirm,
}) {
  const [phase, setPhase] = useState('form');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [meta, setMeta] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase('form');
      setCardName('');
      setCardNumber('');
      setExpiry('');
      setCvv('');
      setMeta(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!open || !plan) return null;

  const amount = plan.priceMonthly;
  const formattedAmount = `${plan.currency || 'PKR'} ${Number(amount).toLocaleString()}`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cardName.trim() || cardNumber.replace(/\D/g, '').length < 12) return;
    setPhase('processing');
    setTimeout(() => {
      const transactionId = buildTxnId();
      const last4 = cardNumber.replace(/\D/g, '').slice(-4);
      setMeta({ transactionId, amount, last4 });
      setPhase('success');
    }, PROCESS_MS);
  };

  const handleConfirm = async () => {
    if (!meta || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({ transactionId: meta.transactionId, amount: meta.amount });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close"
        >
          <HiOutlineXMark className="h-5 w-5" />
        </button>

        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 px-6 pt-7 pb-6 text-white">
          <p className="text-xs uppercase tracking-wider text-white/70">Upgrade to</p>
          <h2 className="text-2xl font-bold mt-1">{plan.name}</h2>
          <p className="mt-3 text-3xl font-extrabold">
            {formattedAmount}
            <span className="text-base font-medium text-white/80">/month</span>
          </p>
        </div>

        <div className="p-6">
          {phase === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <HiOutlineCreditCard className="h-5 w-5 text-blue-600" />
                <span>Card details</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder="Name on card"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  Card Number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                    setCardNumber(digits.replace(/(.{4})/g, '$1 ').trim());
                  }}
                  placeholder="1234 5678 9012 3456"
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm tracking-wider focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Expiry
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={expiry}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    CVV
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="•••"
                    maxLength={4}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-800">
                <HiOutlineShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  <strong>Demo:</strong> Simulated checkout — no real charge will be made.
                </span>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95"
              >
                <HiOutlineLockClosed className="h-4 w-4" />
                Pay {formattedAmount}
              </button>
            </form>
          )}

          {phase === 'processing' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 h-14 w-14 flex items-center justify-center">
                <span className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
              </div>
              <p className="text-base font-semibold text-gray-900">
                Processing payment...
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Please don't close this window
              </p>
            </div>
          )}

          {phase === 'success' && meta && (
            <div className="py-4 text-center animate-[fadeIn_0.3s_ease-out]">
              <div className="mx-auto mb-4 h-16 w-16 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-[pop_0.45s_ease-out]">
                <HiOutlineCheckCircle className="h-10 w-10" strokeWidth={2} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Payment Successful!</h3>
              <p className="mt-1 text-sm text-gray-500">
                Activate your {plan.name} subscription
              </p>

              <dl className="mt-5 space-y-2 text-left text-sm bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Plan</dt>
                  <dd className="font-semibold text-gray-900">{plan.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Amount</dt>
                  <dd className="font-semibold text-emerald-700">{formattedAmount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Card</dt>
                  <dd className="font-mono text-gray-800">**** **** **** {meta.last4}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500 shrink-0">Txn ID</dt>
                  <dd className="font-mono text-[11px] text-gray-700 truncate">
                    {meta.transactionId}
                  </dd>
                </div>
              </dl>

              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-70 transition-all active:scale-95"
              >
                {submitting ? 'Activating...' : 'Activate Subscription'}
              </button>
            </div>
          )}
        </div>

        <style>{`
          @keyframes pop {
            0% { transform: scale(0.6); opacity: 0; }
            60% { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}
