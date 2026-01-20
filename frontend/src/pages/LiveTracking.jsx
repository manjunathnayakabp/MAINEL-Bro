import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

/* ---------- Auto Pan Helper ---------- */
const MapUpdater = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    map.flyTo(position, map.getZoom(), { animate: true });
  }, [position, map]);

  return null;
};

const LiveTracking = () => {
  const [position, setPosition] = useState([12.9172, 77.6228]);
  const [busInfo, setBusInfo] = useState({
    status: 'Waiting...',
    color: 'green',
    speed: 0,
    traffic: 0
  });

  /* ---------- WebSocket ---------- */
  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/tracking');

    ws.onopen = () => {
      setBusInfo((prev) => ({ ...prev, status: 'Live 🟢' }));
      console.log('🟢 WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Safety check for coordinates
        if (data.lat !== undefined && data.lon !== undefined) {
          setPosition([data.lat, data.lon]);
        }

        // Update bus info state
        setBusInfo((prev) => ({
          ...prev,
          status: data.status_text || 'Live',
          color: data.color || prev.color, // Expecting 'green', 'orange', or 'red'
          speed: data.speed ?? prev.speed,
          traffic: data.traffic_level ?? prev.traffic
        }));

      } catch (err) {
        console.error('❌ Invalid WebSocket message', err);
      }
    };

    ws.onclose = () => {
      setBusInfo((prev) => ({ ...prev, status: 'Disconnected 🔴' }));
      console.warn('🔴 WebSocket disconnected');
    };

    return () => ws.close();
  }, []);

  /* ---------- Dynamic Icon ---------- */
  // We recreate the icon whenever busInfo.color changes
  const busIcon = useMemo(() => (
    new L.DivIcon({
      className: 'custom-icon',
      html: `
        <div style="
          background:${busInfo.color};
          width:24px;
          height:24px;
          border-radius:50%;
          border:3px solid white;
          box-shadow:0 0 8px rgba(0,0,0,0.5);
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })
  ), [busInfo.color]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div
        style={{
          padding: '15px',
          background: '#2c3e50',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>🚌 Smart Transit Monitor</h2>
          <small>Live ID: KA-01-F-1234</small>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: busInfo.color === 'red' ? '#ff6b6b' : 
                     busInfo.color === 'orange' ? '#fcc419' : '#51cf66'
            }}
          >
            {busInfo.status}
          </div>
          <small>
            Traffic: {busInfo.traffic}% | Speed: {busInfo.speed} km/h
          </small>
        </div>
      </div>

      {/* Map */}
      <MapContainer center={position} zoom={14} style={{ flex: 1 }}>
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* CRITICAL FIX: 
            Added key={busInfo.color} 
            This forces React to destroy and recreate the Marker when color changes.
        */}
        <Marker 
            position={position} 
            icon={busIcon} 
            key={busInfo.color} 
        >
          <Popup>
            <b>Bus KA-01-F-1234</b><br />
            Status: {busInfo.status}<br />
            Speed: {busInfo.speed} km/h<br />
            Traffic: {busInfo.traffic}%
          </Popup>
        </Marker>

        <MapUpdater position={position} />
      </MapContainer>
    </div>
  );
};

export default LiveTracking;