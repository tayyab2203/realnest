import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  HiOutlineBuildingOffice2,
  HiOutlineUserGroup,
  HiOutlineUserPlus,
  HiOutlineTrash,
  HiOutlinePencilSquare,
  HiOutlineHome,
  HiOutlinePhoto,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineMapPin,
  HiOutlineCheckCircle,
  HiOutlineXMark,
  HiOutlineChartBar,
  HiOutlineEye,
  HiOutlineBookmark,
  HiOutlineCurrencyDollar,
  HiOutlineFire,
  HiOutlineRocketLaunch,
  HiOutlineFunnel,
  HiOutlineArrowDownTray,
  HiOutlineArrowUpTray,
} from 'react-icons/hi2';
import { useAuth } from '../context/AuthContext';
import {
  useAgencyProfile,
  useUpdateAgencyProfile,
  useAgents,
  useAddAgent,
  useUpdateAgent,
  useRemoveAgent,
  useBulkUpdateListings,
  useBulkDeleteListings,
} from '../hooks/useAgency';
import { useMyProperties } from '../hooks/useProperties';
import { useMySubscription } from '../hooks/useSubscription';
import { useSellerAnalytics } from '../hooks/useAnalytics';
import VerifiedBadge from '../components/dashboard/VerifiedBadge';
import api from '../lib/api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: HiOutlineChartBar },
  { id: 'agents', label: 'Agents', icon: HiOutlineUserGroup },
  { id: 'listings', label: 'Bulk Listings', icon: HiOutlineHome },
  { id: 'profile', label: 'Company Profile', icon: HiOutlineBuildingOffice2 },
];

const STATUS_OPTIONS = [
  { value: 'FOR_SALE', label: 'For Sale' },
  { value: 'FOR_RENT', label: 'For Rent' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'PAUSED', label: 'Paused' },
];

const emptyAgentForm = { name: '', email: '', phone: '', role: 'Agent', image: '' };

