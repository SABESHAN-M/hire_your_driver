import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin } from 'lucide-react';
import { useAlert } from '../context/AlertContext';
import { useTheme } from '../context/ThemeContext';
import './LocationMap.css';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
const MapEvents = ({ setDestination, fetchAddress }) => {
  useMapEvents({
    click(e) {
      setDestination(e.latlng);
      fetchAddress(e.latlng.lat, e.latlng.lng, 'destination');
    },
  });
  return null;
};

// Component to auto-center map when location changes
const AutoCenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, 13, { animate: true });
    }
  }, [position, map]);
  return null;
};

const LocationMap = ({ onLocationsUpdate, externalPickup, externalDest }) => {
  const { showAlert } = useAlert();
  const { theme } = useTheme();
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (externalPickup) setPickup(externalPickup);
  }, [externalPickup]);

  useEffect(() => {
    if (externalDest) setDestination(externalDest);
  }, [externalDest]);

  // Default center (e.g., New York, or somewhere generic)
  const defaultCenter = [40.7128, -74.0060];

  const fetchAddress = async (lat, lon, type) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data && data.display_name) {
        // Simplified address
        const addressParts = data.display_name.split(', ');
        const simpleAddress = addressParts.slice(0, 3).join(', ');
        onLocationsUpdate(type, simpleAddress, { lat, lng: lon });
      } else {
        onLocationsUpdate(type, "Location", { lat, lng: lon });
      }
    } catch (error) {
      console.error("Geocoding error", error);
      onLocationsUpdate(type, "Location", { lat, lng: lon });
    }
  };

  const handleAutoLocate = () => {
    setLoading(true);
    if (!navigator.geolocation) {
      showAlert("Geolocation is not supported by your browser", "error");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const latlng = { lat: latitude, lng: longitude };
        setPickup(latlng);
        fetchAddress(latitude, longitude, 'pickup');
        setLoading(false);
        showAlert("Location found!", "success");
      },
      (error) => {
        setLoading(false);
        showAlert("Could not get your location. Please check browser permissions.", "error");
      }
    );
  };

  const mapUrl = "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";

  return (
    <div className="map-wrapper">
      
      {/* Auto Locate Button over the map */}
      <button 
        type="button"
        onClick={handleAutoLocate}
        disabled={loading}
        className="map-overlay-btn"
      >
        <Navigation size={18} className={loading ? 'spinning' : ''} />
        {loading ? 'Locating...' : 'Detect My Location'}
      </button>

      {/* Map Hint */}
      <div className="map-hint-overlay">
        Click anywhere on the map to set Destination
      </div>

      <MapContainer center={defaultCenter} zoom={13} className="leaflet-map-container">
        <TileLayer
          attribution='&copy; Google Maps'
          url={mapUrl}
          className={theme === 'dark' ? 'dark-map-tiles' : ''}
        />
        
        {/* Components that hook into Map context */}
        <MapEvents setDestination={setDestination} fetchAddress={fetchAddress} />
        <AutoCenter position={pickup} />

        {pickup && (
          <Marker position={pickup} icon={pickupIcon}>
            <Popup>Pickup Location</Popup>
          </Marker>
        )}
        
        {destination && (
          <Marker position={destination} icon={destIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default LocationMap;
