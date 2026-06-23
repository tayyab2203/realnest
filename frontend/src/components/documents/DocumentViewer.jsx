import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDocument } from '../../hooks/useDocuments';
import { useQueryClient } from '@tanstack/react-query';
import { formatCnicDisplay, documentTypeLabel } from '../../lib/documentDisplay';
import { getAgreementClauses } from '../../lib/agreementSections';
import OTPModal from './OTPModal';

function numberToWordsSimple(n) {
  const num = Math.floor(Number(n) || 0);
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = num % 1000;
  const parts = [];
  const two = (x) => {
    if (x < 20) return ones[x];
    const t = Math.floor(x / 10);
    const o = x % 10;
    return `${tens[t]}${o ? ` ${ones[o]}` : ''}`.trim();
  };
  if (crores) parts.push(`${two(crores)} Crore${crores > 1 ? 's' : ''}`);
  if (lakhs) parts.push(`${two(lakhs)} Lakh${lakhs > 1 ? 's' : ''}`);
  if (thousands) parts.push(`${two(thousands)} Thousand`);
  if (hundreds) parts.push(two(hundreds));
  return parts.join(' ').trim() || 'Zero';
}

export default function DocumentViewer({ documentId, continueTo = '' }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: doc, isLoading, error } = useDocument(documentId);
  const scrollRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [reachedBottom, setReachedBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedResetKey, setAcceptedResetKey] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);

  const signingRole = useMemo(() => {
    if (!doc || !profile) return null;
    if (doc.sellerId === profile.id) return 'seller';
    if (doc.buyerId === profile.id) return 'buyer';
    return null;
  }, [doc, profile]);

  const needsSellerSign = doc?.status === 'DRAFT' && signingRole === 'seller';
  const needsBuyerSign =
    doc?.status === 'SELLER_SIGNED'
    && signingRole === 'buyer'
    && (doc.type !== 'SALE_DEED' || !!doc.buyerNotifiedAt);
  const canSignFlow = needsSellerSign || needsBuyerSign;
  const isBuyerCheckout = signingRole === 'buyer' && !!continueTo;
  const showProceedToPayment =
    isBuyerCheckout
    && (canSignFlow || doc?.status === 'FULLY_EXECUTED');

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const p = scrollHeight <= clientHeight ? 1 : scrollTop / (scrollHeight - clientHeight);
      setProgress(Math.min(1, Math.max(0, p)));
      setReachedBottom(scrollTop + clientHeight >= scrollHeight - 24);
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [doc?.id]);

  const acceptanceResetKey = `${documentId}-${doc?.status ?? ''}`;
  if (acceptanceResetKey !== acceptedResetKey) {
    setAcceptedResetKey(acceptanceResetKey);
    setAccepted(false);
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-500">Loading document…</div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-red-600">
        {error?.message || 'Document not found'}
      </div>
    );
  }

  if (!signingRole && doc.status !== 'FULLY_EXECUTED') {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-gray-600">
        You do not have access to this document.
      </div>
    );
  }

  const p = doc.property;
  const seller = doc.seller;
  const buyer = doc.buyer;
  const typeLabel = documentTypeLabel(doc.type);
  const price = p?.price ?? 0;
  const monthlyRent = doc.type === 'RENT_AGREEMENT' ? price : null;
  const securityDeposit = monthlyRent != null ? Math.round(monthlyRent * 2) : null;
  const advanceRent = monthlyRent != null ? Math.round(monthlyRent * 2) : null;

  const sellerTerms = `I, ${seller?.name || 'Seller'}, CNIC ${formatCnicDisplay(seller)}, confirm that I am the lawful owner of the property described in this document, that all stated details are accurate, that the property is free from all encumbrances, and that I agree to be legally bound by the terms of this ${typeLabel} upon OTP confirmation.`;

  const buyerTerms = `I, ${buyer?.name || 'Buyer/Tenant'}, CNIC ${formatCnicDisplay(buyer)}, confirm that I have read and understood all terms of this ${typeLabel}, that I agree to the payment schedule, conditions of use, and all obligations stated herein, and that I consent to be legally bound by this document upon OTP confirmation.`;

  const displayTerms = needsSellerSign ? sellerTerms : buyerTerms;

  const handleProceedToPayment = () => {
    if (!accepted || !reachedBottom) return;
    if (doc?.status === 'FULLY_EXECUTED' && continueTo) {
      navigate(continueTo);
      return;
    }
    if (canSignFlow) setOtpOpen(true);
  };

  const handleVerified = (updated) => {
    qc.setQueryData(['document', documentId], updated);
    qc.invalidateQueries({ queryKey: ['documents'] });
    qc.invalidateQueries({ queryKey: ['document-for-checkout', updated.propertyId] });
    qc.invalidateQueries({ queryKey: ['sale-installments', updated.propertyId] });
    qc.invalidateQueries({ queryKey: ['purchase-intent', updated.propertyId] });
    qc.invalidateQueries({ queryKey: ['buyer-purchase-intents'] });
    setOtpOpen(false);
    if (continueTo && updated?.status === 'FULLY_EXECUTED') {
      navigate(continueTo);
    }
  };

  const agreementClauses = doc ? getAgreementClauses(doc) : [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-blue-600 transition-all duration-150"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {doc.status === 'FULLY_EXECUTED' && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 text-sm font-medium">
          This document is fully executed
          {doc.finalPdfUrl && (
            <>
              {' '}
              —{' '}
              <a href={doc.finalPdfUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                Download sealed PDF
              </a>
            </>
          )}
          {continueTo && !showProceedToPayment && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => navigate(continueTo)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800"
              >
                {doc.type === 'RENT_AGREEMENT'
                  ? 'Continue to payment'
                  : 'Continue to installment payments'}
              </button>
            </div>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        className="max-h-[min(70vh,640px)] overflow-y-auto rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm space-y-6"
      >
        <header className="border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-sm">
              RN
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">RealNest · Pakistan</p>
              <h1 className="text-2xl font-bold text-gray-900">{typeLabel}</h1>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">
            Agreement ID: <span className="font-mono">{doc.id}</span>
          </p>
          <p className="text-sm text-gray-500">
            Generated:{' '}
            {doc.generatedAt
              ? new Date(doc.generatedAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
              : '—'}{' '}
            PKT
          </p>
          <p className="text-sm text-gray-500">Status: {doc.status.replace(/_/g, ' ')}</p>
        </header>

        {agreementClauses.map((clause) => (
          <section key={clause.title} className="text-sm text-gray-700">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">{clause.title}</h2>
            <p className="whitespace-pre-line leading-relaxed">{clause.body}</p>
          </section>
        ))}

        <section className="sr-only">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Property</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Title</dt>
              <dd className="font-medium text-gray-900">{p?.title}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Location</dt>
              <dd className="font-medium text-gray-900">
                {p?.address}, {p?.city}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Type / Status</dt>
              <dd className="font-medium text-gray-900">
                {p?.type} · {p?.status}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Area</dt>
              <dd className="font-medium text-gray-900">{p?.area} sq ft</dd>
            </div>
            <div>
              <dt className="text-gray-500">Bedrooms / Bathrooms</dt>
              <dd className="font-medium text-gray-900">
                {p?.bedrooms} / {p?.bathrooms}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">{doc.type === 'RENT_AGREEMENT' ? 'Monthly rent' : 'Sale price'}</dt>
              <dd className="font-medium text-blue-700">
                PKR {price.toLocaleString('en-PK')}
                {doc.type === 'RENT_AGREEMENT' ? '/month' : ''}
              </dd>
            </div>
          </dl>
          {p?.description && (
            <p className="mt-3 text-sm text-gray-600 whitespace-pre-line">{p.description}</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Parties</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Seller / Landlord</p>
              <p className="font-semibold text-gray-900">{seller?.name}</p>
              <p className="text-gray-600">{seller?.email}</p>
              <p className="text-gray-600">{seller?.phone || '—'}</p>
              <p className="text-xs text-gray-500 mt-2">CNIC (display): {formatCnicDisplay(seller)}</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">Buyer / Tenant</p>
              <p className="font-semibold text-gray-900">{buyer?.name || '—'}</p>
              <p className="text-gray-600">{buyer?.email || '—'}</p>
              <p className="text-gray-600">{buyer?.phone || '—'}</p>
              <p className="text-xs text-gray-500 mt-2">CNIC (display): {formatCnicDisplay(buyer)}</p>
            </div>
          </div>
        </section>

        {doc.type === 'SALE_DEED' && (
          <section className="text-sm text-gray-700 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Sale consideration</h2>
            <p>
              Total sale price: <strong>PKR {price.toLocaleString('en-PK')}</strong> (
              {numberToWordsSimple(price)} Rupees only).
            </p>
            <p>Payment schedule: 20% token within 7 days; 30% on possession; remaining 50% within 180 days of possession.</p>
            <p>Possession target: within 60 days of document generation unless otherwise agreed.</p>
          </section>
        )}

        {doc.type === 'RENT_AGREEMENT' && monthlyRent != null && (
          <section className="text-sm text-gray-700 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Lease terms</h2>
            <p>
              Monthly rent: <strong>PKR {monthlyRent.toLocaleString('en-PK')}</strong> (
              {numberToWordsSimple(monthlyRent)} Rupees only).
            </p>
            <p>
              Security deposit (2 months): PKR {securityDeposit?.toLocaleString('en-PK')}. Advance rent (2 months): PKR{' '}
              {advanceRent?.toLocaleString('en-PK')}.
            </p>
            <p>Utilities: tenant pays metered consumption unless otherwise agreed in writing.</p>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-2">Execution log</h2>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>Seller OTP verified: {doc.sellerOTPVerified ? 'Yes' : 'No'}</li>
            <li>Seller agreed at: {doc.sellerAgreedAt ? new Date(doc.sellerAgreedAt).toLocaleString() : '—'}</li>
            <li>Buyer OTP verified: {doc.buyerOTPVerified ? 'Yes' : 'No'}</li>
            <li>Buyer agreed at: {doc.buyerAgreedAt ? new Date(doc.buyerAgreedAt).toLocaleString() : '—'}</li>
            {doc.documentHash && (
              <li className="font-mono text-xs break-all">Document hash: {doc.documentHash}</li>
            )}
          </ul>
        </section>

        <div className="pt-4 border-t border-gray-100 text-xs text-gray-500">
          This summary is for review on RealNest. The sealed PDF is the formal record after full execution.
        </div>
      </div>

      {showProceedToPayment && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <p className="text-sm text-gray-800 leading-relaxed">{buyerTerms}</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={accepted}
              disabled={!reachedBottom}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span className={`text-sm ${!reachedBottom ? 'text-gray-400' : 'text-gray-700'}`}>
              I Agree to Terms &amp; Conditions
              {!reachedBottom && (
                <span className="block mt-1 text-xs">Scroll to the bottom of the agreement to enable this checkbox.</span>
              )}
            </span>
          </label>
          <button
            type="button"
            disabled={!accepted || !reachedBottom}
            onClick={handleProceedToPayment}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Proceed to Payment
          </button>
          {canSignFlow && (
            <p className="text-xs text-gray-500 text-center">
              OTP verification records your digital signature and saves this agreement before payment.
            </p>
          )}
        </div>
      )}

      {canSignFlow && signingRole === 'seller' && (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <p className="text-sm text-gray-800 leading-relaxed">{displayTerms}</p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={accepted}
              disabled={!reachedBottom}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span className={`text-sm ${!reachedBottom ? 'text-gray-400' : 'text-gray-700'}`}>
              I Agree to Terms &amp; Conditions
              {!reachedBottom && (
                <span className="block mt-1 text-xs">Scroll to the bottom of the agreement to enable this checkbox.</span>
              )}
            </span>
          </label>
          <button
            type="button"
            disabled={!accepted || !reachedBottom}
            onClick={() => setOtpOpen(true)}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Sign with OTP
          </button>
        </div>
      )}

      {!canSignFlow && doc.status !== 'FULLY_EXECUTED' && signingRole && (
        <p className="mt-6 text-center text-sm text-gray-500">
          {signingRole === 'seller' && doc.status === 'SELLER_SIGNED' && 'Awaiting buyer signature.'}
          {signingRole === 'buyer' && doc.status === 'DRAFT' && 'Awaiting seller signature first.'}
          {signingRole === 'buyer'
            && doc.type === 'SALE_DEED'
            && doc.status === 'SELLER_SIGNED'
            && !doc.buyerNotifiedAt
            && 'The seller has not released this deed to you yet. You will see it in your Documents tab after they tap Notify buyer.'}
        </p>
      )}

      <div className="mt-8 text-center">
        <Link to={profile?.role === 'SELLER' ? '/dashboard/seller' : '/dashboard/buyer'} className="text-sm text-blue-600 hover:underline">
          Back to dashboard
        </Link>
      </div>

      <OTPModal
        isOpen={otpOpen}
        onClose={() => setOtpOpen(false)}
        documentId={documentId}
        role={needsSellerSign ? 'seller' : 'buyer'}
        onVerified={handleVerified}
      />
    </div>
  );
}
