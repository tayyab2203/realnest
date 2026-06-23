import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSellerPurchaseIntents, useNotifyBuyerReady } from '../../hooks/useDocuments';

export default function SellerPurchaseIntentsPanel() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: intents = [], isLoading } = useSellerPurchaseIntents(
    !!profile && profile.role === 'SELLER'
  );
  const notifyBuyer = useNotifyBuyerReady();

  if (!profile || profile.role !== 'SELLER') return null;
  if (isLoading) return null;
  if (!intents.length) return null;

  return (
    <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/80 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-base font-semibold text-blue-900">Buyer purchase requests</h2>
          <p className="text-sm text-blue-800/90 mt-0.5">
            Buyers who tapped Buy are waiting for you to create the sale deed, sign it, then notify them so they can agree and pay in installments.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Property</th>
              <th className="text-left px-4 py-2">Buyer</th>
              <th className="text-left px-4 py-2">Deed</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {intents.map((row) => {
              const doc = row.document;
              const pid = row.property?.id;
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.property?.title}</p>
                    <p className="text-xs text-slate-500">{row.property?.city}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.buyer?.name}
                    <br />
                    <span className="text-xs text-slate-500">{row.buyer?.email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {!doc ? (
                      <span className="text-amber-700 font-medium">Not created</span>
                    ) : (
                      <>
                        <span className="font-medium">{doc.status.replace(/_/g, ' ')}</span>
                        {doc.buyerNotifiedAt ? (
                          <p className="text-xs text-emerald-600 mt-0.5">Buyer notified</p>
                        ) : doc.status === 'SELLER_SIGNED' ? (
                          <p className="text-xs text-amber-600 mt-0.5">Notify buyer to unlock signing</p>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-y-1">
                    <button
                      type="button"
                      onClick={() => navigate(`/properties/${pid}`)}
                      className="block w-full sm:w-auto sm:inline-block ml-auto px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-semibold hover:bg-slate-900"
                    >
                      Open listing
                    </button>
                    {doc?.id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/documents/${doc.id}`)}
                        className="block w-full sm:w-auto sm:inline-block ml-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50"
                      >
                        Open deed
                      </button>
                    )}
                    {doc?.status === 'SELLER_SIGNED' && !doc?.buyerNotifiedAt && (
                      <button
                        type="button"
                        disabled={notifyBuyer.isPending}
                        onClick={() =>
                          notifyBuyer.mutate(doc.id, {
                            onSuccess: () => toast.success('Buyer can now see the deed in their Documents tab'),
                            onError: (e) => toast.error(e.message || 'Could not notify'),
                          })
                        }
                        className="block w-full sm:w-auto sm:inline-block ml-auto px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        Notify buyer
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100">
          Tip: On the listing page use <strong>Generate Document</strong>, choose <strong>Sale Deed</strong>, pick this buyer, then sign first — finally tap <strong>Notify buyer</strong> here or in Documents.
        </p>
      </div>
    </div>
  );
}
