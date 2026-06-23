import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineShieldCheck,
  HiOutlineLockClosed,
  HiOutlineCreditCard,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
} from 'react-icons/hi2';
import { appendMockTransaction } from '../lib/mockStripeStorage';

const PROCESS_MS = 2500;
const DECLINED_DIGITS = '0000000000000000';

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const detectCardType = (cardNumber) => {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'visa';
  if (digits.startsWith('5')) return 'mastercard';
  return 'generic';
};

const buildTxnId = () => {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TXN-RNST-${Date.now()}-${rand}`;
};

const maskPan = (digits16) => `**** **** **** ${digits16.slice(-4)}`;

/**
 * Fully mocked Stripe-style checkout (demo / FYP). No real payment provider.
 *
 * @param {number} amount — amount in PKR (or your app currency)
 * @param {string} purpose — e.g. "Credit Purchase", "Property Purchase"
 * @param {(payload: { transactionId: string; amount: number; date: string; last4: string; purpose: string }) => void | Promise<void>} [onSuccess] — after user clicks Continue on success screen
 * @param {() => void} [onFailure] — when card is declined (after failure screen is shown; Try Again resets form)
 * @param {boolean} [navigateBackAfterSuccess=true] — if true, navigate(-1) after onSuccess resolves; set false when parent navigates (e.g. to receipt)
 */
export default function MockStripeCheckout({
  amount,
  purpose,
  onSuccess,
  onFailure,
  navigateBackAfterSuccess = true,
}) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('form'); // form | processing | success | failure

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [errors, setErrors] = useState({});

  const [successMeta, setSuccessMeta] = useState(null);
  const [isContinuing, setIsContinuing] = useState(false);
  const failureMessage = 'Your card was declined. Please try a different card.';

  const cardType = detectCardType(cardNumber);

  const validate = useCallback(() => {
    const next = {};
    if (!cardholderName.trim()) next.cardholderName = 'Cardholder name is required';

    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length !== 16) next.cardNumber = 'Card number must be 16 digits';

    const expDigits = expiry.replace(/\D/g, '');
    if (expDigits.length !== 4) {
      next.expiry = 'Expiry must be in MM/YY format';
    } else {
      const month = parseInt(expDigits.slice(0, 2), 10);
      if (month < 1 || month > 12) next.expiry = 'Invalid month';
    }

    if (cvv.length < 3 || cvv.length > 4) next.cvv = 'CVV must be 3 or 4 digits';

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [cardholderName, cardNumber, expiry, cvv]);

  const resetForm = useCallback(() => {
    setCardholderName('');
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setErrors({});
    setSuccessMeta(null);
    setIsContinuing(false);
    setPhase('form');
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (phase !== 'form') return;
    if (!validate()) return;

    setPhase('processing');

    const digits = cardNumber.replace(/\D/g, '');

    window.setTimeout(() => {
      if (digits === DECLINED_DIGITS) {
        setPhase('failure');
        onFailure?.();
        return;
      }

      const transactionId = buildTxnId();
      const date = new Date().toISOString();
      const last4 = digits.slice(-4);

      const meta = {
        transactionId,
        amount,
        date,
        last4,
        purpose,
        maskedPan: maskPan(digits),
        displayDate: new Date(date).toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };

      appendMockTransaction({
        transactionId: meta.transactionId,
        amount: meta.amount,
        date: meta.date,
        last4: meta.last4,
        purpose: meta.purpose,
      });

      setSuccessMeta(meta);
      setPhase('success');
    }, PROCESS_MS);
  };

  const handleContinue = async () => {
    if (!successMeta || isContinuing) return;
    setIsContinuing(true);

    const payload = {
      transactionId: successMeta.transactionId,
      amount: successMeta.amount,
      date: successMeta.date,
      last4: successMeta.last4,
      purpose: successMeta.purpose,
    };

    try {
      await onSuccess?.(payload);
      if (navigateBackAfterSuccess) {
        navigate(-1);
      }
    } catch {
      setIsContinuing(false);
    }
  };

  const handleTryAgain = () => {
    resetForm();
  };

  const cardBrandLabel =
    cardType === 'visa' ? 'VISA' : cardType === 'mastercard' ? 'Mastercard' : 'Card';
  const cardBrandClass =
    cardType === 'visa'
      ? 'bg-blue-600 text-white'
      : cardType === 'mastercard'
        ? 'bg-orange-500 text-white'
        : 'bg-gray-200 text-gray-600';

  if (phase === 'processing') {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        </div>
        <p className="text-lg font-semibold text-gray-900">Processing payment...</p>
        <p className="mt-2 text-sm text-gray-500">Please do not close this window</p>
      </div>
    );
  }

  if (phase === 'success' && successMeta) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-linear-to-b from-emerald-50/80 to-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 animate-[pop_0.5s_ease-out]">
          <HiOutlineCheckCircle className="h-11 w-11" strokeWidth={2} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
        <p className="mt-1 text-sm text-gray-500">{successMeta.purpose}</p>

        <dl className="mx-auto mt-8 max-w-md space-y-3 rounded-xl border border-emerald-100 bg-white/80 p-5 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Transaction ID</dt>
            <dd className="font-mono text-xs font-medium text-gray-900 break-all text-right">
              {successMeta.transactionId}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Amount paid</dt>
            <dd className="font-semibold text-emerald-700">
              PKR {Number(successMeta.amount).toLocaleString()}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Card</dt>
            <dd className="font-mono tracking-wider text-gray-800">{successMeta.maskedPan}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Date &amp; time</dt>
            <dd className="text-right text-gray-800">{successMeta.displayDate}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={handleContinue}
          disabled={isContinuing}
          className="mt-8 w-full max-w-md rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isContinuing ? 'Finishing...' : 'Continue'}
        </button>

        <style>{`
          @keyframes pop {
            0% { transform: scale(0.6); opacity: 0; }
            60% { transform: scale(1.08); opacity: 1; }
            100% { transform: scale(1); }
          }
        `}</style>
      </div>
    );
  }

  if (phase === 'failure') {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50/50 p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white">
          <HiOutlineXCircle className="h-10 w-10" strokeWidth={2} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Payment failed</h2>
        <p className="mt-3 text-sm text-red-700">{failureMessage}</p>
        <button
          type="button"
          onClick={handleTryAgain}
          className="mt-8 w-full max-w-md rounded-xl border-2 border-red-200 bg-white py-3.5 font-semibold text-red-700 transition-colors hover:bg-red-50"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HiOutlineCreditCard className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Card Details</h2>
          </div>
          <span className={`rounded px-2.5 py-1 text-xs font-bold tracking-wide ${cardBrandClass}`}>
            {cardBrandLabel}
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Cardholder Name</label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="Name on card"
              className={`w-full rounded-lg border px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                errors.cardholderName ? 'border-red-400' : 'border-gray-200'
              }`}
            />
            {errors.cardholderName && (
              <p className="mt-1 text-xs text-red-500">{errors.cardholderName}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Card Number</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className={`w-full rounded-lg border px-4 py-2.5 pr-16 tracking-wider focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  errors.cardNumber ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              <span
                className={`absolute right-3 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-[10px] font-bold ${cardBrandClass}`}
              >
                {cardBrandLabel}
              </span>
            </div>
            {errors.cardNumber && <p className="mt-1 text-xs text-red-500">{errors.cardNumber}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Expiry Date</label>
              <input
                type="text"
                inputMode="numeric"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
                className={`w-full rounded-lg border px-4 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  errors.expiry ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {errors.expiry && <p className="mt-1 text-xs text-red-500">{errors.expiry}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">CVV</label>
              <input
                type="password"
                inputMode="numeric"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="•••"
                maxLength={4}
                className={`w-full rounded-lg border px-4 py-2.5 tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  errors.cvv ? 'border-red-400' : 'border-gray-200'
                }`}
              />
              {errors.cvv && <p className="mt-1 text-xs text-red-500">{errors.cvv}</p>}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
          <HiOutlineShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <strong>Demo:</strong> Simulated checkout only. Use card <span className="font-mono">0000 0000 0000 0000</span> to
            simulate a decline.
          </span>
        </div>
      </div>

      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        <HiOutlineLockClosed className="h-5 w-5" />
        Pay PKR {Number(amount).toLocaleString()}
      </button>
    </form>
  );
}
