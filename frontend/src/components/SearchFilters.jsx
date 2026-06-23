import { useState } from 'react';
import { HiOutlineMagnifyingGlass, HiOutlineAdjustmentsHorizontal } from 'react-icons/hi2';

const PROPERTY_TYPES = ['HOUSE', 'APARTMENT', 'VILLA', 'DUPLEX', 'WAREHOUSE', 'INDUSTRIAL', 'RESORT', 'OTHER'];
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'FOR_SALE', label: 'For Sale' },
  { value: 'FOR_RENT', label: 'For Rent' },
];

export default function SearchFilters({ filters, onChange, compact = false }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search properties..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Location</label>
          <input
            type="text"
            placeholder="City or address"
            value={filters.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
          <select
            value={filters.type || ''}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {PROPERTY_TYPES.map(t => (
              <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div className="w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Min Price</label>
          <input
            type="number"
            placeholder="0"
            value={filters.minPrice || ''}
            onChange={(e) => handleChange('minPrice', e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="w-36">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Max Price</label>
          <input
            type="number"
            placeholder="Any"
            value={filters.maxPrice || ''}
            onChange={(e) => handleChange('maxPrice', e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <HiOutlineAdjustmentsHorizontal className="h-4 w-4" />
          {showAdvanced ? 'Less' : 'More'}
        </button>
      </div>

      {showAdvanced && (
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Min Bedrooms</label>
            <input
              type="number"
              placeholder="Any"
              value={filters.minBedrooms || ''}
              onChange={(e) => handleChange('minBedrooms', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Min Area (sqft)</label>
            <input
              type="number"
              placeholder="Any"
              value={filters.minArea || ''}
              onChange={(e) => handleChange('minArea', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Sort By</label>
            <select
              value={filters.sortBy || 'createdAt'}
              onChange={(e) => handleChange('sortBy', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="createdAt">Newest</option>
              <option value="price">Price</option>
              <option value="area">Area</option>
              <option value="bedrooms">Bedrooms</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Order</label>
            <select
              value={filters.order || 'desc'}
              onChange={(e) => handleChange('order', e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">High to Low</option>
              <option value="asc">Low to High</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Search</label>
            <div className="relative">
              <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Title or address..."
                value={filters.search || ''}
                onChange={(e) => handleChange('search', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
