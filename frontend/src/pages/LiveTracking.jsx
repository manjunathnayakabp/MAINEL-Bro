import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const LiveTracking = () => {
  const [buses, setBuses] = useState({});
  const [connectionStatus, setConnectionStatus] = useState('Disconnected 🔴');

  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/tracking');

    ws.onopen = () => setConnectionStatus('Live 🟢');

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.bus_id && data.lat && data.lon) {
          setBuses(prev => ({ ...prev, [data.bus_id]: data }));
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => ws.close();
  }, []);

  // =====================================================
  // Occupancy Inference Logic
  // =====================================================
  const getOccupancyInfo = (pax, cap) => {
    const ratio = pax / cap;

    if (ratio <= 0.6) {
      return { text: 'Seats Available', color: '#2ecc71' }; // Green
    } else if (ratio <= 0.85) {
      return { text: 'Standing Space', color: '#f1c40f' }; // Yellow
    } else {
      return { text: 'Heavily Crowded', color: '#e74c3c' }; // Red
    }
  };

  const createBusIcon = (color) =>
    new L.DivIcon({
      className: 'custom-icon',
      html: `
        <div style="
          background:${color || 'gray'};
          width:24px;
          height:24px;
          border-radius:50%;
          border:2px solid white;
          box-shadow:0 0 6px rgba(0,0,0,0.5);
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:11px;
        ">🚌</div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header */}
      <div style={{
        padding: '15px',
        background: '#2c3e50',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <h3>🚌 Live Fleet Map</h3>
        <div>{connectionStatus} | Active: {Object.keys(buses).length}</div>
      </div>

      <MapContainer center={[12.95, 77.60]} zoom={12} style={{ flex: 1 }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {Object.values(buses).map((bus) => {
          const occ = getOccupancyInfo(bus.passenger_count, bus.capacity);

          return (
            <Marker
              key={bus.bus_id}
              position={[bus.lat, bus.lon]}
              icon={createBusIcon(bus.color)}
            >
              {/* ================= HOVER TOOLTIP ================= */}
              <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                <div style={{
                  minWidth: '180px',
                  padding: '6px',
                  borderLeft: `6px solid ${occ.color}`
                }}>
                  <h4 style={{ margin: '0 0 6px 0' }}>{bus.bus_id}</h4>

                  <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                    <b>Route:</b> {bus.route_id}<br/>
                    <b>Status:</b>{' '}
                    <span style={{ color: bus.color, fontWeight: 'bold' }}>
                      {bus.status_text}
                    </span><br/>
                    <b>Speed:</b> {bus.speed?.toFixed(1)} km/h<br/>
                    <b>Traffic:</b> {bus.traffic_level}%<br/>

                    <div style={{ marginTop: '6px' }}>
                      <b>Occupancy:</b>{' '}
                      <span style={{ color: occ.color, fontWeight: 'bold' }}>
                        {occ.text}
                      </span>
                    </div>

                    {/* Occupancy Bar */}
                    <div style={{
                      width: '100%',
                      background: '#ddd',
                      height: '8px',
                      borderRadius: '4px',
                      marginTop: '4px'
                    }}>
                      <div style={{
                        width: `${Math.min((bus.passenger_count / bus.capacity) * 100, 100)}%`,
                        background: occ.color,
                        height: '100%',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }} />
                    </div>

                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      👥 {bus.passenger_count}/{bus.capacity}
                    </div>
                  </div>
                </div>
              </Tooltip>

              {/* ================= CLICK POPUP ================= */}
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <h3>Bus {bus.bus_id}</h3>
                  <p>Route {bus.route_id}</p>
                  <p style={{ color: occ.color, fontWeight: 'bold' }}>
                    {occ.text}
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default LiveTracking;
