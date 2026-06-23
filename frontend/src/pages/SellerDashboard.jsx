import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMyProperties } from '../hooks/useProperties';
import { useArchiveProperty } from '../hooks/usePropertyArchive';
import { useMySales } from '../hooks/useTransactions';
import { useRecordOfflineSale } from '../hooks/useOfflineSale';
import {
  useCreditsBalance,
  usePurchaseCredits,
  useBoostListing,
  useVerifySellerProfile,
  useRunExpiryChecks,
  useSellerNotifications,
  useRenewListing,
  BOOST_COSTS,
  VERIFICATION_COST,
  PKR_PER_CREDIT,
  RENEW_LISTING_COST,
} from '../hooks/useSellerCredits';
import { useMySubscription } from '../hooks/useSubscription';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import SubscriptionBanner from '../components/dashboard/SubscriptionBanner';
import VerifiedBadge from '../components/dashboard/VerifiedBadge';
import SellerAnalyticsPanel from '../components/dashboard/SellerAnalyticsPanel';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineEye,
  HiOutlineBookmark,
  HiOutlinePhoto,
  HiOutlineXMark,
  HiOutlineBell,
  HiOutlineDocumentText,
  HiOutlineCheckBadge,
  HiOutlineMapPin,
  HiOutlineCreditCard,
  HiOutlineRocketLaunch,
  HiOutlineFire,
  HiOutlineStar,
  HiOutlineSparkles,
  HiOutlineClock,
  HiOutlineShieldCheck,
  HiOutlineHome,
  HiOutlineWallet,
  HiOutlineArrowPath,
  HiOutlineFunnel,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
  HiOutlineChartBar,
  HiOutlineLockClosed,
  HiOutlineBuildingOffice2,
  HiOutlineArchiveBox,
  HiOutlineCheckCircle,
} from 'react-icons/hi2';
import DocumentsTab from '../components/documents/DocumentsTab';
import SellerPurchaseIntentsPanel from '../components/dashboard/SellerPurchaseIntentsPanel';
import SoldPropertiesTab from '../components/dashboard/SoldPropertiesTab';
import MarkAsSoldModal from '../components/dashboard/MarkAsSoldModal';
import LocationPickerMap from '../components/LocationPickerMap';
import { geocodeAddress } from '../lib/geocode';

const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'VILLA', 'DUPLEX', 'WAREHOUSE', 'INDUSTRIAL', 'RESORT', 'OTHER'];

const emptyForm = {
  title: '', description: '', type: 'HOUSE', status: 'FOR_SALE',
  price: '', city: '', address: '', latitude: '', longitude: '',
  bedrooms: '', bathrooms: '', area: '', images: '',
};

const BOOST_OPTIONS = [
  {
    type: 'HOT',
    title: 'Hot',
    description: 'Highlight your listing in search results for 30 days.',
    icon: HiOutlineFire,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badgeBg: 'bg-red-500',
  },
  {
    type: 'PREMIUM',
    title: 'Premium',
    description: 'Featured placement plus a Premium badge for 30 days.',
    icon: HiOutlineStar,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-500',
  },
  {
    type: 'PLATINUM',
    title: 'Platinum',
    description: 'Top-of-search and Platinum badge for 30 days.',
    icon: HiOutlineSparkles,
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    badgeBg: 'bg-violet-500',
  },
];

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const boostMeta = (boostType) =>
  BOOST_OPTIONS.find((b) => b.type === boostType) || null;