const StatCard = ({ icon, label, value, accent = 'blue' }) => {
  const Icon = icon;
  const color = {
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }[accent];
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const formatCurrency = (n) => `PKR ${Number(n || 0).toLocaleString()}`;

export default function AgencyDashboard() {
  const { profile } = useAuth();
  const { data: subscription } = useMySubscription();
  const { data: agencyProfile, isLoading: profileLoading } = useAgencyProfile();
  const { data: agents = [], isLoading: agentsLoading } = useAgents();
  const { data: listings = [], isLoading: listingsLoading } = useMyProperties();
  const { data: analytics, isLoading: analyticsLoading } = useSellerAnalytics();

  const updateProfile = useUpdateAgencyProfile();
  const addAgent = useAddAgent();
  const updateAgent = useUpdateAgent();
  const removeAgent = useRemoveAgent();
  const bulkUpdate = useBulkUpdateListings();
  const bulkDelete = useBulkDeleteListings();

  const [tab, setTab] = useState('overview');

  // --- Agent form state ---
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [editingAgentId, setEditingAgentId] = useState(null);
  const [showAgentForm, setShowAgentForm] = useState(false);

  // --- Profile form state ---
  const [profileForm, setProfileForm] = useState({
    companyName: '',
    companyLogo: '',
    companyDescription: '',
    officeAddress: '',
  });
  const [logoUploading, setLogoUploading] = useState(false);
  const [agentImageUploading, setAgentImageUploading] = useState(false);

  useEffect(() => {
    if (agencyProfile) {
      setProfileForm({
        companyName: agencyProfile.companyName || '',
        companyLogo: agencyProfile.companyLogo || '',
        companyDescription: agencyProfile.companyDescription || '',
        officeAddress: agencyProfile.officeAddress || '',
      });
    }
  }, [agencyProfile]);

  // --- Bulk listings state ---
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredListings = useMemo(() => {
    return (listings || []).filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (
        searchQuery &&
        !`${p.title} ${p.city}`.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [listings, statusFilter, searchQuery]);

  const allFilteredSelected =
    filteredListings.length > 0 &&
    filteredListings.every((p) => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredListings.forEach((p) => next.delete(p.id));
      } else {
        filteredListings.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one listing first');
      return;
    }
    try {
      const res = await bulkUpdate.mutateAsync({
        propertyIds: Array.from(selectedIds),
        status,
      });
      toast.success(res.message || 'Listings updated');
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.message || 'Failed to update listings');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one listing first');
      return;
    }
    if (!window.confirm(`Delete ${selectedIds.size} listing(s)? This cannot be undone.`)) return;
    try {
      const res = await bulkDelete.mutateAsync(Array.from(selectedIds));
      toast.success(res.message || 'Listings deleted');
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(err.message || 'Failed to delete listings');
    }
  };

  // --- Agent form handlers ---
  const resetAgentForm = () => {
    setAgentForm(emptyAgentForm);
    setEditingAgentId(null);
    setShowAgentForm(false);
  };

  const handleAgentImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    setAgentImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('images', file);
      const { data } = await api.post('/upload/images', formData);
      const url = data.urls?.[0];
      if (url) setAgentForm((f) => ({ ...f, image: url }));
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setAgentImageUploading(false);
      e.target.value = '';
    }
  };

  const handleAgentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAgentId) {
        await updateAgent.mutateAsync({ id: editingAgentId, ...agentForm });
        toast.success('Agent updated');
      } else {
        await addAgent.mutateAsync(agentForm);
        toast.success('Agent added');
      }
      resetAgentForm();
    } catch (err) {
      toast.error(err.message || 'Failed to save agent');
    }
  };

  const handleEditAgent = (agent) => {
    setEditingAgentId(agent.id);
    setAgentForm({
      name: agent.name,
      email: agent.email,
      phone: agent.phone || '',
      role: agent.role,
      image: agent.image || '',
    });
    setShowAgentForm(true);
  };

  const handleRemoveAgent = async (id, name) => {
    if (!window.confirm(`Remove ${name} from your agency?`)) return;
    try {
      await removeAgent.mutateAsync(id);
      toast.success('Agent removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove agent');
    }
  };

  // --- Profile handlers ---
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be an image under 5MB');
      return;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('images', file);
      const { data } = await api.post('/upload/images', formData);
      const url = data.urls?.[0];
      if (url) setProfileForm((f) => ({ ...f, companyLogo: url }));
    } catch (err) {
      toast.error(err.message || 'Logo upload failed');
    } finally {
      setLogoUploading(false);
      e.target.value = '';
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync(profileForm);
      toast.success('Company profile updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    }
  };

  // --- Guard: must be on Agency plan ---
  if (subscription && subscription.plan !== 'AGENCY') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <HiOutlineBuildingOffice2 className="h-16 w-16 text-violet-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">Agency dashboard</h1>
        <p className="mt-2 text-gray-500">
          This dashboard is only available on the Agency / Enterprise plan.
        </p>
        <Link
          to="/subscription"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-violet-700 hover:to-fuchsia-700 transition-all"
        >
          <HiOutlineRocketLaunch className="h-4 w-4" />
          Upgrade to Agency
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {agencyProfile?.companyLogo ? (
            <img
              src={agencyProfile.companyLogo}
              alt={agencyProfile.companyName || 'Agency logo'}
              className="w-14 h-14 rounded-2xl object-cover border border-gray-200"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md">
              <HiOutlineBuildingOffice2 className="h-7 w-7" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {agencyProfile?.companyName || profile?.name || 'Your Agency'}
              </h1>
              <VerifiedBadge variant="agency" size="md" />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">Agency dashboard</p>
          </div>
        </div>
        <Link
          to="/dashboard/seller"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <HiOutlineHome className="h-4 w-4" /> Open Seller Dashboard
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap items-center gap-1 rounded-xl border border-gray-100 bg-white p-1 shadow-sm w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={HiOutlineHome}
              label="Active Listings"
              value={analytics?.summary.activeListings ?? '—'}
            />
            <StatCard
              icon={HiOutlineEye}
              label="Total Views"
              value={analytics?.summary.propertyViews ?? '—'}
              accent="violet"
            />
            <StatCard
              icon={HiOutlineUserGroup}
              label="Agents"
              value={agents.length}
              accent="emerald"
            />
            <StatCard
              icon={HiOutlineCurrencyDollar}
              label="Sales Revenue"
              value={formatCurrency(analytics?.summary.salesRevenue)}
              accent="amber"
            />
          </div>

          {analyticsLoading ? (
            <div className="rounded-2xl bg-gray-100 h-64 animate-pulse" />
          ) : analytics ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Top performing listings</h2>
                {analytics.topListings.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No listings yet — add a few to start tracking performance.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {analytics.topListings.map((p, i) => (
                      <li key={p.id} className="flex items-center gap-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.title}</p>
                          <p className="text-xs text-gray-500">{p.city}</p>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <p className="text-sm font-semibold text-gray-900 flex items-center justify-end gap-1">
                            <HiOutlineEye className="h-3.5 w-3.5" /> {p.views}
                          </p>
                          <p className="flex items-center justify-end gap-1">
                            <HiOutlineBookmark className="h-3 w-3" /> {p.saves}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-violet-50 to-fuchsia-50 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-2">Most viewed</h2>
                {analytics.mostViewed ? (
                  <div className="space-y-3">
                    {analytics.mostViewed.image && (
                      <img
                        src={analytics.mostViewed.image}
                        alt={analytics.mostViewed.title}
                        className="w-full h-32 rounded-xl object-cover"
                      />
                    )}
                    <p className="font-semibold text-gray-900">{analytics.mostViewed.title}</p>
                    <p className="text-sm text-gray-500">{analytics.mostViewed.city}</p>
                    <p className="text-2xl font-bold text-violet-700">
                      {analytics.mostViewed.views}{' '}
                      <span className="text-sm font-medium text-violet-600">views</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Not enough data yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Agents tab */}
      {tab === 'agents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Manage agents</h2>
              <p className="text-sm text-gray-500">
                Add and manage agents that work under your agency.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetAgentForm();
                setShowAgentForm((v) => !v);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-violet-700 hover:to-fuchsia-700 transition-all"
            >
              <HiOutlineUserPlus className="h-4 w-4" />
              {showAgentForm ? 'Cancel' : 'Add Agent'}
            </button>
          </div>

          {showAgentForm && (
            <form
              onSubmit={handleAgentSubmit}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingAgentId ? 'Edit agent' : 'New agent'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                  <input
                    required
                    type="text"
                    value={agentForm.name}
                    onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input
                    required
                    type="email"
                    value={agentForm.email}
                    onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={agentForm.phone}
                    onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                  <input
                    type="text"
                    value={agentForm.role}
                    onChange={(e) => setAgentForm({ ...agentForm, role: e.target.value })}
                    placeholder="Agent / Senior Agent / Manager"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Photo</label>
                  <div className="flex items-center gap-3">
                    {agentForm.image ? (
                      <img src={agentForm.image} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                        <HiOutlinePhoto className="h-6 w-6" />
                      </div>
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-600 hover:border-violet-400 hover:text-violet-600 cursor-pointer">
                      <HiOutlinePhoto className="h-4 w-4" />
                      {agentImageUploading ? 'Uploading...' : 'Upload photo'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAgentImageUpload}
                        className="hidden"
                      />
                    </label>
                    {agentForm.image && (
                      <button
                        type="button"
                        onClick={() => setAgentForm((f) => ({ ...f, image: '' }))}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={resetAgentForm}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addAgent.isPending || updateAgent.isPending}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg text-sm font-semibold hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
                >
                  {addAgent.isPending || updateAgent.isPending
                    ? 'Saving...'
                    : editingAgentId
                      ? 'Update Agent'
                      : 'Add Agent'}
                </button>
              </div>
            </form>
          )}

          {agentsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-2xl h-40 animate-pulse" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <HiOutlineUserGroup className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No agents added yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Add agents to your agency to organise your team
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {agent.image ? (
                      <img
                        src={agent.image}
                        alt={agent.name}
                        className="w-14 h-14 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-600 flex items-center justify-center text-lg font-bold">
                        {agent.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{agent.name}</p>
                      <p className="text-xs text-violet-600 font-medium">{agent.role}</p>
                      <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
                        <HiOutlineEnvelope className="h-3 w-3" /> {agent.email}
                      </p>
                      {agent.phone && (
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                          <HiOutlinePhone className="h-3 w-3" /> {agent.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleEditAgent(agent)}
                      className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
                      aria-label="Edit"
                    >
                      <HiOutlinePencilSquare className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAgent(agent.id, agent.name)}
                      className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      aria-label="Remove"
                    >
                      <HiOutlineTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk listings tab */}
      {tab === 'listings' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk listing management</h2>
            <p className="text-sm text-gray-500">
              Filter, multi-select and update many listings at once.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <HiOutlineFunnel className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by title or city"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="ALL">All statuses</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{selectedIds.size} selected</span>
                <select
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) handleBulkStatus(v);
                    e.target.value = '';
                  }}
                  disabled={selectedIds.size === 0 || bulkUpdate.isPending}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Set status...
                  </option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0 || bulkDelete.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  <HiOutlineTrash className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          </div>

          {listingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl h-20 animate-pulse" />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <HiOutlineHome className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No listings match your filters</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={toggleSelectAll}
                          className="rounded text-violet-600 focus:ring-violet-500"
                        />
                      </th>
                      <th className="text-left px-5 py-3 font-medium">Property</th>
                      <th className="text-left px-5 py-3 font-medium">City</th>
                      <th className="text-left px-5 py-3 font-medium">Price</th>
                      <th className="text-left px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredListings.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleOne(p.id)}
                            className="rounded text-violet-600 focus:ring-violet-500"
                          />
                        </td>
                        <td className="px-5 py-3 flex items-center gap-3">
                          {p.images?.[0] ? (
                            <img
                              src={p.images[0]}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100" />
                          )}
                          <span className="font-medium text-gray-900 line-clamp-1">{p.title}</span>
                        </td>
                        <td className="px-5 py-3 text-gray-600">{p.city}</td>
                        <td className="px-5 py-3 text-gray-900 font-medium">{formatCurrency(p.price)}</td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                              p.status === 'FOR_SALE'
                                ? 'bg-emerald-50 text-emerald-700'
                                : p.status === 'FOR_RENT'
                                  ? 'bg-blue-50 text-blue-700'
                                  : p.status === 'PAUSED'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {p.status.replace('_', ' ').toLowerCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profile tab */}
      {tab === 'profile' && (
        <form
          onSubmit={handleProfileSave}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5"
        >
          <div>
            <h2 className="text-xl font-bold text-gray-900">Company profile</h2>
            <p className="text-sm text-gray-500">
              Information shown on your public agency page and listings.
            </p>
          </div>

          {profileLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 rounded-lg h-12 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Company name</label>
                <input
                  type="text"
                  value={profileForm.companyName}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, companyName: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Logo</label>
                <div className="flex items-center gap-4">
                  {profileForm.companyLogo ? (
                    <img
                      src={profileForm.companyLogo}
                      alt="Logo"
                      className="w-16 h-16 rounded-2xl object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                      <HiOutlinePhoto className="h-6 w-6" />
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-600 hover:border-violet-400 hover:text-violet-600 cursor-pointer">
                    <HiOutlineArrowUpTray className="h-4 w-4" />
                    {logoUploading ? 'Uploading...' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {profileForm.companyLogo && (
                    <button
                      type="button"
                      onClick={() => setProfileForm((f) => ({ ...f, companyLogo: '' }))}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Company description
                </label>
                <textarea
                  rows={4}
                  value={profileForm.companyDescription}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, companyDescription: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Office address</label>
                <input
                  type="text"
                  value={profileForm.officeAddress}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, officeAddress: e.target.value })
                  }
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50"
                >
                  <HiOutlineCheckCircle className="h-4 w-4" />
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}
