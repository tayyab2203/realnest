import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProperty } from '../hooks/useProperties';
import { useAuth } from '../context/AuthContext';
import {
  useTrackView,
  useLikeProperty,
  useUnlikeProperty,
  useSaveProperty,
  useUnsaveProperty,
  useUserInteractions,
  useSavedProperties,
} from '../hooks/useInteractions';
import MapComponent from '../components/MapComponent';
import VerifiedBadge from '../components/dashboard/VerifiedBadge';
import { IoBedOutline, IoWaterOutline } from 'react-icons/io5';
import { BiArea } from 'react-icons/bi';
import {
  HiOutlineHeart,
  HiHeart,
  HiOutlineBookmark,
  HiBookmark,
  HiOutlineMapPin,
  HiOutlineShoppingBag,
  HiOutlineCheckBadge,
  HiOutlineFire,
  HiOutlineBuildingOffice2,
  HiOutlineDocumentText,
} from 'react-icons/hi2';
import { Phone, MessageCircle, Mail, MessageSquare } from 'lucide-react';
import GenerateDocumentModal from '../components/documents/GenerateDocumentModal';
import { usePurchaseIntentForProperty } from '../hooks/useDocuments';

const placeholderImg = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: property, isLoading, error } = useProperty(id);
  const { user, profile } = useAuth();
  const trackView = useTrackView();
  const likeProperty = useLikeProperty();
  const unlikeProperty = useUnlikeProperty();
  const saveProperty = useSaveProperty();
  const unsaveProperty = useUnsaveProperty();

  const { data: likedData } = useUserInteractions(user ? 'LIKE' : null);
  const { data: savedData } = useSavedProperties();

  const isLiked = !!user && (likedData || []).some((i) => i.propertyId === id);
  const isSaved = !!user && (savedData || []).some((p) => p.id === id);
  const seller = property?.seller || property?.agent;
  const sellerPhone = seller?.phone || '';
  const sellerEmail = seller?.email || '';
  const sellerDigitsPhone = sellerPhone.replace(/\D/g, '');
  const sellerWhatsappPhone = sellerDigitsPhone.startsWith('0')
    ? `92${sellerDigitsPhone.slice(1)}`
    : sellerDigitsPhone.startsWith('92')
      ? sellerDigitsPhone
      : `92${sellerDigitsPhone}`;
  const activeBoost = property?.activeBoost;
  const showBoost = !!activeBoost?.isActive;

  const isOwnerSeller =
    !!profile && profile.role === 'SELLER' && property?.sellerId === profile.id;
  const [showDocModal, setShowDocModal] = useState(false);

  const isCommittedBuyer = !!property?.isCommittedBuyer;
  const soldToAnother =
    !!property
    && profile?.role === 'BUYER'
    && !isCommittedBuyer
    && (property.status === 'SOLD' || !!property.committedBuyerId);

  const purchaseIntentQuery = usePurchaseIntentForProperty(id, {
    enabled:
      !!user
      && profile?.role === 'BUYER'
      && (property?.status === 'FOR_SALE' || isCommittedBuyer),
  });
  const purchaseIntent = purchaseIntentQuery.data;
  const intentLoading = purchaseIntentQuery.isLoading;

  const startCheckout = () => {
    if (!id) return;
    navigate(`/checkout/${id}/plan`);
  };

  useEffect(() => {
    if (user && id) {
      trackView.mutate(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record one view per property visit
  }, [id, user]);

  const handleLike = () => {
    if (!user) return;
    if (isLiked) {
      unlikeProperty.mutate(id, {
        onSuccess: () => toast.success('Removed from liked'),
        onError: () => toast.error('Could not unlike property'),
      });
    } else {
      likeProperty.mutate(id, {
        onSuccess: () => toast.success('Added to liked'),
        onError: () => toast.error('Could not like property'),
      });
    }
  };

  const handleSave = () => {
    if (!user) return;
    if (isSaved) {
      unsaveProperty.mutate(id, {
        onSuccess: () => toast.success('Removed from saved'),
        onError: () => toast.error('Could not unsave property'),
      });
    } else {
      saveProperty.mutate(id, {
        onSuccess: () => toast.success('Property saved'),
        onError: () => toast.error('Could not save property'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 h-96 rounded-xl" />
          <div className="bg-gray-200 h-8 w-1/2 rounded" />
          <div className="bg-gray-200 h-4 w-1/3 rounded" />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-lg">Property not found</p>
        <Link to="/properties" className="text-blue-600 mt-4 inline-block">Back to properties</Link>
      </div>
    );
  }

  const images = property.images?.length > 0 ? property.images : [placeholderImg];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <img src={images[0]} alt={property.title} className="w-full h-96 object-cover rounded-xl" />
        {images.length > 1 && (
          <div className="grid grid-cols-2 gap-4">
            {images.slice(1, 5).map((img, i) => (
              <img key={i} src={img} alt="" className="w-full h-[calc(12rem-0.5rem)] object-cover rounded-xl" />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                property.status === 'FOR_SALE'
                  ? 'bg-emerald-100 text-emerald-700'
                  : property.status === 'FOR_RENT'
                    ? 'bg-blue-100 text-blue-700'
                    : property.status === 'PAUSED'
                      ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {property.status === 'FOR_SALE'
                  ? 'For Sale'
                  : property.status === 'FOR_RENT'
                    ? 'For Rent'
                    : property.status === 'PAUSED'
                      ? 'Paused'
                      : 'Sold'}
              </span>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                {property.type.charAt(0) + property.type.slice(1).toLowerCase()}
              </span>
              {showBoost && (
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-violet-100 text-violet-700 inline-flex items-center gap-1">
                  <HiOutlineFire className="h-3.5 w-3.5" /> {activeBoost.boostType}
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-1">{property.title}</h1>
            <p className="flex items-center gap-1 text-gray-500">
              <HiOutlineMapPin className="h-4 w-4" />
              {property.address}, {property.city}
            </p>
          </div>

          <div className="text-3xl font-bold text-blue-600">
            PKR {property.price.toLocaleString()}
            {property.status === 'FOR_RENT' && <span className="text-lg font-normal text-gray-500">/month</span>}
          </div>

          <div className="flex gap-6 bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-700">
              <IoBedOutline className="h-5 w-5 text-blue-600" />
              <span className="font-medium">{property.bedrooms}</span>
              <span className="text-sm text-gray-500">Beds</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <IoWaterOutline className="h-5 w-5 text-blue-600" />
              <span className="font-medium">{property.bathrooms}</span>
              <span className="text-sm text-gray-500">Baths</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <BiArea className="h-5 w-5 text-blue-600" />
              <span className="font-medium">{property.area}</span>
              <span className="text-sm text-gray-500">sqft</span>
            </div>
          </div>

          {property.description && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">{property.description}</p>
            </div>
          )}

          {/* Map */}
          {property.latitude && property.longitude && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Location</h2>
              <MapComponent
                latitude={property.latitude}
                longitude={property.longitude}
                title={property.title}
              />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Buy / Book Button */}
          {property.status === 'PAUSED' ? (
            <div className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-xl font-semibold border border-red-100">
              <HiOutlineCheckBadge className="h-5 w-5" /> This listing is currently paused
            </div>
          ) : soldToAnother ? (
            <div className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 rounded-xl font-semibold border border-red-100">
              <HiOutlineCheckBadge className="h-5 w-5" /> This property has been sold to another buyer
            </div>
          ) : profile?.role === 'BUYER' ? (
            <>
              {(property.status === 'FOR_SALE' || isCommittedBuyer)
                && !intentLoading
                && purchaseIntent != null && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 mb-3">
                  <p className="font-medium">Purchase status</p>
                  <p className="text-blue-800/90 mt-1">
                    {!purchaseIntent.documentId
                      ? 'Your document is being prepared by the seller. They will generate the sale deed and notify you when you can review and sign it in your Documents tab.'
                      : purchaseIntent.document?.status === 'FULLY_EXECUTED'
                        ? 'Sale deed completed. You can continue to installment payments.'
                        : !purchaseIntent.document?.buyerNotifiedAt
                          ? 'The seller is finishing the deed. You will be notified when it is ready to sign.'
                          : 'The sale deed is ready — open Documents to review, agree, then pay in installments.'}
                  </p>
                  {purchaseIntent.documentId &&
                    purchaseIntent.document?.status !== 'FULLY_EXECUTED' && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/documents/${purchaseIntent.documentId}?continue=${encodeURIComponent(`/payment/${property.id}`)}`
                          )
                        }
                        className="mt-3 w-full py-2.5 rounded-lg bg-white border border-blue-200 text-blue-800 text-sm font-semibold hover:bg-blue-50"
                      >
                        Open sale deed
                      </button>
                    )}
                  {purchaseIntent.documentId &&
                    purchaseIntent.document?.status === 'FULLY_EXECUTED' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/payment/${property.id}`)}
                        className="mt-3 w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                      >
                        Go to installment payments
                      </button>
                    )}
                  {purchaseIntent.documentId && (
                    <Link
                      to="/dashboard/buyer?tab=documents"
                      className="mt-3 block w-full text-center py-2.5 rounded-lg border border-blue-200 text-blue-800 text-sm font-semibold hover:bg-blue-50"
                    >
                      View sale deed in Documents
                    </Link>
                  )}
                </div>
              )}
              {!isCommittedBuyer && property.canPurchase !== false && (
                <button
                  onClick={startCheckout}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
                >
                  <HiOutlineShoppingBag className="h-5 w-5" />
                  {property.status === 'FOR_RENT' ? 'Book Property' : 'Buy now'}
                </button>
              )}
            </>
          ) : !user ? (
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <HiOutlineShoppingBag className="h-5 w-5" /> Login to Buy / Book
            </Link>
          ) : null}

          {isOwnerSeller && (property.status === 'FOR_SALE' || property.status === 'FOR_RENT') && (
            <button
              type="button"
              onClick={() => setShowDocModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-colors shadow-sm"
            >
              <HiOutlineDocumentText className="h-5 w-5" />
              Generate Document
            </button>
          )}

          {user && profile?.role === 'BUYER' && (
            <div className="flex gap-3">
              <button
                onClick={handleLike}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-150 active:scale-95 ${
                  isLiked
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                {isLiked ? <HiHeart className="h-5 w-5" /> : <HiOutlineHeart className="h-5 w-5" />}
                {isLiked ? 'Liked' : 'Like'}
              </button>
              <button
                onClick={handleSave}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-150 active:scale-95 ${
                  isSaved
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
              >
                {isSaved ? <HiBookmark className="h-5 w-5" /> : <HiOutlineBookmark className="h-5 w-5" />}
                {isSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          )}

          {/* Seller Info */}
          {seller && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Listed by</h3>
              <div className="flex items-center gap-3 mb-4">
                {seller.companyLogo ? (
                  <img
                    src={seller.companyLogo}
                    alt={seller.companyName || seller.name}
                    className="w-12 h-12 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                    {(seller.companyName || seller.name).charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900 truncate">
                      {seller.companyName || seller.name}
                    </p>
                    {(seller.subscriptionPlan === 'PRO' ||
                      seller.subscriptionPlan === 'AGENCY') && (
                      <VerifiedBadge plan={seller.subscriptionPlan} size="sm" showLabel={false} />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {seller.subscriptionPlan === 'AGENCY'
                      ? 'Verified Agency'
                      : seller.subscriptionPlan === 'PRO'
                        ? 'Verified Pro Seller'
                        : 'Property Seller'}
                  </p>
                  {seller.companyName && seller.companyName !== seller.name && (
                    <p className="text-xs text-gray-400 mt-0.5">Agent: {seller.name}</p>
                  )}
                </div>
              </div>
              {seller.companyDescription && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                  {seller.companyDescription}
                </p>
              )}
              {seller.officeAddress && (
                <p className="text-xs text-gray-500 flex items-start gap-1 mb-4">
                  <HiOutlineBuildingOffice2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {seller.officeAddress}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sellerPhone && (
                  <>
                    <a
                      href={`tel:${sellerPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-medium"
                    >
                      <Phone className="h-4 w-4" /> Call
                    </a>
                    <a
                      href={`https://wa.me/${sellerWhatsappPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#25D366]/15 text-[#1fa855] hover:bg-[#25D366]/25 transition-colors font-medium"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                    <a
                      href={`sms:${sellerPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-medium"
                    >
                      <MessageSquare className="h-4 w-4" /> Message
                    </a>
                  </>
                )}
                {sellerEmail && (
                  <a
                    href={`mailto:${sellerEmail}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium"
                  >
                    <Mail className="h-4 w-4" /> Email
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <GenerateDocumentModal
        property={property}
        isOpen={showDocModal}
        onClose={(data) => {
          setShowDocModal(false);
          if (data?.documentId) navigate(`/documents/${data.documentId}`);
        }}
      />
    </div>
  );
}
