import { useState } from "react";

export default function LocationFilter({ onFilterChange }) {
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState(50);

  const handleFilter = () => {
    // For now, just pass the address
    // Later we can geocode this to lat/lng
    onFilterChange({ address, radius });
  };

  return (
    <div style={{
      background: "white",
      padding: "1.5rem",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      marginBottom: "2rem"
    }}>
      <h3 style={{ marginBottom: "1rem", fontSize: "1.2rem", fontWeight: "600" }}>
        Filter by Location
      </h3>
      
      <div style={{ display: "flex", gap: "1rem", alignItems: "end" }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
            Location/City
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., Red Deer, AB"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "6px"
            }}
          />
        </div>

        <div style={{ width: "150px" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
            Radius (km)
          </label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            min="1"
            max="500"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "6px"
            }}
          />
        </div>

        <button
          onClick={handleFilter}
          style={{
            padding: "0.75rem 2rem",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "500"
          }}
        >
          Filter
        </button>
      </div>
    </div>
  );
}