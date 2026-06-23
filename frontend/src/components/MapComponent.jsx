import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

L.Marker.prototype.options.icon = defaultIcon;

const DEFAULT_CENTER = [30.3753, 69.3451]; // Pakistan
const DEFAULT_ZOOM = 5;

export default function MapComponent({ latitude, longitude, title, properties = [], className = '' }) {
  if (properties.length > 0) {
    const validProperties = properties.filter(p => p.latitude && p.longitude);

    const centerLat = validProperties.length > 0
      ? validProperties.reduce((s, p) => s + p.latitude, 0) / validProperties.length
      : DEFAULT_CENTER[0];
    const centerLng = validProperties.length > 0
      ? validProperties.reduce((s, p) => s + p.longitude, 0) / validProperties.length
      : DEFAULT_CENTER[1];
    const zoom = validProperties.length > 0 ? 11 : DEFAULT_ZOOM;

    return (
      <MapContainer center={[centerLat, centerLng]} zoom={zoom} className={`h-full min-h-[20rem] w-full rounded-xl ${className}`}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validProperties.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]}>
            <Popup>
              <strong>{p.title}</strong>
              <br />PKR {p.price.toLocaleString()}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    );
  }

  if (!latitude || !longitude) return null;

  return (
    <MapContainer center={[latitude, longitude]} zoom={14} className={`h-full min-h-[20rem] w-full rounded-xl ${className}`}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]}>
        <Popup>{title || 'Property Location'}</Popup>
      </Marker>
    </MapContainer>
  );
}
