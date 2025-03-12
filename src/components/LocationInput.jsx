// LocationInput.jsx
import React from "react";

const LocationInput = ({ value, placeholder, onChange, suggestions, onSelect }) => {
  return (
    <div className="input-box">
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="location-input"
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
};

export default LocationInput;
