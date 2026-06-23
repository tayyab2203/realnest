import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProperty } from '../hooks/useProperties';
import { useAuth } from '../context/AuthContext';
import { useCreateTransaction, useProcessTransaction } from '../hooks/useTransactions';
import { HiOutlineLockClosed, HiOutlineArrowLeft } from 'react-icons/hi2';
import MockStripeCheckout from '../components/MockStripeCheckout';
import {
  useDocumentForCheckout,
  useSaleInstallments,
  useStartInstallmentPayment,
} from '../hooks/useDocuments';

export default function Payment() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: property, isLoading: propLoading } = useProperty(propertyId);
  const { data: checkoutPayload, isLoading: docLoading } = useDocumentForCheckout(propertyId);
  const { data: instData, isLoading: instLoading } = useSaleInstallments(propertyId);
  const createTransaction = useCreateTransaction();
  const processTransaction = useProcessTransaction();
  const startInstallment = useStartInstallmentPayment();

  const isCommittedBuyer = !!property?.isCommittedBuyer;
  const isSale =
    property?.status === 'FOR_SALE'
    || (property?.status === 'SOLD' && isCommittedBuyer);
  const isRent = property?.status === 'FOR_RENT';
  const needsLegalDocument = isSale || isRent;
  const legalDoc = checkoutPayload?.document;
  const legalDocReady = legalDoc?.status === 'FULLY_EXECUTED';
  const installments = instData?.installments ?? [];
  const hasInstallmentPlan = isSale && installments.length > 0;
  const nextInstallment = installments.find((i) => i.status === 'PENDING');

  if (propLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-lg">Property not found</p>
        <Link to="/properties" className="text-blue-600 mt-4 inline-block">Back to properties</Link>
      </div>
    );
  }

  if (!user || profile?.role !== 'BUYER') {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-700 text-lg font-medium">Only buyers can purchase properties.</p>
        <Link to="/login" className="text-blue-600 mt-4 inline-block">Go to login</Link>
      </div>
    );
  }

  if (property.status === 'SOLD' && !isCommittedBuyer) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-lg font-medium">This property has already been sold to another buyer.</p>
        <Link to="/properties" className="text-blue-600 mt-4 inline-block">Browse other properties</Link>
      </div>
    );
  }

  if (needsLegalDocument && (docLoading || (isSale && instLoading))) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-500">Loading checkout…</div>
    );
  }

  if (needsLegalDocument && !legalDocReady) {
    const isSaleFlow = isSale;
    const title = isSaleFlow ? 'Sale deed required' : 'Tenancy agreement required';
    const body = isSaleFlow
      ? 'Complete your sale deed (seller must notify you, then you sign with OTP) before installment payments unlock. Amounts follow the schedule in your executed deed.'
      : legalDoc
        ? 'Review and fully execute your tenancy agreement (OTP) before paying the booking amount. Rent and deposits match the agreement attached to this listing.'
        : 'The landlord has not created your tenancy agreement yet. Ask them to use Generate document on this listing and select you as tenant, then open it from your Documents tab to sign.';

    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <HiOutlineArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center max-w-lg mx-auto">
          <p className="text-lg font-semibold text-amber-900">{title}</p>
          <p className="text-sm text-amber-800 mt-2">{body}</p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/dashboard/buyer?tab=documents"
              className="inline-flex justify-center px-4 py-2.5 rounded-xl bg-white border border-amber-200 text-amber-900 text-sm font-medium hover:bg-amber-100"
            >
              Open Documents tab
            </Link>
            {legalDoc?.id && (
              <Link
                to={`/documents/${legalDoc.id}?continue=${encodeURIComponent(`/payment/${propertyId}`)}`}
                className="inline-flex justify-center px-4 py-2.5 rounded-xl bg-amber-700 text-white text-sm font-semibold hover:bg-amber-800"
              >
                {isSaleFlow ? 'Open sale deed to sign' : 'Open tenancy agreement to sign'}
              </Link>
            )}
            <Link
              to={`/properties/${propertyId}`}
              className="inline-flex justify-center px-4 py-2.5 rounded-xl bg-white border border-amber-200 text-amber-900 text-sm font-medium hover:bg-amber-100"
            >
              Back to listing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isSale && legalDocReady && !hasInstallmentPlan) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-600">
        <p>Preparing your payment schedule… refresh in a moment.</p>
        <button type="button" className="mt-4 text-blue-600 text-sm underline" onClick={() => window.location.reload()}>
          Refresh
        </button>
      </div>
    );
  }

  if (isSale && hasInstallmentPlan && !nextInstallment) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-lg font-medium text-gray-900">All installments are paid.</p>
        <Link to={`/properties/${propertyId}`} className="text-blue-600 mt-4 inline-block">
          Back to listing
        </Link>
      </div>
    );
  }

  const priceNum = Number(property.price);

  const handleRentPaySuccess = async () => {
    try {
      const { transactionId } = await createTransaction.mutateAsync(property.id);
      const completed = await processTransaction.mutateAsync({
        transactionId,
        paymentMethod: 'CARD',
      });
      toast.success('Payment completed successfully');
      navigate(`/receipt/${completed.id}`);
    } catch (err) {
      toast.error(err.message || 'Could not complete booking');
    }
  };

  const handleInstallmentSuccess = async () => {
    if (!nextInstallment) return;
    try {
      const { transactionId } = await startInstallment.mutateAsync(nextInstallment.id);
      const completed = await processTransaction.mutateAsync({
        transactionId,
        paymentMethod: 'CARD',
      });
      toast.success('Installment paid');
      const wasLast = nextInstallment.sequence >= installments.length;
      if (wasLast) {
        navigate(`/receipt/${completed.id}`);
      } else {
        navigate(0);
      }
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <HiOutlineArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {hasInstallmentPlan ? 'Installment checkout' : isRent ? 'Rental checkout' : 'Secure checkout'}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-1.5 text-sm">
              <HiOutlineLockClosed className="h-4 w-4" />
              {hasInstallmentPlan
                ? 'Simulated payment — installment amounts match the payment schedule in your executed sale deed.'
                : isRent
                  ? 'Simulated payment — after your executed tenancy agreement.'
                  : 'Simulated payment — secure booking'}
            </p>
          </div>

          {hasInstallmentPlan && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Schedule</h2>
              <ul className="space-y-2 text-sm">
                {installments.map((row) => (
                  <li
                    key={row.id}
                    className={`flex justify-between rounded-lg px-3 py-2 ${
                      row.status === 'PAID' ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-50 text-gray-800'
                    }`}
                  >
                    <span>
                      {row.sequence}. {row.label}
                    </span>
                    <span className="font-semibold">
                      PKR {Number(row.amount).toLocaleString('en-PK')}{' '}
                      {row.status === 'PAID' ? '· Paid' : row.id === nextInstallment?.id ? '· Due next' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasInstallmentPlan && nextInstallment && (
            <MockStripeCheckout
              key={nextInstallment.id}
              amount={Number(nextInstallment.amount)}
              purpose={`Installment: ${nextInstallment.label}`}
              navigateBackAfterSuccess={false}
              onSuccess={handleInstallmentSuccess}
            />
          )}

          {!hasInstallmentPlan && isRent && (
            <MockStripeCheckout
              amount={priceNum}
              purpose="Property booking"
              navigateBackAfterSuccess={false}
              onSuccess={handleRentPaySuccess}
            />
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden sticky top-20">
            {property.images?.[0] && (
              <img src={property.images[0]} alt={property.title} className="w-full h-40 object-cover" />
            )}
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{property.title}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-1">
                {property.address}, {property.city}
              </p>

              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>{hasInstallmentPlan ? 'Total agreed price' : isRent ? 'Monthly rent (per agreement)' : 'Total'}</span>
                  <span>PKR {priceNum.toLocaleString('en-PK')}</span>
                </div>
                {hasInstallmentPlan && nextInstallment && (
                  <div className="flex justify-between text-gray-600">
                    <span>Due now</span>
                    <span className="font-semibold text-blue-700">
                      PKR {Number(nextInstallment.amount).toLocaleString('en-PK')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Processing fee</span>
                  <span className="text-emerald-600">Free</span>
                </div>
              </div>

              <div className="border-t border-gray-100 mt-4 pt-4 flex items-center justify-between">
                <span className="text-gray-900 font-semibold">{hasInstallmentPlan ? 'This payment' : isRent ? 'Due now' : 'Total'}</span>
                <span className="text-2xl font-bold text-blue-600">
                  PKR{' '}
                  {(hasInstallmentPlan && nextInstallment
                    ? Number(nextInstallment.amount)
                    : priceNum
                  ).toLocaleString('en-PK')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
