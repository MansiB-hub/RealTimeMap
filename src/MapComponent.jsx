import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./MapComponent.css";
import { debounce } from "lodash";

const customIcon = L.icon({
  iconUrl: "https://leafletjs.com/examples/custom-icons/leaf-red.png",
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

  const defaultCenter = [20, 78]; // India

  const fetchSuggestions = debounce(async (query, setSuggestions) => {
    if (!query.trim()) return setSuggestions([]);
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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("❌ Geolocation is not supported by your browser.");
      return;
    }
  
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        console.log(`📍 Current Location: ${lat}, ${lon}`);
  
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          );
          const data = await response.json();
  
          if (data?.display_name) {
            setFromInput(data.display_name);
            setFromLocation([lat, lon]);
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
        switch (error.code) {
          case error.PERMISSION_DENIED:
            alert("❌ Location access denied. Please enable location permissions in your browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            alert("⚠️ Location information is unavailable.");
            break;
          case error.TIMEOUT:
            alert("⏳ The request to get your location timed out. Please try again.");
            break;
          default:
            alert("❌ An unknown error occurred while fetching your location.");
        }
      }
    );
  };
  const getRoute = async () => {
    if (!fromLocation || !toLocation) {
      setErrorMessage("🚨 No locations selected for routing");
      return;
    }

    setIsLoading(true);
    try {
      const apiUrl = `https://router.project-osrm.org/route/v1/driving/${fromLocation[1]},${fromLocation[0]};${toLocation[1]},${toLocation[0]}?overview=full&geometries=geojson`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      if (data.routes?.length > 0) {
        const newRoute = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRoute(newRoute);
      } else {
        setErrorMessage("⚠️ No route found");
      }
    } catch (error) {
      setErrorMessage("❌ Error fetching route");
    } finally {
      setIsLoading(false);
    }
  };

  const switchLocations = () => {
    if (!fromLocation || !toLocation) return;
    setFromLocation(toLocation);
    setToLocation(fromLocation);
    setFromInput(toInput);
    setToInput(fromInput);
  };

  useEffect(() => {
    if (fromLocation && toLocation) getRoute();
  }, [fromLocation, toLocation]);

  return (
    <div className="container">
      <h1>Real-Time Location Map</h1>
      <div className="input-container">
        <LocationInput
          value={fromInput}
          placeholder="Enter Initial Location"
          onChange={(e) => {
            setFromInput(e.target.value);
            fetchSuggestions(e.target.value, setFromSuggestions);
          }}
          suggestions={fromSuggestions}
          onSelect={(place) => selectLocation(place, setFromLocation, setFromInput, setFromSuggestions)}
        />
        <button className="green" onClick={getCurrentLocation}>Get Current Location</button>
        <button className="dark" onClick={switchLocations}>Switch</button>
        <LocationInput
          value={toInput}
          placeholder="Enter Destination Location"
          onChange={(e) => {
            setToInput(e.target.value);
            fetchSuggestions(e.target.value, setToSuggestions);
          }}
          suggestions={toSuggestions}
          onSelect={(place) => selectLocation(place, setToLocation, setToInput, setToSuggestions)}
        />
      </div>
      {errorMessage && <div className="error">{errorMessage}</div>}
      {isLoading && <div className="loading">Loading...</div>}
      <div className="map-container">
        <MapContainer center={fromLocation || defaultCenter} zoom={6} style={{ height: "500px", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {fromLocation && <Marker position={fromLocation} icon={customIcon} />}
          {toLocation && <Marker position={toLocation} icon={customIcon} />}
          {route.length > 0 && <Polyline key={JSON.stringify(route)} positions={route} color="blue" weight={5} />}
        </MapContainer>
      </div>
    </div>
  );
};

const LocationInput = ({ value, placeholder, onChange, suggestions, onSelect }) => (
  <div className="input-box">
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      aria-label={placeholder}
    />
    {suggestions.length > 0 && (
      <ul className="suggestions">
        {suggestions.map((place, index) => (
          <li key={index} onClick={() => onSelect(place)}>
            {place.display_name}
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default MapComponent;