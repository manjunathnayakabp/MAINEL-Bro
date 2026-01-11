import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 1. Create a Custom Bus Icon (Red Dot)
const busIcon = new L.DivIcon({
  className: 'custom-icon',
  html: '<div style="background-color:red; width:20px; height:20px; border-radius:50%; border:2px solid white;"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10] // Center of the icon
});

// Helper component to pan the map automatically
const MapUpdater = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, map.getZoom());
  }, [position, map]);
  return null;
};

const LiveTracking = () => {
  const [position, setPosition] = useState([12.9172, 77.6228]); // Default: Silk Board
  const [status, setStatus] = useState('Disconnected');

  useEffect(() => {
    // 2. Connect to WebSocket
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/tracking');

    ws.onopen = () => {
      setStatus('Connected 🟢');
      console.log('Connected to Tracking Server');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // --- 🔍 DEBUG LOGGING (Check your Console) ---
        console.log("📡 Incoming Data:", data); 

        // --- ✅ SAFETY CHECK ---
        // Only update if lat/lon actually exist
        if (data.lat !== undefined && data.lon !== undefined) {
          setPosition([data.lat, data.lon]);
        } else {
          console.warn("⚠️ Received data without lat/lon:", data);
        }

      } catch (err) {
        console.error("❌ Error parsing WebSocket message:", err);
      }
    };

    ws.onclose = () => setStatus('Disconnected 🔴');

    return () => ws.close();
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '15px', background: '#2c3e50', color: 'white', zIndex: 999 }}>
        <h2 style={{ margin: 0 }}>🚌 Open-Source Fleet Tracking</h2>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>Status: {status}</p>
      </div>

      {/* Map Container */}
      <MapContainer 
        center={position} 
        zoom={14} 
        style={{ flex: 1, width: '100%' }}
      >
        {/* FREE OpenStreetMap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* The Bus Marker */}
        <Marker position={position} icon={busIcon}>
          <Popup>
            <b>Bus KA-01-F-1234</b><br />
            Speed: 40 km/h
          </Popup>
        </Marker>

        {/* Auto-pan logic */}
        <MapUpdater position={position} />
      </MapContainer>
    </div>
  );
};

export default LiveTracking;