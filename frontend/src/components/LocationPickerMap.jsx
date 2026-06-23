import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

const DEFAULT_CENTER = [31.52, 74.35];
const DEFAULT_ZOOM = 6;
const SELECTED_ZOOM = 14;

function ClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterMap({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], SELECTED_ZOOM);
    }
  }, [lat, lng, map]);
  return null;
}

export default function LocationPickerMap({ latitude, longitude, onLocationSelect }) {
  const hasSelection = latitude && longitude;
  const center = hasSelection ? [parseFloat(latitude), parseFloat(longitude)] : DEFAULT_CENTER;
  const zoom = hasSelection ? SELECTED_ZOOM : DEFAULT_ZOOM;

  return (
    <div>
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-72 w-full rounded-xl border border-gray-200 cursor-crosshair"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onLocationSelect={onLocationSelect} />
        <RecenterMap lat={hasSelection ? parseFloat(latitude) : null} lng={hasSelection ? parseFloat(longitude) : null} />
        {hasSelection && (
          <Marker position={[parseFloat(latitude), parseFloat(longitude)]} />
        )}
      </MapContainer>
      {hasSelection && (
        <p className="text-xs text-gray-500 mt-1.5">
          Selected: {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}
        </p>
      )}
    </div>
  );
}
