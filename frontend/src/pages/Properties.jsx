import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProperties } from '../hooks/useProperties';
import { useAuth } from '../context/AuthContext';
import {
  useLikeProperty,
  useUnlikeProperty,
  useSaveProperty,
  useUnsaveProperty,
  useUserInteractions,
  useSavedProperties,
} from '../hooks/useInteractions';
import PropertyCard from '../components/PropertyCard';
import SearchFilters from '../components/SearchFilters';
import MapComponent from '../components/MapComponent';

export default function Properties() {
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const isBuyer = profile?.role === 'BUYER';

  const [filters, setFilters] = useState({
    city: searchParams.get('city') || '',
    type: searchParams.get('type') || '',
    status: searchParams.get('status') || '',
    minPrice: '',
    maxPrice: '',
    minBedrooms: '',
    minArea: '',
    sortBy: 'createdAt',
    order: 'desc',
    search: '',
    page: 1,
  });

  const [showMap, setShowMap] = useState(false);

  const { data, isLoading, error } = useProperties(filters);
  const likeProperty = useLikeProperty();
  const unlikeProperty = useUnlikeProperty();
  const saveProperty = useSaveProperty();
  const unsaveProperty = useUnsaveProperty();

  const { data: likedData } = useUserInteractions(user ? 'LIKE' : null);
  const { data: savedData } = useSavedProperties();

  const likedIds = new Set((likedData || []).map(i => i.propertyId));
  const savedIds = new Set((savedData || []).map(p => p.id));

  const handleLike = (propertyId) => {
    if (!user) {
      toast.error('Please log in to like properties');
      return;
    }
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
    if (!user) {
      toast.error('Please log in to save properties');
      return;
    }
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Properties</h1>
        <p className="text-gray-500">Find your perfect property using our advanced filters</p>
      </div>

      <SearchFilters filters={filters} onChange={setFilters} />

      <div className="flex items-center justify-between mt-6 mb-4">
        <p className="text-sm text-gray-500">
          {data?.pagination?.total ?? 0} properties found
        </p>
        <button
          onClick={() => setShowMap(!showMap)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showMap ? 'Hide Map' : 'Show Map'}
        </button>
      </div>

      {showMap && data?.properties && (
        <div className="mb-6">
          <MapComponent properties={data.properties} />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <p className="text-red-500">{error.message}</p>
        </div>
      ) : data?.properties?.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.properties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                showActions={!!user && isBuyer}
                isLiked={likedIds.has(property.id)}
                isSaved={savedIds.has(property.id)}
                onLike={handleLike}
                onSave={handleSave}
              />
            ))}
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setFilters(f => ({ ...f, page }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    page === filters.page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No properties found matching your criteria.</p>
          <p className="text-sm mt-2">Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}
