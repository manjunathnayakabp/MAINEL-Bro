import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const LiveTracking = () => {
  // Store multiple buses: { "KA-01-F-1001": { lat:..., lon:..., ... }, ... }
  const [buses, setBuses] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Disconnected 🔴');

  /* ---------- WebSocket Connection ---------- */
  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/tracking');

    ws.onopen = () => {
      setConnectionStatus('Live 🟢');
      console.log('🟢 WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Safety check: Ensure valid data
        if (data.bus_id && data.lat && data.lon) {
          setBuses((prevBuses) => ({
            ...prevBuses,
            [data.bus_id]: data, // Update or Add this specific bus
          }));
        }
      } catch (err) {
        console.error('❌ Invalid WebSocket message', err);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('Disconnected 🔴');
      console.warn('🔴 WebSocket disconnected');
    };

    return () => ws.close();
  }, []);

  /* ---------- Icon Generator ---------- */
  // Function to create a custom icon based on the bus's specific color
  const createBusIcon = (color) =>
    new L.DivIcon({
      className: 'custom-icon',
      html: `
        <div style="
          background: ${color || 'gray'};
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 8px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        ">🚌</div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* --- Dashboard Header --- */}
      <div
        style={{
          padding: '15px',
          background: '#2c3e50',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>🚌 Fleet Command Center</h2>
          <small>Real-time Monitoring System</small>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4CAF50' }}>
            {connectionStatus}
          </div>
          <small>Active Buses: {Object.keys(buses).length}</small>
        </div>
      </div>

      {/* --- The Map --- */}
      <MapContainer 
        center={[12.95, 77.60]} // Center of Bangalore (Roughly)
        zoom={12} 
        style={{ flex: 1 }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render a Marker for EVERY bus in the state */}
        {Object.values(buses).map((bus) => (
          <Marker
            key={bus.bus_id}
            position={[bus.lat, bus.lon]}
            icon={createBusIcon(bus.color)}
          >
            <Popup>
              <div style={{ minWidth: '150px' }}>
                <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>{bus.bus_id}</h3>
                <hr style={{ margin: '5px 0', border: '0.5px solid #eee' }} />
                <b>Route:</b> {bus.route_id}<br />
                <b>Status:</b> <span style={{ color: bus.color }}>{bus.status_text}</span><br />
                <b>Speed:</b> {bus.speed?.toFixed(1)} km/h<br />
                <b>Traffic:</b> {bus.traffic_level}%<br />
                <b>Passengers:</b> {bus.passenger_count}/{bus.capacity}
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
};

export default LiveTracking;