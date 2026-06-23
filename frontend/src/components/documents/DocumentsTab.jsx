import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineClock, HiOutlineDocumentText, HiOutlineInformationCircle } from 'react-icons/hi2';
import { documentTypeLabel } from '../../lib/documentDisplay';
import {
  useSellerDocuments,
  useBuyerDocuments,
  useBuyerPurchaseIntents,
  useRemindBuyer,
  useNotifyBuyerReady,
} from '../../hooks/useDocuments';

function statusBadge(viewerRole, doc) {
  const { status } = doc;
  if (status === 'DRAFT') {
    return { label: 'Draft', className: 'bg-gray-100 text-gray-700' };
  }
  if (status === 'SELLER_SIGNED') {
    if (viewerRole === 'BUYER') {
      return { label: 'Awaiting Your Signature', className: 'bg-amber-100 text-amber-800' };
    }
    return { label: 'Awaiting Buyer', className: 'bg-amber-100 text-amber-800' };
  }
  if (status === 'FULLY_EXECUTED') {
    return { label: 'Fully Executed', className: 'bg-emerald-100 text-emerald-800' };
  }
  if (status === 'CANCELLED') {
    return { label: 'Cancelled', className: 'bg-red-100 text-red-700' };
  }
  return { label: status, className: 'bg-gray-100 text-gray-700' };
}

/** Sale purchase still waiting on seller or not yet released to buyer. */
function buyerIntentPendingStage(intent) {
  if (!intent?.property) return null;
  if (!intent.documentId) return 'awaiting_deed';
  const doc = intent.document;
  if (!doc) return 'awaiting_deed';
  if (doc.status === 'FULLY_EXECUTED') return null;
  if (!doc.buyerNotifiedAt || doc.status === 'DRAFT') return 'seller_preparing';
  return null;
}

function pendingIntentCopy(stage) {
  if (stage === 'awaiting_deed') {
    return {
      title: 'Sale deed not ready yet',
      body:
        'Your seller is preparing your Property Purchase Deed. Stay on this tab — once they generate, verify, and sign it on their side, your document will appear below. You can open and review it here anytime after they release it to you.',
    };
  }
  return {
    title: 'Seller is finalizing your deed',
    body:
      'Your sale deed has been created and the seller is completing verification and signatures. You will be notified when it is ready for you to review, agree to the terms, and sign. Then you can return here to view it whenever you need.',
  };
}

