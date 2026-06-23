import { HiOutlineDocumentText, HiOutlineMapPin } from 'react-icons/hi2';
import { useSoldProperties } from '../../hooks/useSoldProperties';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTransactionType(type) {
  if (!type) return '—';
  return String(type)
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function formatPaymentMethod(method) {
  if (!method) return '—';
  const s = String(method);
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export default function SoldPropertiesTab() {
  const { data: properties = [], isLoading, error } = useSoldProperties();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error.message}</p>;
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-xl">
        <p className="text-gray-500 font-medium">No sold properties yet.</p>
        <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
          When you complete a sale on the platform or mark a listing as sold offline from My Listings, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-600">
        Sold listings are removed from the marketplace. This view is read-only.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {properties.map((property) => {
          const offline = property.offlineSale;
          const tx = property.transaction;
          const buyer = offline
            ? { name: offline.buyerName, phone: offline.buyerContact }
            : tx?.buyer;
          const salePrice = offline?.salePrice ?? tx?.amount;
          const soldOn = property.soldAt || offline?.saleDate || tx?.createdAt;

          return (
            <article
              key={property.id}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm"
            >
              <img
                src={property.images?.[0] || PLACEHOLDER_IMG}
                alt={property.title}
                className="w-full h-44 object-cover"
              />
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{property.title}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <HiOutlineMapPin className="h-4 w-4 shrink-0" />
                    {property.city}
                    {property.address ? ` · ${property.address}` : ''}
                  </p>
                  {salePrice != null && (
                    <p className="text-sm font-medium text-gray-800 mt-1">
                      PKR {Number(salePrice).toLocaleString('en-PK')}
                    </p>
                  )}
                </div>

                <p className="text-xs text-gray-500">
                  Sold on{' '}
                  <span className="font-medium text-gray-700">{formatDate(soldOn)}</span>
                  {offline && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                      Offline sale
                    </span>
                  )}
                </p>

                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 text-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Deed document
                  </p>
                  {property.deedDocument ? (
                    <a
                      href={property.deedDocument}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold hover:text-emerald-800"
                    >
                      <HiOutlineDocumentText className="h-4 w-4" />
                      View Deed
                    </a>
                  ) : (
                    <span className="text-gray-500">No deed recorded</span>
                  )}
                </div>

                {(offline || tx) && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-sm text-emerald-900">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 mb-1">
                      Sale details
                    </p>
                    {buyer?.name && (
                      <p>
                        Buyer: <span className="font-medium">{buyer.name}</span>
                      </p>
                    )}
                    {buyer?.email && (
                      <p className="text-xs text-emerald-800/90">{buyer.email}</p>
                    )}
                    {buyer?.phone && (
                      <p className="text-xs text-emerald-800/90">{buyer.phone}</p>
                    )}
                    {salePrice != null && (
                      <p className="mt-1">
                        Sale price:{' '}
                        <span className="font-medium">
                          PKR {Number(salePrice).toLocaleString('en-PK')}
                        </span>
                      </p>
                    )}
                    {offline ? (
                      <>
                        <p className="text-xs text-emerald-800/90 mt-0.5">
                          Payment: {formatTransactionType(offline.transactionType)}
                        </p>
                        <p className="text-xs text-emerald-800/90">
                          Handover: {formatTransactionType(offline.handoverStatus)}
                        </p>
                        {offline.notes && (
                          <p className="text-xs text-emerald-800/90 mt-1 italic">{offline.notes}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-emerald-800/90 mt-0.5">
                        Payment: {formatPaymentMethod(tx.paymentMethod)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
