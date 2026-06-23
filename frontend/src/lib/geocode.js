// Lightweight geocoding helper using OpenStreetMap's Nominatim service.
// Free, no API key required. Subject to ~1 req/sec usage policy, so callers
// should debounce. Returns null when nothing matches the query.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress(query, { signal } = {}) {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 3) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: 'json',
    limit: '1',
    addressdetails: '0',
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const top = data[0];
  return {
    lat: parseFloat(top.lat),
    lng: parseFloat(top.lon),
    displayName: top.display_name,
  };
}