export default function DocumentsTab({ viewerRole, profileId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showAwaitingBanner = searchParams.get('awaiting') === '1';

  const sellerQ = useSellerDocuments(viewerRole === 'SELLER' ? profileId : null);
  const buyerQ = useBuyerDocuments(viewerRole === 'BUYER' ? profileId : null);
  const buyerIntentsQ = useBuyerPurchaseIntents(viewerRole === 'BUYER' && !!profileId);
  const remind = useRemindBuyer();
  const notifyBuyer = useNotifyBuyerReady();

  const { data: documents = [], isLoading, error } = viewerRole === 'SELLER' ? sellerQ : buyerQ;
  const buyerIntents = buyerIntentsQ.data || [];
  const intentsLoading = buyerIntentsQ.isLoading;

  const pendingIntents =
    viewerRole === 'BUYER'
      ? buyerIntents.filter((intent) => buyerIntentPendingStage(intent) != null)
      : [];

  const otherParty = (doc) => {
    if (viewerRole === 'SELLER') return doc.buyer;
    return doc.seller;
  };

  const needsMySignature = (doc) => {
    if (viewerRole === 'SELLER') return doc.status === 'DRAFT';
    if (doc.status !== 'SELLER_SIGNED') return false;
    if (doc.type === 'SALE_DEED' && !doc.buyerNotifiedAt) return false;
    return true;
  };

  const handleNotify = (documentId) => {
    notifyBuyer.mutate(documentId, {
      onSuccess: () => toast.success('Buyer can now open and sign the deed'),
      onError: (e) => toast.error(e.message || 'Could not notify buyer'),
    });
  };

  const handleRemind = (documentId) => {
    remind.mutate(documentId, {
      onSuccess: () => toast.success('Reminder sent to the buyer'),
      onError: (e) => toast.error(e.message || 'Could not send reminder'),
    });
  };

  const openDocument = (doc, { signFlow = false } = {}) => {
    const cont =
      signFlow && viewerRole === 'BUYER' && (doc.type === 'SALE_DEED' || doc.type === 'RENT_AGREEMENT')
        ? `?continue=${encodeURIComponent(`/payment/${doc.propertyId}`)}`
        : '';
    navigate(`/documents/${doc.id}${cont}`);
  };

  if (!profileId) return null;

  const buyerHasActivity = pendingIntents.length > 0 || documents.length > 0;
  const buyerStillLoading = isLoading || intentsLoading;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
        <span className="text-xs text-gray-500">Sale deeds & tenancy agreements</span>
      </div>

      {viewerRole === 'BUYER' && (
        <p className="text-sm text-gray-600 mb-6 -mt-2">
          Purchase agreements and sale deeds for your properties appear here. After a seller prepares your
          document, you can open, review, and sign it from this tab — and view it again anytime.
        </p>
      )}

      {viewerRole === 'BUYER' && (showAwaitingBanner || pendingIntents.length > 0) && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 flex gap-3">
          <HiOutlineInformationCircle className="h-6 w-6 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold">Your document is on the way</p>
            <p className="mt-1 text-blue-800/90">
              Please wait while your seller verifies the listing and prepares your sale deed. It will show
              up in this tab when ready — you do not need to start checkout again. Refresh this page or check
              back later; once released, use <strong>Sign now</strong> or <strong>View deed</strong> on the row below.
            </p>
          </div>
        </div>
      )}

      {buyerStillLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error.message}</p>}

      {viewerRole === 'BUYER' && !buyerStillLoading && pendingIntents.length > 0 && (
        <div className="mb-8 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            In preparation
          </h3>
          {pendingIntents.map((intent) => {
            const stage = buyerIntentPendingStage(intent);
            const copy = pendingIntentCopy(stage);
            const property = intent.property;
            return (
              <div
                key={intent.propertyId}
                className="rounded-xl border border-amber-100 bg-amber-50/80 px-5 py-4 flex gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <HiOutlineClock className="h-5 w-5 text-amber-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{copy.title}</p>
                  <Link
                    to={`/properties/${property?.id}`}
                    className="text-sm font-medium text-blue-700 hover:text-blue-800 mt-0.5 inline-block"
                  >
                    {property?.title || 'Property'}
                    {property?.city ? ` · ${property.city}` : ''}
                  </Link>
                  <p className="text-sm text-gray-600 mt-2">{copy.body}</p>
                  <p className="text-xs text-amber-800/90 mt-3 flex items-center gap-1.5">
                    <HiOutlineDocumentText className="h-4 w-4 shrink-0" />
                    Status: waiting for seller
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!buyerStillLoading && viewerRole === 'SELLER' && documents.length === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-500 text-sm">
          No documents yet. Generate one from a property you list.
        </div>
      )}

      {!buyerStillLoading && viewerRole === 'BUYER' && !buyerHasActivity && (
        <div className="text-center py-16 bg-gray-50 rounded-xl text-gray-600 text-sm max-w-lg mx-auto px-6">
          <HiOutlineDocumentText className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="font-medium text-gray-800">No documents yet</p>
          <p className="mt-2">
            When you start a purchase from a listing, your sale deed will be prepared by the seller and
            listed here. You can view and sign it from this tab once it is ready.
          </p>
          <Link
            to="/properties"
            className="inline-block mt-4 text-blue-600 font-medium hover:text-blue-700"
          >
            Browse properties
          </Link>
        </div>
      )}

      {!isLoading && documents.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          {viewerRole === 'BUYER' && pendingIntents.length > 0 && (
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">Ready to view</h3>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Document ID</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-left px-5 py-3 font-medium">Property</th>
                  <th className="text-left px-5 py-3 font-medium">Other Party</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-right px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => {
                  const badge = statusBadge(viewerRole, doc);
                  const party = otherParty(doc);
                  return (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-mono text-xs text-gray-700 max-w-[140px] truncate">{doc.id}</td>
                      <td className="px-5 py-4 text-gray-800">{documentTypeLabel(doc.type)}</td>
                      <td className="px-5 py-4">
                        <Link className="font-medium text-gray-900 hover:text-blue-600" to={`/properties/${doc.propertyId}`}>
                          {doc.property?.title || 'Property'}
                        </Link>
                        <p className="text-xs text-gray-500">{doc.property?.city}</p>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{party?.name || '—'}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                        {needsMySignature(doc) && (
                          <button
                            type="button"
                            onClick={() => openDocument(doc, { signFlow: true })}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                          >
                            Sign Now
                          </button>
                        )}
                        {viewerRole === 'SELLER'
                          && doc.type === 'SALE_DEED'
                          && doc.status === 'SELLER_SIGNED'
                          && !doc.buyerNotifiedAt && (
                          <button
                            type="button"
                            disabled={notifyBuyer.isPending}
                            onClick={() => handleNotify(doc.id)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                          >
                            Notify buyer
                          </button>
                        )}
                        {doc.status === 'FULLY_EXECUTED' && (
                          <button
                            type="button"
                            onClick={() => openDocument(doc)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                          >
                            View deed
                          </button>
                        )}
                        {viewerRole === 'SELLER' && doc.status === 'SELLER_SIGNED' && (
                          <button
                            type="button"
                            onClick={() => handleRemind(doc.id)}
                            disabled={remind.isPending}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
                          >
                            Remind
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
