import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { debounce } from "lodash";
import "./MapComponent.css";
import LocationInput from "./components/LocationInput";

const { BaseLayer } = LayersControl;

// Custom marker icons (blue for initial, red for destination)
const initialLocationIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const destinationIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const MapComponent = () => {
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [route, setRoute] = useState([]);
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);

  const defaultCenter = [20, 78]; // Center of India

  // Debounced fetch for location suggestions
  const fetchSuggestions = debounce(async (query, setSuggestions) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`
      );
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    }
  }, 300);

  const selectLocation = (place, setLocation, setInput, setSuggestions) => {
    setLocation([parseFloat(place.lat), parseFloat(place.lon)]);
    setInput(place.display_name);
    setSuggestions([]);
  };

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("❌ Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        console.log(`📍 Current Location: ${latitude}, ${longitude}`);

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await response.json();

          if (data?.display_name) {
            setFromInput(data.display_name);
            setFromLocation([latitude, longitude]);
          } else {
            console.error("❌ Reverse Geocoding failed");
            alert("Unable to fetch location details. Please try again.");
          }
        } catch (error) {
          console.error("⚠️ Error fetching location:", error);
          alert("An error occurred while fetching location details.");
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("❌ Unable to fetch location. Please enable location access.");
      }
    );
  }, []);

  // Fetch route
  const getRoute = useCallback(async () => {
    if (!fromLocation || !toLocation) {
      setErrorMessage("🚨 No locations selected for routing");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");
    try {
      const apiUrl = `https://router.project-osrm.org/route/v1/driving/${fromLocation[1]},${fromLocation[0]};${toLocation[1]},${toLocation[0]}?overview=full&geometries=geojson`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.routes?.length > 0) {
        const routeData = data.routes[0];
        const newRoute = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoute(newRoute);

        // Distance (meters -> km)
        const distanceKm = (routeData.distance / 1000).toFixed(2);
        setRouteDistance(distanceKm);

        // Duration (seconds -> hr/min)
        const durationMin = Math.round(routeData.duration / 60);
        const hours = Math.floor(durationMin / 60);
        const minutes = durationMin % 60;
        setRouteDuration(hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`);
      } else {
        setErrorMessage("⚠️ No route found");
      }
    } catch (error) {
      setErrorMessage("❌ Error fetching route");
    } finally {
      setIsLoading(false);
    }
  }, [fromLocation, toLocation]);

  // Swap locations
  const switchLocations = () => {
    if (!fromLocation || !toLocation) return;
    setFromLocation(toLocation);
    setToLocation(fromLocation);
    setFromInput(toInput);
    setToInput(fromInput);
  };

  useEffect(() => {
    if (fromLocation && toLocation) {
      getRoute();
    }
  }, [fromLocation, toLocation, getRoute]);

  return (
    <div className="map-wrapper">
      <h1 className="map-title">Real-Time Location Map</h1>

      {/* Controls Section */}
      <div className="controls-container">
        <div className="input-group">
          {/* From Location Input */}
          <LocationInput
            value={fromInput}
            placeholder="Enter Initial Location"
            onChange={(e) => {
              setFromInput(e.target.value);
              fetchSuggestions(e.target.value, setFromSuggestions);
            }}
            suggestions={fromSuggestions}
            onSelect={(place) =>
              selectLocation(place, setFromLocation, setFromInput, setFromSuggestions)
            }
          />

          {/* Current Location & Switch Buttons */}
          <div className="button-group">
            <button className="btn green" onClick={getCurrentLocation}>
              Get Current Location
            </button>
            <button className="btn dark" onClick={switchLocations}>
              Switch
            </button>
          </div>

          {/* To Location Input */}
          <LocationInput
            value={toInput}
            placeholder="Enter Destination Location"
            onChange={(e) => {
              setToInput(e.target.value);
              fetchSuggestions(e.target.value, setToSuggestions);
            }}
            suggestions={toSuggestions}
            onSelect={(place) =>
              selectLocation(place, setToLocation, setToInput, setToSuggestions)
            }
          />
        </div>

        {/* Error or Loading */}
        {errorMessage && <div className="error-msg">{errorMessage}</div>}
        {isLoading && <div className="loading-msg">Loading...</div>}
      </div>

      {/* Map Container */}
      <div className="map-container">
        <MapContainer center={fromLocation || defaultCenter} zoom={6} style={{ height: "100%", width: "100%" }}>
          <LayersControl position="topright">
            <BaseLayer checked name="OpenStreetMap">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </BaseLayer>
            <BaseLayer name="Google Satellite">
              <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
            </BaseLayer>
            <BaseLayer name="Google Terrain">
              <TileLayer url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}" />
            </BaseLayer>
            <BaseLayer name="Google Hybrid">
              <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
            </BaseLayer>
          </LayersControl>

          {/* From Marker (Blue) */}
          {fromLocation && (
            <Marker position={fromLocation} icon={initialLocationIcon}></Marker>
          )}

          {/* To Marker (Red) */}
          {toLocation && (
            <Marker position={toLocation} icon={destinationIcon}></Marker>
          )}

          {/* Route Polyline */}
          {route.length > 0 && (
            <Polyline positions={route} color="blue" weight={5} />
          )}
        </MapContainer>
      </div>

      {/* Route Info */}
      {routeDistance && routeDuration && (
        <div className="route-info">
          <p><span>Distance:</span> <strong>{routeDistance} km</strong></p>
          <p><span>Estimated Time:</span> <strong>{routeDuration}</strong></p>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
