import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlineCheckCircle } from 'react-icons/hi2';
import { useProperty } from '../hooks/useProperties';
import { useAuth } from '../context/AuthContext';
import {
  RENT_PAYMENT_PLANS,
  SALE_PAYMENT_PLANS,
  saveCheckoutPlan,
} from '../lib/paymentPlans';
import api from '../lib/api';
import { useCreatePurchaseIntent } from '../hooks/useDocuments';

const STEPS = ['Property', 'Payment plan', 'Agreement', 'Payment'];

export default function CheckoutPlan() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: property, isLoading } = useProperty(propertyId);
  const createPurchaseIntent = useCreatePurchaseIntent();
  const isRent = property?.status === 'FOR_RENT';
  const isCommittedBuyer = !!property?.isCommittedBuyer;
  const isSale =
    property?.status === 'FOR_SALE'
    || (property?.status === 'SOLD' && isCommittedBuyer);
  const soldToAnother =
    !!property
    && !isCommittedBuyer
    && (property.status === 'SOLD' || !!property.committedBuyerId);

  const plans = isRent ? RENT_PAYMENT_PLANS : SALE_PAYMENT_PLANS;
  const [selectedId, setSelectedId] = useState(SALE_PAYMENT_PLANS[0]?.id);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isRent) setSelectedId(RENT_PAYMENT_PLANS[0]?.id);
    else if (isSale) setSelectedId(SALE_PAYMENT_PLANS[0]?.id);
  }, [isRent, isSale]);

  const goToAgreement = async () => {
    if (!propertyId || !selectedId) return;
    setSubmitting(true);
    try {
      saveCheckoutPlan(propertyId, {
        kind: isRent ? 'RENT' : 'SALE',
        salePlanId: isSale ? selectedId : undefined,
        rentPlanId: isRent ? selectedId : undefined,
        selectedAt: new Date().toISOString(),
      });

      const continueQ = `?continue=${encodeURIComponent(`/payment/${propertyId}`)}`;

      if (isSale) {
        const intent = await createPurchaseIntent.mutateAsync(propertyId);
        const docId = intent?.documentId || intent?.document?.id;
        if (docId) {
          navigate(`/documents/${docId}${continueQ}`);
        } else {
          toast.success('Purchase started. Open your sale deed when the seller generates it.');
          navigate('/dashboard/buyer?tab=documents&awaiting=1');
        }
        return;
      }

      const { data } = await api.get(`/documents/for-purchase/${propertyId}`);
      if (data.document?.id) {
        navigate(`/documents/${data.document.id}${continueQ}`);
      } else {
        toast.error('Ask the landlord to generate your tenancy agreement on this listing first.');
        navigate('/dashboard/buyer?tab=documents');
      }
    } catch (e) {
      toast.error(e.message || 'Could not continue');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || profile?.role !== 'BUYER') {
    return (
      <PageShell>
        <div className="text-center py-16">
          <p className="text-gray-700">Please log in as a buyer to continue.</p>
          <Link to="/login" className="text-blue-600 mt-4 inline-block">Login</Link>
        </div>
      </PageShell>
    );
  }

  if (isLoading) {
    return (
      <PageShell>
        <p className="text-center py-16 text-gray-500">Loading…</p>
      </PageShell>
    );
  }

  if (soldToAnother) {
    return (
      <PageShell>
        <div className="text-center py-16">
          <p className="text-red-600 font-medium">This property has been sold to another buyer.</p>
          <Link to={`/properties/${propertyId}`} className="text-blue-600 mt-4 inline-block">Back to property</Link>
        </div>
      </PageShell>
    );
  }

  if (!property || (!isSale && !isRent)) {
    return (
      <PageShell>
        <div className="text-center py-16">
          <p className="text-red-600">This listing is not available for checkout.</p>
          <Link to={`/properties/${propertyId}`} className="text-blue-600 mt-4 inline-block">Back</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <button
        type="button"
        onClick={() => navigate(`/properties/${propertyId}`)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <HiOutlineArrowLeft className="h-4 w-4" /> Back to property
      </button>

      <nav className="flex flex-wrap gap-2 text-xs font-medium text-gray-500 mb-8">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={i === 1 ? 'text-blue-700 bg-blue-50 px-2 py-1 rounded-full' : 'px-2 py-1'}
          >
            {i + 1}. {label}
          </span>
        ))}
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">Choose payment plan</h1>
      <p className="text-gray-500 mt-1 text-sm">
        {property.title} · {isSale ? 'Purchase' : 'Rental'} · PKR {Number(property.price).toLocaleString('en-PK')}
        {isRent && '/month'}
      </p>
      <p className="text-sm text-gray-600 mt-3">
        Your selection is embedded in the {isSale ? 'Property Purchase Deed' : 'Rental / Lease Agreement'} before
        payment.
      </p>

      <div className="mt-8 space-y-3">
        {plans.map((plan) => (
          <label
            key={plan.id}
            className={`block border rounded-2xl p-5 cursor-pointer transition-colors ${
              selectedId === plan.id
                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <input
              type="radio"
              className="sr-only"
              name="plan"
              checked={selectedId === plan.id}
              onChange={() => setSelectedId(plan.id)}
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{plan.name}</p>
                <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
              </div>
              {selectedId === plan.id && (
                <HiOutlineCheckCircle className="h-6 w-6 text-blue-600 shrink-0" />
              )}
            </div>
          </label>
        ))}
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={goToAgreement}
        className="mt-8 w-full py-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
      >
        {submitting ? 'Loading agreement…' : 'Continue to digital agreement'}
      </button>
    </PageShell>
  );
}

function PageShell({ children }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">{children}</div>
  );
}
