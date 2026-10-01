import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, MapPin, Route as RouteIcon } from 'lucide-react';
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

// Custom Pickup Icon (Green)
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom Destination Icon (Red)
const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Calculate straight-line distance fallback
const getDistanceKmFallback = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
};

// Component to handle map clicks for setting pickup/drop
const MapEvents = ({ setPickup, setDestination, pickup, fetchAddress }) => {
  useMapEvents({
    click(e) {
      if (!pickup) {
        setPickup(e.latlng);
        fetchAddress(e.latlng.lat, e.latlng.lng, 'pickup');
      } else {
        setDestination(e.latlng);
        fetchAddress(e.latlng.lat, e.latlng.lng, 'destination');
      }
    },
  });
  return null;
};

// Component to auto fit map bounds to frame pickup, destination, and the road polyline
const FitRouteBounds = ({ pickup, destination, routePolyline }) => {
  const map = useMap();
  useEffect(() => {
    if (pickup && destination) {
      const bounds = L.latLngBounds([
        [pickup.lat, pickup.lng],
        [destination.lat, destination.lng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (pickup) {
      map.flyTo([pickup.lat, pickup.lng], 14, { animate: true });
    } else if (destination) {
      map.flyTo([destination.lat, destination.lng], 14, { animate: true });
    }
  }, [pickup, destination, routePolyline, map]);
  return null;
};

const LocationMap = ({ onLocationsUpdate, externalPickup, externalDest }) => {
  const { showAlert } = useAlert();
  const { theme } = useTheme();
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeDurationMins, setRouteDurationMins] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routingLoading, setRoutingLoading] = useState(false);

  useEffect(() => {
    if (externalPickup) setPickup(externalPickup);
  }, [externalPickup]);

  useEffect(() => {
    if (externalDest) setDestination(externalDest);
  }, [externalDest]);

  // Fetch Road Route from OSRM when both pickup and destination exist
  useEffect(() => {
    if (pickup && destination) {
      fetchRoadRoute(pickup, destination);
    } else {
      setRoutePolyline([]);
      setRouteDistanceKm(null);
      setRouteDurationMins(null);
    }
  }, [pickup, destination]);

  const fetchRoadRoute = async (start, end) => {
    setRoutingLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const distKm = route.distance / 1000;
        const durMins = Math.round(route.duration / 60);
        const leafletCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);

        setRoutePolyline(leafletCoords);
        setRouteDistanceKm(distKm);
        setRouteDurationMins(durMins);

        if (onLocationsUpdate) {
          onLocationsUpdate('route', null, null, distKm);
        }
      } else {
        // Fallback straight line
        const fallbackDist = getDistanceKmFallback(start.lat, start.lng, end.lat, end.lng);
        setRoutePolyline([[start.lat, start.lng], [end.lat, end.lng]]);
        setRouteDistanceKm(fallbackDist);
        if (onLocationsUpdate) {
          onLocationsUpdate('route', null, null, fallbackDist);
        }
      }
    } catch (err) {
      console.error('Road routing fetch failed:', err);
      const fallbackDist = getDistanceKmFallback(start.lat, start.lng, end.lat, end.lng);
      setRoutePolyline([[start.lat, start.lng], [end.lat, end.lng]]);
      setRouteDistanceKm(fallbackDist);
      if (onLocationsUpdate) {
        onLocationsUpdate('route', null, null, fallbackDist);
      }
    } finally {
      setRoutingLoading(false);
    }
  };

  const defaultCenter = [28.6139, 77.2090]; // Default New Delhi / generic map view

  const fetchAddress = async (lat, lon, type) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data && data.display_name) {
        const addressParts = data.display_name.split(', ');
        const simpleAddress = addressParts.slice(0, 3).join(', ');
        onLocationsUpdate(type, simpleAddress, { lat, lng: lon });
      } else {
        onLocationsUpdate(type, "Selected Location", { lat, lng: lon });
      }
    } catch (error) {
      console.error("Geocoding error", error);
      onLocationsUpdate(type, "Selected Location", { lat, lng: lon });
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
        showAlert("Pickup location detected!", "success");
      },
      (error) => {
        setLoading(false);
        showAlert("Could not detect location. Please check browser permissions.", "error");
      }
    );
  };

  const mapUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

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
        {loading ? 'Locating...' : 'Detect Pickup'}
      </button>

      {/* Road Route Info Badge overlay */}
      {routeDistanceKm !== null && (
        <div className="map-route-badge">
          <RouteIcon size={16} className="route-icon-pulse" />
          <span>Road Route: <strong>{routeDistanceKm.toFixed(1)} km</strong></span>
          {routeDurationMins && <span className="duration-tag"> (~{routeDurationMins} mins)</span>}
        </div>
      )}

      {/* Map Hint */}
      {!destination && (
        <div className="map-hint-overlay">
          {!pickup ? 'Click on map to set Pickup (A)' : 'Click on map to set Drop Location (B)'}
        </div>
      )}

      <MapContainer center={defaultCenter} zoom={12} className="leaflet-map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={mapUrl}
          className={theme === 'dark' ? 'dark-map-tiles' : ''}
        />
        
        <MapEvents setPickup={setPickup} setDestination={setDestination} pickup={pickup} fetchAddress={fetchAddress} />
        <FitRouteBounds pickup={pickup} destination={destination} routePolyline={routePolyline} />

        {pickup && (
          <Marker position={pickup} icon={pickupIcon}>
            <Popup>
              <strong>Pickup Location (A)</strong>
            </Popup>
          </Marker>
        )}
        
        {destination && (
          <Marker position={destination} icon={destIcon}>
            <Popup>
              <strong>Drop Location (B)</strong>
            </Popup>
          </Marker>
        )}

        {/* Draw Road Route Line on Map */}
        {routePolyline.length > 0 && (
          <Polyline 
            positions={routePolyline} 
            pathOptions={{ 
              color: '#3b82f6', 
              weight: 6, 
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round'
            }} 
          />
        )}
      </MapContainer>
    </div>
  );
};

export default LocationMap;