export default function SellerDashboard() {
  const { profile, fetchProfile } = useAuth();
  const { data: properties, isLoading } = useMyProperties();
  const { data: sales = [], isLoading: salesLoading } = useMySales();
  const queryClient = useQueryClient();

  const { data: creditsData } = useCreditsBalance();
  const purchaseCredits = usePurchaseCredits();
  const boostListing = useBoostListing();
  const verifyProfileMut = useVerifySellerProfile();
  const runExpiryChecks = useRunExpiryChecks();
  const renewListingMut = useRenewListing();
  const { data: notifications = [], refetch: refetchNotifications } = useSellerNotifications();
  const { data: subscription } = useMySubscription();

  const balance = creditsData?.balance ?? 0;
  const history = creditsData?.history ?? [];
  const totals = creditsData?.totals ?? { totalPurchased: 0, totalSpent: 0, currentBalance: balance };
  // Either credit-based verification OR a Pro/Agency plan grants the badge.
  const verifiedBadge =
    creditsData?.verifiedBadge ??
    profile?.verifiedBadge ??
    subscription?.isVerified ??
    false;
  const isPremiumPlan =
    subscription?.plan === 'PRO' || subscription?.plan === 'AGENCY';
  const isAgencyPlan = subscription?.plan === 'AGENCY';
  const isFreePlan = !subscription || subscription.plan === 'FREE';
  const listingLimitReached =
    isFreePlan &&
    subscription &&
    subscription.activeListings >= subscription.listingLimit;

  const [activeTab, setActiveTab] = useState('listings');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const [creditsToBuy, setCreditsToBuy] = useState(5);
  const [showBuyCreditsModal, setShowBuyCreditsModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [boostModalProperty, setBoostModalProperty] = useState(null);
  const [renewModalProperty, setRenewModalProperty] = useState(null);
  const [markAsSoldProperty, setMarkAsSoldProperty] = useState(null);
  const recordOfflineSale = useRecordOfflineSale();
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('ALL');

  const fileInputRef = useRef(null);
  const notificationsRef = useRef(null);
  const lastGeocodedRef = useRef('');

  useEffect(() => {
    runExpiryChecks.mutate(undefined, {
      onSuccess: () => {
        refetchNotifications();
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run expiry check once when dashboard loads
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const seenStorageKey = profile?.id ? `seller_sales_seen_at_${profile.id}` : null;
  const [lastSeenAt, setLastSeenAt] = useState(() => {
    if (typeof window === 'undefined' || !seenStorageKey) return 0;
    const stored = window.localStorage.getItem(seenStorageKey);
    return stored ? new Date(stored).getTime() : 0;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !seenStorageKey) return;
    const stored = window.localStorage.getItem(seenStorageKey);
    setLastSeenAt(stored ? new Date(stored).getTime() : 0);
  }, [seenStorageKey]);

  const newSales = useMemo(
    () => (sales || []).filter((s) => new Date(s.createdAt).getTime() > lastSeenAt),
    [sales, lastSeenAt]
  );

  const markSalesAsRead = () => {
    if (!seenStorageKey || typeof window === 'undefined') return;
    const now = new Date().toISOString();
    window.localStorage.setItem(seenStorageKey, now);
    setLastSeenAt(new Date(now).getTime());
  };

  // Auto-geocode the address+city while the user types so they don't have to
  // pick a point on the map themselves. Debounced to respect Nominatim's
  // ~1 req/sec policy. Skipped if the same query was already geocoded.
  useEffect(() => {
    if (!showForm) return undefined;
    const query = [form.address, form.city].filter(Boolean).join(', ').trim();
    if (query.length < 4) return undefined;
    if (query === lastGeocodedRef.current) return undefined;

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setGeocoding(true);
      try {
        const result = await geocodeAddress(query, { signal: controller.signal });
        lastGeocodedRef.current = query;
        if (result) {
          setForm((f) => ({
            ...f,
            latitude: String(result.lat),
            longitude: String(result.lng),
          }));
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          // Silent: geocoding is best-effort.
        }
      } finally {
        setGeocoding(false);
      }
    }, 700);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [form.address, form.city, showForm]);

  const handleManualGeocode = async () => {
    const query = [form.address, form.city].filter(Boolean).join(', ').trim();
    if (query.length < 3) {
      toast.error('Type an address or city first');
      return;
    }
    setGeocoding(true);
    try {
      const result = await geocodeAddress(query);
      lastGeocodedRef.current = query;
      if (result) {
        setForm((f) => ({
          ...f,
          latitude: String(result.lat),
          longitude: String(result.lng),
        }));
        toast.success('Location found on map');
      } else {
        toast.error('Could not find that address');
      }
    } catch {
      toast.error('Geocoding service unavailable');
    } finally {
      setGeocoding(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024);
    if (valid.length < files.length) toast.error('Some files were skipped (max 5MB, images only)');
    setSelectedFiles(prev => [...prev, ...valid].slice(0, 10));
    e.target.value = '';
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/properties', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property listed successfully!');
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/properties/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property updated!');
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Property deleted');
    },
    onError: (err) => toast.error(err.message),
  });

  const archiveMutation = useArchiveProperty();

  const handleArchive = (propertyId) => {
    if (
      !confirm(
        'Archive this property? It will be hidden from buyers but saved in your records.'
      )
    ) {
      return;
    }
    archiveMutation.mutate(propertyId, {
      onSuccess: () => toast.success('Property archived'),
      onError: (err) => toast.error(err.message || 'Failed to archive property'),
    });
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setSelectedFiles([]);
    lastGeocodedRef.current = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOfflineSaleSubmit = (payload) => {
    recordOfflineSale.mutate(payload, {
      onSuccess: () => {
        toast.success('Property marked as sold successfully');
        setMarkAsSoldProperty(null);
      },
      onError: (err) => {
        toast.error(err?.message || 'Failed to record offline sale');
      },
    });
  };

  const handleEdit = (property) => {
    if (property.status === 'SOLD') {
      toast.error('Sold properties cannot be edited');
      return;
    }
    lastGeocodedRef.current = [property.address, property.city]
      .filter(Boolean)
      .join(', ')
      .trim();
    setForm({
      title: property.title,
      description: property.description || '',
      type: property.type,
      status: property.status,
      price: property.price.toString(),
      city: property.city,
      address: property.address,
      latitude: property.latitude?.toString() || '',
      longitude: property.longitude?.toString() || '',
      bedrooms: property.bedrooms.toString(),
      bathrooms: property.bathrooms.toString(),
      area: property.area.toString(),
      images: (property.images || []).join(', '),
    });
    setSelectedFiles([]);
    setEditingId(property.id);
    setShowForm(true);
    setActiveTab('listings');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let imageUrls = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [];

    if (selectedFiles.length > 0) {
      setUploading(true);
      try {
        const formData = new FormData();
        selectedFiles.forEach(f => formData.append('images', f));
        const { data: uploadRes } = await api.post('upload/images', formData);
        imageUrls = [...imageUrls, ...(uploadRes.urls || [])];
        if (uploadRes.errors?.length) toast.error(uploadRes.errors.join(' '));
      } catch (err) {
        toast.error(err?.message || 'Failed to upload images');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const data = { ...form, images: imageUrls };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  // Buy credits flow
  const safeCreditsToBuy = Math.max(1, parseInt(creditsToBuy, 10) || 1);
  const purchaseCostPkr = safeCreditsToBuy * PKR_PER_CREDIT;

  const handleCreditsPurchaseSuccess = async (txnPayload) => {
    setShowBuyCreditsModal(false);
    try {
      await purchaseCredits.mutateAsync({
        creditsAmount: safeCreditsToBuy,
        transactionId: txnPayload.transactionId,
        sellerId: profile?.id,
      });
      toast.success(`Added ${safeCreditsToBuy} credit${safeCreditsToBuy === 1 ? '' : 's'} to wallet`);
    } catch (err) {
      toast.error(err.message || 'Could not add credits');
    }
  };

  // Boost flow
  const handleBoost = async (boostType) => {
    if (!boostModalProperty) return;
    const cost = BOOST_COSTS[boostType];
    if (balance < cost) {
      toast.error(`Not enough credits — ${cost} required, ${balance} available`);
      return;
    }
    try {
      await boostListing.mutateAsync({
        propertyId: boostModalProperty.id,
        boostType,
        sellerId: profile?.id,
      });
      toast.success(`${boostType} boost applied for 30 days`);
      setBoostModalProperty(null);
    } catch (err) {
      toast.error(err.message || 'Could not apply boost');
    }
  };

  // Verify flow
  const handleVerify = async () => {
    if (verifiedBadge) return;
    if (balance < VERIFICATION_COST) {
      toast.error(`Not enough credits — ${VERIFICATION_COST} required, ${balance} available`);
      return;
    }
    try {
      await verifyProfileMut.mutateAsync();
      toast.success('Profile verified');
      setShowVerifyModal(false);
      fetchProfile?.();
    } catch (err) {
      toast.error(err.message || 'Could not verify profile');
    }
  };

  // Renew flow
  const handleRenewListing = async () => {
    if (!renewModalProperty) return;
    if (balance < RENEW_LISTING_COST) {
      toast.error("You don't have enough credits. Please purchase credits to renew this listing.");
      return;
    }
    try {
      await renewListingMut.mutateAsync({ propertyId: renewModalProperty.id });
      toast.success('Listing renewed for 6 months');
      setRenewModalProperty(null);
    } catch (err) {
      toast.error(err.message || 'Could not renew listing');
    }
  };

  const insufficientForVerification = balance < VERIFICATION_COST;
  const insufficientForRenew = balance < RENEW_LISTING_COST;
  const expiringBoostNotifications = notifications
    .filter((n) => n.daysRemaining <= 5)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const filteredHistory = history.filter((row) => {
    if (historyFilter === 'PURCHASES') return row.type === 'PURCHASE';
    if (historyFilter === 'SPENT') return row.type === 'SPENT';
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            {isPremiumPlan ? (
              <VerifiedBadge variant={isAgencyPlan ? 'agency' : 'seller'} size="md" />
            ) : verifiedBadge ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-100">
                <HiOutlineShieldCheck className="h-3.5 w-3.5" /> Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setShowVerifyModal(true)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100"
              >
                <HiOutlineShieldCheck className="h-3.5 w-3.5" />
                Get Verified · {VERIFICATION_COST} credits
              </button>
            )}
            {subscription && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  subscription.plan === 'AGENCY'
                    ? 'bg-violet-100 text-violet-700'
                    : subscription.plan === 'PRO'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {subscription.plan === 'AGENCY'
                  ? 'Agency'
                  : subscription.plan === 'PRO'
                    ? 'Pro'
                    : 'Free'}
              </span>
            )}
          </div>
          <p className="text-gray-500 mt-1">Manage your property listings, {profile?.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              aria-label="Seller notifications"
            >
              <HiOutlineBell className="h-5 w-5" />
              {expiringBoostNotifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {expiringBoostNotifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-[22rem] max-w-[90vw] rounded-xl border border-gray-100 bg-white shadow-lg z-20">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">Boost Expiry Notifications</p>
                </div>
                {expiringBoostNotifications.length === 0 ? (
                  <div className="px-4 py-4 text-sm text-gray-500">No expiring boosts right now.</div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto divide-y divide-gray-100">
                    {expiringBoostNotifications.map((note, idx) => (
                      <li key={`${note.propertyId}-${note.boostType}-${note.daysRemaining}-${idx}`} className="px-4 py-3 text-sm">
                        {note.daysRemaining > 1 && (
                          <p className="text-amber-700">
                            {'⚠️'} Your {note.boostType} boost on {note.propertyTitle} expires in {note.daysRemaining} days
                          </p>
                        )}
                        {note.daysRemaining === 1 && (
                          <p className="text-amber-700">
                            {'⚠️'} Your boost expires TOMORROW! ({note.boostType} on {note.propertyTitle})
                          </p>
                        )}
                        {note.daysRemaining <= 0 && (
                          <p className="text-red-700">
                            {'🔴'} Your boost has expired. ({note.boostType} on {note.propertyTitle})
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Expiry: {formatDate(note.expiryDate)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5">
            <HiOutlineWallet className="h-5 w-5 text-blue-600" />
            <div className="leading-tight">
              <div className="text-[10px] uppercase tracking-wider text-gray-400">Credits</div>
              <div className="text-sm font-bold text-gray-900">{balance}</div>
            </div>
          </div>
          <button
            onClick={() => {
              if (!showForm && listingLimitReached) {
                toast.error(
                  'Free plan allows maximum 2 listings. Upgrade to Pro for unlimited listings.'
                );
                return;
              }
              resetForm();
              setShowForm((v) => !v);
              setActiveTab('listings');
            }}
            disabled={!showForm && listingLimitReached}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
              !showForm && listingLimitReached
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            title={
              !showForm && listingLimitReached
                ? 'Free plan limit reached — upgrade to Pro for unlimited listings'
                : ''
            }
          >
            {!showForm && listingLimitReached ? (
              <HiOutlineLockClosed className="h-5 w-5" />
            ) : (
              <HiOutlinePlus className="h-5 w-5" />
            )}
            {showForm ? 'Cancel' : 'New Listing'}
          </button>
        </div>
      </div>

      {/* Subscription / listing-limit banner */}
      <SubscriptionBanner subscription={subscription} />

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-sm w-full max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('listings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'listings'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <HiOutlineHome className="h-4 w-4" /> My Listings
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <HiOutlineChartBar className="h-4 w-4" /> Analytics
          {!isPremiumPlan && <HiOutlineLockClosed className="h-3 w-3 text-amber-500" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('wallet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'wallet'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <HiOutlineWallet className="h-4 w-4" /> Wallet & Credits
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sold')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'sold'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <HiOutlineArchiveBox className="h-4 w-4" /> Sold Properties
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'documents'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <HiOutlineDocumentText className="h-4 w-4" /> Documents
        </button>
        {isAgencyPlan && (
          <Link
            to="/dashboard/agency"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
          >
            <HiOutlineBuildingOffice2 className="h-4 w-4" /> Agency
          </Link>
        )}
      </div>

      {activeTab === 'listings' && (
        <>
          <SellerPurchaseIntentsPanel />
          {expiringBoostNotifications.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
              <p className="text-sm font-semibold">
                Boost expiry warning: You have {expiringBoostNotifications.length} boost{expiringBoostNotifications.length === 1 ? '' : 's'} expiring within 5 days.
              </p>
            </div>
          )}
          {/* Sales notifications */}
          {!salesLoading && (sales?.length > 0) && (
            <div className="mb-8">
              {newSales.length > 0 && (
                <div className="mb-4 flex items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-emerald-200 bg-emerald-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600/10 rounded-xl">
                      <HiOutlineBell className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        {newSales.length === 1
                          ? 'You have a new sale!'
                          : `You have ${newSales.length} new sales!`}
                      </p>
                      <p className="text-xs text-emerald-700/80">
                        Buyer{newSales.length === 1 ? '' : 's'} just completed payment for your propert{newSales.length === 1 ? 'y' : 'ies'}.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={markSalesAsRead}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
                  >
                    Mark as read
                  </button>
                </div>
              )}

              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <HiOutlineCheckBadge className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-base font-semibold text-gray-900">Recent Sales</h2>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {sales.length}
                    </span>
                  </div>
                </div>
                <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {sales.map((sale) => {
                    const isNew = new Date(sale.createdAt).getTime() > lastSeenAt;
                    const buyer = sale.user || {};
                    const property = sale.property || {};
                    const isOffline = sale.source === 'offline';
                    return (
                      <li
                        key={`${sale.source}-${sale.id}`}
                        className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center px-5 py-4 ${
                          isNew ? 'bg-emerald-50/40' : ''
                        }`}
                      >
                        <img
                          src={property.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&q=80'}
                          alt={property.title}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-gray-900 truncate">
                              {property.title || 'Property'}
                            </p>
                            {isNew && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-600 text-white rounded-full">
                                New
                              </span>
                            )}
                            {isOffline && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                                Offline
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            Sold to{' '}
                            <span className="font-medium text-gray-700">
                              {buyer.name || (isOffline ? 'Buyer (offline)' : 'Buyer')}
                            </span>
                            {buyer.email ? ` · ${buyer.email}` : ''}
                            {buyer.phone ? ` · ${buyer.phone}` : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {formatDateTime(sale.soldAt || sale.saleDate || sale.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                          <span className="text-sm font-semibold text-gray-900">
                            PKR {Number(sale.amount).toLocaleString()}
                          </span>
                          {!isOffline && (
                            <Link
                              to={`/receipt/${sale.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 whitespace-nowrap"
                            >
                              <HiOutlineDocumentText className="h-4 w-4" /> Receipt
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* Property Form */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-6 mb-8 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                {editingId ? 'Edit Property' : 'Add New Property'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input name="title" required value={form.title} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea name="description" rows={3} value={form.description} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select name="type" value={form.type} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                  <select name="status" value={form.status} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="FOR_SALE">For Sale</option>
                    <option value="FOR_RENT">For Rent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Price (PKR)</label>
                  <input name="price" type="number" required value={form.price} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">City</label>
                  <input name="city" required value={form.city} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Address</label>
                  <input name="address" required value={form.address} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="md:col-span-2 lg:col-span-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-500">Location</label>
                    <div className="flex items-center gap-3">
                      {geocoding && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          Locating...
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleManualGeocode}
                        disabled={geocoding}
                        className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
                      >
                        <HiOutlineMapPin className="h-3.5 w-3.5" /> Find from address
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    The map updates automatically as you type the address and city. Click the map to fine-tune.
                  </p>
                  <LocationPickerMap
                    latitude={form.latitude}
                    longitude={form.longitude}
                    onLocationSelect={(lat, lng) => {
                      setForm((f) => ({ ...f, latitude: String(lat), longitude: String(lng) }));
                      lastGeocodedRef.current = [form.address, form.city]
                        .filter(Boolean)
                        .join(', ')
                        .trim();
                    }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bedrooms</label>
                  <input name="bedrooms" type="number" required value={form.bedrooms} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bathrooms</label>
                  <input name="bathrooms" type="number" required value={form.bathrooms} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Area (sqft)</label>
                  <input name="area" type="number" required value={form.area} onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="md:col-span-2 lg:col-span-3 space-y-3">
                  <label className="block text-xs font-medium text-gray-500">Photos</label>
                  <div className="flex flex-wrap gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                    >
                      <HiOutlinePhoto className="h-5 w-5" />
                      Add from gallery
                    </button>
                    <span className="text-xs text-gray-400 self-center">or paste URLs below (max 10 images, 5MB each)</span>
                  </div>
                  {(selectedFiles.length > 0 || (form.images && form.images.trim())) && (
                    <div className="flex flex-wrap gap-3">
                      {selectedFiles.map((file, i) => (
                        <div key={`file-${i}`} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt=""
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(i)}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                          >
                            <HiOutlineXMark className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {(form.images?.split(',').filter(u => u.trim()) ?? []).map((url, i) => {
                        const u = url.trim();
                        return (
                          <div key={`url-${i}`} className="relative">
                            <img src={u} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" onError={(e) => { e.target.style.display = 'none'; }} />
                            <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">URL</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <input name="images" value={form.images} onChange={handleChange} placeholder="Or paste image URLs (comma separated): https://..., https://..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={resetForm}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending || updateMutation.isPending || uploading}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {uploading ? 'Uploading...' : editingId ? 'Update Property' : 'Create Listing'}
                </button>
              </div>
            </form>
          )}

          {/* Properties List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="bg-gray-100 rounded-xl h-24 animate-pulse" />)}
            </div>
          ) : properties?.length > 0 ? (
            <div className="space-y-4">
              {properties.map((property) => {
                const boost = property.activeBoost;
                const meta = boost ? boostMeta(boost.boostType) : null;
                const isPaused = property.status === 'PAUSED';
                const isForSale = property.status === 'FOR_SALE';
                return (
                  <div key={property.id} className={`bg-white border rounded-xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-stretch ${
                    isPaused ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                  }`}>
                    <img
                      src={property.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=200&q=80'}
                      alt={property.title}
                      className="w-full sm:w-28 h-28 object-cover rounded-lg shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                        {meta && !isPaused && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${meta.badgeBg} text-white rounded-full`}
                          >
                            <meta.icon className="h-3 w-3" /> {meta.title}
                          </span>
                        )}
                        {isPaused && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-red-600 text-white rounded-full">
                            <HiOutlineClock className="h-3 w-3" /> Listing Expired
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{property.city} &middot; PKR {property.price.toLocaleString()}</p>

                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <HiOutlineEye className="h-3.5 w-3.5" /> {property._count?.interactions || 0} interactions
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <HiOutlineBookmark className="h-3.5 w-3.5" /> {property._count?.saved || 0} saves
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          property.status === 'FOR_SALE'
                            ? 'bg-emerald-50 text-emerald-600'
                            : property.status === 'FOR_RENT'
                              ? 'bg-blue-50 text-blue-600'
                              : property.status === 'PAUSED'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-600'
                        }`}>
                          {property.status === 'FOR_SALE'
                            ? 'Sale'
                            : property.status === 'FOR_RENT'
                              ? 'Rent'
                              : property.status === 'PAUSED'
                                ? 'Paused'
                                : 'Sold'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 flex-wrap text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <HiOutlineClock className="h-3.5 w-3.5" />
                          Listing expires: <span className="font-medium text-gray-700">{formatDate(property.listingExpiresAt)}</span>
                        </span>
                        {boost && (
                          <span className="inline-flex items-center gap-1">
                            <HiOutlineRocketLaunch className="h-3.5 w-3.5" />
                            Boost expires: <span className="font-medium text-gray-700">{formatDate(boost.expiryDate)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-stretch gap-2 sm:items-end">
                      {isForSale && (
                        <button
                          type="button"
                          onClick={() => setMarkAsSoldProperty(property)}
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <HiOutlineCheckCircle className="h-4 w-4" /> Mark as Sold
                        </button>
                      )}
                      {isPaused ? (
                        <button
                          type="button"
                          onClick={() => setRenewModalProperty(property)}
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                        >
                          <HiOutlineArrowPath className="h-4 w-4" /> Renew Listing
                        </button>
                      ) : isPremiumPlan ? (
                        <button
                          type="button"
                          onClick={() => setBoostModalProperty(property)}
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100"
                        >
                          <HiOutlineRocketLaunch className="h-4 w-4" /> {boost ? 'Change Boost' : 'Boost Property'}
                        </button>
                      ) : (
                        <Link
                          to="/subscription"
                          title="Boosts require a Pro or Agency subscription"
                          className="flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100"
                        >
                          <HiOutlineLockClosed className="h-4 w-4" /> Upgrade to Boost
                        </Link>
                      )}
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleEdit(property)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          aria-label="Edit"
                        >
                          <HiOutlinePencil className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(property.id)}
                          disabled={archiveMutation.isPending}
                          className="flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 border border-amber-200 rounded-lg transition-colors disabled:opacity-50"
                          title="Archive property"
                        >
                          <HiOutlineArchiveBox className="h-4 w-4 shrink-0" />
                          Archive
                        </button>
                        <button
                          onClick={() => { if (confirm('Delete this property?')) deleteMutation.mutate(property.id); }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          aria-label="Delete"
                        >
                          <HiOutlineTrash className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-xl">
              <p className="text-gray-500 font-medium">No listings yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "New Listing" to add your first property</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'analytics' && (
        <SellerAnalyticsPanel subscription={subscription} />
      )}

      {activeTab === 'wallet' && (
        <div className="space-y-6">
          {/* Balance card */}
          <div className="rounded-2xl p-6 bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-100">Current Balance</p>
                <p className="mt-2 text-4xl font-bold">{balance} <span className="text-base font-medium text-blue-100">credits</span></p>
                <p className="mt-1 text-sm text-blue-100">
                  1 credit = PKR {PKR_PER_CREDIT.toLocaleString()}
                </p>
              </div>
              <HiOutlineWallet className="h-10 w-10 opacity-80" />
            </div>
          </div>

          {/* Buy credits */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Buy Credits</h2>
            <p className="text-sm text-gray-500 mt-1">
              Use credits to boost listings or get verified.
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Credits to buy</label>
                <input
                  type="number"
                  min={1}
                  value={creditsToBuy}
                  onChange={(e) => setCreditsToBuy(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Total cost</label>
                <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm font-semibold text-gray-900">
                  PKR {purchaseCostPkr.toLocaleString()}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBuyCreditsModal(true)}
                className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
              >
                <HiOutlineCreditCard className="h-5 w-5" /> Pay PKR {purchaseCostPkr.toLocaleString()}
              </button>
            </div>
          </div>

          {/* Verification */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${verifiedBadge ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                <HiOutlineShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {verifiedBadge ? 'You are verified' : 'Get a Verified Badge'}
                </h3>
                <p className="text-sm text-gray-500">
                  {verifiedBadge
                    ? 'Your seller profile shows a verified badge to buyers.'
                    : `Costs ${VERIFICATION_COST} credits — boosts buyer trust.`}
                </p>
              </div>
            </div>
            {!verifiedBadge && (
              <button
                type="button"
                onClick={() => setShowVerifyModal(true)}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
              >
                Get Verified ({VERIFICATION_COST} credits)
              </button>
            )}
          </div>

          {/* History summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 text-emerald-700">
                <HiOutlineArrowDownTray className="h-5 w-5" />
                <p className="text-xs font-semibold uppercase tracking-wider">Total Purchased</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-emerald-800">+{totals.totalPurchased}</p>
              <p className="text-xs text-emerald-700/80">credits all time</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
              <div className="flex items-center gap-2 text-rose-700">
                <HiOutlineArrowUpTray className="h-5 w-5" />
                <p className="text-xs font-semibold uppercase tracking-wider">Total Spent</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-rose-800">−{totals.totalSpent}</p>
              <p className="text-xs text-rose-700/80">credits all time</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex items-center gap-2 text-blue-700">
                <HiOutlineWallet className="h-5 w-5" />
                <p className="text-xs font-semibold uppercase tracking-wider">Current Balance</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-blue-800">{totals.currentBalance}</p>
              <p className="text-xs text-blue-700/80">credits available</p>
            </div>
          </div>

          {/* Transaction history */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900">Transaction History</h2>
              <div className="inline-flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1">
                <HiOutlineFunnel className="h-4 w-4 text-gray-400 ml-2" />
                {[
                  { id: 'ALL', label: 'All' },
                  { id: 'PURCHASES', label: 'Purchases' },
                  { id: 'SPENT', label: 'Spent' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setHistoryFilter(opt.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      historyFilter === opt.id
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-100'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-sm text-gray-500">
                {history.length === 0 ? 'No credit activity yet.' : 'No transactions match this filter.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium">Date</th>
                      <th className="text-left px-5 py-3 font-medium">Type</th>
                      <th className="text-left px-5 py-3 font-medium">Credits</th>
                      <th className="text-left px-5 py-3 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredHistory.map((row) => {
                      const isPurchase = row.type === 'PURCHASE';
                      const property = row.property;
                      return (
                        <tr
                          key={row.id}
                          className={isPurchase ? 'bg-emerald-50/30' : 'bg-rose-50/20'}
                        >
                          <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                            {formatDateTime(row.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                isPurchase
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {isPurchase ? 'Purchase' : 'Spent'}
                            </span>
                          </td>
                          <td className={`px-5 py-3 font-semibold whitespace-nowrap ${
                            isPurchase ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {isPurchase ? '+' : '−'}{row.amount}
                          </td>
                          <td className="px-5 py-3 text-gray-700">
                            <div className="flex flex-col">
                              <span>{row.description}</span>
                              {!isPurchase && property?.id && (
                                <Link
                                  to={`/property/${property.id}`}
                                  className="mt-0.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                                >
                                  {property.title || 'View property'} →
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sold' && <SoldPropertiesTab />}

      {markAsSoldProperty && (
        <MarkAsSoldModal
          property={markAsSoldProperty}
          onClose={() => !recordOfflineSale.isPending && setMarkAsSoldProperty(null)}
          onSubmit={handleOfflineSaleSubmit}
          isPending={recordOfflineSale.isPending}
        />
      )}

      {activeTab === 'documents' && (
        <DocumentsTab viewerRole="SELLER" profileId={profile?.id} />
      )}

      {/* Buy Credits modal */}
      {showBuyCreditsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="buy-credits-modal-title"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-gray-50 p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setShowBuyCreditsModal(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
              aria-label="Close"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
            <h2 id="buy-credits-modal-title" className="pr-10 text-xl font-bold text-gray-900">
              Buy {safeCreditsToBuy} credit{safeCreditsToBuy === 1 ? '' : 's'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Mock checkout — total PKR {purchaseCostPkr.toLocaleString()}.
            </p>
            <div className="mt-6">
              <MockStripeCheckout
                amount={purchaseCostPkr}
                purpose="Credit Purchase"
                navigateBackAfterSuccess={false}
                onSuccess={handleCreditsPurchaseSuccess}
                onFailure={() => toast.error('Card declined (demo)')}
              />
            </div>
          </div>
        </div>
      )}

      {/* Boost modal */}
      {boostModalProperty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="boost-modal-title"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setBoostModalProperty(null)}
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
            <h2 id="boost-modal-title" className="pr-10 text-xl font-bold text-gray-900">
              Boost “{boostModalProperty.title}”
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              You have <span className="font-semibold text-gray-900">{balance} credit{balance === 1 ? '' : 's'}</span>. Boosts last 30 days.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {BOOST_OPTIONS.map((opt) => {
                const cost = BOOST_COSTS[opt.type];
                const insufficient = balance < cost;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    disabled={insufficient || boostListing.isPending}
                    onClick={() => handleBoost(opt.type)}
                    className={`text-left rounded-xl border-2 p-4 transition-colors ${
                      insufficient
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                        : `${opt.border} ${opt.bg} hover:brightness-95`
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <opt.icon className={`h-6 w-6 ${opt.color}`} />
                      <span className={`text-xs font-bold uppercase ${opt.color}`}>
                        {cost} credit{cost === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="mt-3 font-semibold text-gray-900">{opt.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{opt.description}</p>
                    {insufficient && (
                      <p className="mt-2 text-xs font-semibold text-red-600">
                        Need {cost - balance} more credit{cost - balance === 1 ? '' : 's'}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {balance < BOOST_COSTS.HOT && (
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                <HiOutlineWallet className="h-5 w-5 mt-0.5 shrink-0" />
                <span>
                  You're out of credits. Switch to the Wallet tab to buy more.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Renew Listing modal */}
      {renewModalProperty && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="renew-modal-title"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setRenewModalProperty(null)}
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
                <HiOutlineArrowPath className="h-6 w-6" />
              </div>
              <h2 id="renew-modal-title" className="text-xl font-bold text-gray-900">Renew Listing</h2>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Renew <span className="font-semibold text-gray-900">“{renewModalProperty.title}”</span> for another 6 months. This costs <span className="font-semibold text-gray-900">{RENEW_LISTING_COST} credit{RENEW_LISTING_COST === 1 ? '' : 's'}</span> and re-publishes the listing publicly.
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm flex justify-between">
              <span className="text-gray-600">Your balance</span>
              <span className="font-semibold text-gray-900">{balance} credit{balance === 1 ? '' : 's'}</span>
            </div>
            {insufficientForRenew && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <HiOutlineWallet className="h-5 w-5 mt-0.5 shrink-0" />
                <span>
                  You don't have enough credits. Please purchase credits to renew this listing.
                </span>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRenewModalProperty(null)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              {insufficientForRenew ? (
                <button
                  type="button"
                  onClick={() => { setRenewModalProperty(null); setActiveTab('wallet'); }}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                >
                  Buy Credits
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRenewListing}
                  disabled={renewListingMut.isPending}
                  className="px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {renewListingMut.isPending ? 'Renewing...' : `Renew · ${RENEW_LISTING_COST} credit${RENEW_LISTING_COST === 1 ? '' : 's'}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verify modal */}
      {showVerifyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-modal-title"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              className="absolute right-4 top-4 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
              aria-label="Close"
            >
              <HiOutlineXMark className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <HiOutlineShieldCheck className="h-6 w-6" />
              </div>
              <h2 id="verify-modal-title" className="text-xl font-bold text-gray-900">Get Verified</h2>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Verification adds a blue badge to your seller profile and increases buyer trust.
              It costs <span className="font-semibold text-gray-900">{VERIFICATION_COST} credits</span>.
            </p>
            <div className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm flex justify-between">
              <span className="text-gray-600">Your balance</span>
              <span className="font-semibold text-gray-900">{balance} credits</span>
            </div>
            {insufficientForVerification && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                <HiOutlineWallet className="h-5 w-5 mt-0.5 shrink-0" />
                <span>
                  You need {VERIFICATION_COST - balance} more credit{VERIFICATION_COST - balance === 1 ? '' : 's'}. Buy more in the Wallet tab.
                </span>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerify}
                disabled={insufficientForVerification || verifyProfileMut.isPending}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {verifyProfileMut.isPending ? 'Verifying...' : `Confirm — ${VERIFICATION_COST} credits`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
