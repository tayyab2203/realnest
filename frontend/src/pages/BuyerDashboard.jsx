import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRecommendations } from '../hooks/useRecommendations';
import {
  useSavedProperties,
  useLikeProperty,
  useUnlikeProperty,
  useSaveProperty,
  useUnsaveProperty,
  useUserInteractions,
} from '../hooks/useInteractions';
import { useMyTransactions } from '../hooks/useTransactions';
import PropertyCard from '../components/PropertyCard';
import DocumentsTab from '../components/documents/DocumentsTab';
import { HiOutlineSparkles, HiOutlineBookmark, HiOutlineHeart, HiOutlineReceiptPercent, HiOutlineDocumentText } from 'react-icons/hi2';

const TAB_IDS = new Set(['recommendations', 'saved', 'liked', 'transactions', 'documents']);

export default function BuyerDashboard() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = TAB_IDS.has(tabParam) ? tabParam : 'recommendations';

  const setTab = (id) => {
    if (id === 'recommendations') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ tab: id }, { replace: true });
    }
  };

  const { data: recommendations, isLoading: recLoading } = useRecommendations();
  const { data: saved, isLoading: savedLoading } = useSavedProperties();
  const { data: liked } = useUserInteractions('LIKE');
  const { data: transactions, isLoading: txLoading } = useMyTransactions();

  const likeProperty = useLikeProperty();
  const unlikeProperty = useUnlikeProperty();
  const saveProperty = useSaveProperty();
  const unsaveProperty = useUnsaveProperty();

  const likedIds = new Set((liked || []).map(i => i.propertyId));
  const savedIds = new Set((saved || []).map(p => p.id));

  const handleLike = (propertyId) => {
    if (likedIds.has(propertyId)) {
      unlikeProperty.mutate(propertyId, {
        onSuccess: () => toast.success('Removed from liked'),
        onError: () => toast.error('Could not unlike property'),
      });
    } else {
      likeProperty.mutate(propertyId, {
        onSuccess: () => toast.success('Added to liked'),
        onError: () => toast.error('Could not like property'),
      });
    }
  };

  const handleSave = (propertyId) => {
    if (savedIds.has(propertyId)) {
      unsaveProperty.mutate(propertyId, {
        onSuccess: () => toast.success('Removed from saved'),
        onError: () => toast.error('Could not unsave property'),
      });
    } else {
      saveProperty.mutate(propertyId, {
        onSuccess: () => toast.success('Property saved'),
        onError: () => toast.error('Could not save property'),
      });
    }
  };

  const tabs = [
    { id: 'recommendations', label: 'For You', icon: HiOutlineSparkles },
    { id: 'saved', label: 'Saved', icon: HiOutlineBookmark },
    { id: 'liked', label: 'Liked', icon: HiOutlineHeart },
    { id: 'transactions', label: 'Transactions', icon: HiOutlineReceiptPercent },
    { id: 'documents', label: 'Documents', icon: HiOutlineDocumentText },
  ];

  const statusBadge = (status) => {
    const map = {
      COMPLETED: 'bg-emerald-100 text-emerald-700',
      PROCESSING: 'bg-amber-100 text-amber-700',
      PENDING: 'bg-gray-100 text-gray-700',
      FAILED: 'bg-red-100 text-red-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {profile?.name}</h1>
        <p className="text-gray-500 mt-1">Here are your personalized property recommendations</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Recommendations Tab */}
      {tab === 'recommendations' && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <HiOutlineSparkles className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recommended for You</h2>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">AI Powered</span>
          </div>

          {recLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse" />)}
            </div>
          ) : recommendations?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  showActions
                  isLiked={likedIds.has(property.id)}
                  isSaved={savedIds.has(property.id)}
                  onLike={handleLike}
                  onSave={handleSave}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <HiOutlineSparkles className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No recommendations yet</p>
              <p className="text-sm text-gray-400 mt-1">Start browsing and liking properties to get personalized suggestions</p>
            </div>
          )}
        </div>
      )}

      {/* Saved Tab */}
      {tab === 'saved' && (
        <div>
          {savedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse" />)}
            </div>
          ) : saved?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {saved.map(property => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  showActions
                  isLiked={likedIds.has(property.id)}
                  isSaved={true}
                  onLike={handleLike}
                  onSave={handleSave}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <HiOutlineBookmark className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No saved properties yet</p>
              <p className="text-sm text-gray-400 mt-1">Click the bookmark icon on any property to save it here</p>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {tab === 'transactions' && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <HiOutlineReceiptPercent className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          </div>

          {txLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />)}
            </div>
          ) : transactions?.length > 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">Property</th>
                      <th className="text-left px-5 py-3 font-medium">Amount</th>
                      <th className="text-left px-5 py-3 font-medium">Method</th>
                      <th className="text-left px-5 py-3 font-medium">Date</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                      <th className="text-right px-5 py-3 font-medium">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <Link
                            to={`/properties/${tx.propertyId}`}
                            className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1"
                          >
                            {tx.property?.title || 'Property'}
                          </Link>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {tx.property?.city}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-gray-900 font-medium">
                          PKR {Number(tx.amount).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {tx.paymentMethod
                            ? tx.paymentMethod.charAt(0) + tx.paymentMethod.slice(1).toLowerCase()
                            : '-'}
                        </td>
                        <td className="px-5 py-4 text-gray-600">{formatDateTime(tx.createdAt)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(tx.status)}`}>
                            {tx.status.charAt(0) + tx.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {tx.status === 'COMPLETED' ? (
                            <Link
                              to={`/receipt/${tx.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                            >
                              <HiOutlineDocumentText className="h-4 w-4" /> View Receipt
                            </Link>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <HiOutlineReceiptPercent className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-1">
                When you purchase or book a property, it will appear here
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <DocumentsTab viewerRole="BUYER" profileId={profile?.id} />
      )}

      {/* Liked Tab */}
      {tab === 'liked' && (
        <div>
          {liked?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {liked.map(interaction => (
                <PropertyCard
                  key={interaction.property.id}
                  property={interaction.property}
                  showActions
                  isLiked={true}
                  isSaved={savedIds.has(interaction.property.id)}
                  onLike={handleLike}
                  onSave={handleSave}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <HiOutlineHeart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No liked properties yet</p>
              <p className="text-sm text-gray-400 mt-1">Heart the properties you love to see them here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
