import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AnalyticsCharts from '../components/AnalyticsCharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ total: 0, active: 0, routes: 0 });
  const [fleet, setFleet] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null); // 📊 NEW

  // ---------------------------------------------------
  // 1. Initial Stats + Analytics
  // ---------------------------------------------------
  useEffect(() => {
    // Mock stats (replace with /admin/fleet-stats later)
    setStats({ total: 5, active: 1, routes: 2 });

    // Fetch Analytics Data
    fetch('http://127.0.0.1:8000/admin/analytics?token=mock_token_for_demo')
      .then(res => res.json())
      .then(data => setAnalyticsData(data))
      .catch(err => console.error("Analytics Error:", err));
  }, []);

  // ---------------------------------------------------
  // 2. WebSocket Live Updates
  // ---------------------------------------------------
  useEffect(() => {
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/tracking');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Update Fleet Table
      setFleet(prev => ({
        ...prev,
        [data.bus_id]: {
          ...data,
          last_update: new Date().toLocaleTimeString()
        }
      }));

      // Update Alerts (keep last 5)
      if (data.alerts && data.alerts.length > 0) {
        setAlerts(prev => [...data.alerts, ...prev].slice(0, 5));
      }
    };

    return () => ws.close();
  }, []);

  const delayedCount = Object.values(fleet).filter(b => b.color === 'red').length;

  // ---------------------------------------------------
  // 3. HANDLE ADMIN ACTION (Allocate Spare Bus)
  // ---------------------------------------------------
  const handleAllocate = async (bus_id, route_id) => {
    try {
      const token = "mock_token_for_demo";

      const response = await fetch(
        `http://127.0.0.1:8000/admin/resolve-alert?token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bus_id,
            route_id: route_id.toString(),
            action_type: "DEPLOY_SPARE"
          })
        }
      );

      if (response.ok) {
        alert(`✅ Spare bus deployed for Route ${route_id}`);

        // Remove resolved alert locally
        setAlerts(prev =>
          prev.filter(a => !(a.bus_id === bus_id && a.route_id === route_id))
        );
      } else {
        alert("❌ Failed to execute admin action");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Connection error");
    }
  };

  return (
    <div style={pageStyle}>
      {/* ---------------- HEADER ---------------- */}
      <div style={headerStyle}>
        <h1 style={{ margin: 0 }}>🎛️ Control Center</h1>
        <Link to="/" style={{ color: '#3498db', textDecoration: 'none' }}>
          View Map ➜
        </Link>
      </div>

      {/* ---------------- KPI CARDS ---------------- */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
        <Card title="Total Fleet" value={stats.total} color="#3498db" />
        <Card title="Active Buses" value={Object.keys(fleet).length} color="#2ecc71" />
        <Card title="Critical Delays" value={delayedCount} color="#e74c3c" />
      </div>

      {/* ---------------- MAIN LAYOUT ---------------- */}
      <div style={{ display: 'flex', gap: 20 }}>

        {/* -------- LEFT: FLEET TABLE -------- */}
        <div style={{ flex: 3, ...panelStyle }}>
          <h3 style={panelTitle}>Live Fleet Status</h3>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={thStyle}>Bus ID</th>
                <th style={thStyle}>Route</th>
                <th style={thStyle}>Speed</th>
                <th style={thStyle}>Traffic</th>
                <th style={thStyle}>Passengers</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(fleet).length === 0 ? (
                <tr>
                  <td colSpan="7" style={emptyStyle}>Waiting for live data...</td>
                </tr>
              ) : (
                Object.values(fleet).map(bus => (
                  <tr key={bus.bus_id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={tdStyle}><b>{bus.bus_id}</b></td>
                    <td style={tdStyle}>{bus.route_id}</td>
                    <td style={tdStyle}>{bus.speed} km/h</td>
                    <td style={tdStyle}>
                      <div style={trafficBarBg}>
                        <div
                          style={{
                            ...trafficBar,
                            width: `${bus.traffic_level}%`,
                            background:
                              bus.traffic_level > 80 ? 'red' :
                              bus.traffic_level > 50 ? 'orange' : 'green'
                          }}
                        />
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {bus.passenger_count}/{bus.capacity}
                    </td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          ...statusBadge,
                          background:
                            bus.color === 'red' ? '#ffebeb' :
                            bus.color === 'orange' ? '#fff8e1' : '#e6fffa',
                          color:
                            bus.color === 'red' ? '#c0392b' :
                            bus.color === 'orange' ? '#f39c12' : '#27ae60'
                        }}
                      >
                        {bus.status_text}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: 12, color: '#888' }}>
                      {bus.last_update}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* -------- RIGHT: ALERTS -------- */}
        <div style={{ flex: 1, ...panelStyle }}>
          <h3 style={{ ...panelTitle, color: '#e74c3c' }}>⚡ Action Required</h3>

          {alerts.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#aaa' }}>No active alerts</p>
          ) : (
            alerts.map((alert, index) => (
              <div key={index} style={alertCard(alert.level)}>
                <div style={{ fontSize: 12, fontWeight: 'bold', color: '#555' }}>
                  {alert.type}
                </div>
                <div style={{ marginTop: 5 }}>{alert.message}</div>

                <button
                  style={alertBtn}
                  onClick={() => handleAllocate(alert.bus_id, alert.route_id)}
                >
                  Allocate Spare Bus
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ---------------- ANALYTICS SECTION ---------------- */}
      <div style={{ marginTop: 30 }}>
        <h2 style={{ color: '#2c3e50' }}>📊 Historical Performance</h2>
        <AnalyticsCharts data={analyticsData} />
      </div>
    </div>
  );
};

/* ---------------- STYLES ---------------- */
const pageStyle = {
  padding: 20,
  background: '#f4f6f8',
  minHeight: '100vh',
  fontFamily: 'Arial, sans-serif'
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 30
};

const panelStyle = {
  background: 'white',
  padding: 20,
  borderRadius: 8,
  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
};

const panelTitle = {
  marginTop: 0,
  borderBottom: '2px solid #eee',
  paddingBottom: 10
};

const thStyle = { padding: 12, fontSize: 14, color: '#555' };
const tdStyle = { padding: 12, fontSize: 14 };
const emptyStyle = { padding: 20, textAlign: 'center', color: '#777' };

const trafficBarBg = {
  width: '100%',
  background: '#eee',
  height: 8,
  borderRadius: 4,
  overflow: 'hidden'
};

const trafficBar = { height: '100%' };

const statusBadge = {
  padding: '5px 10px',
  borderRadius: 15,
  fontSize: 12,
  fontWeight: 'bold'
};

const alertBtn = {
  marginTop: 10,
  background: '#2c3e50',
  color: 'white',
  border: 'none',
  padding: '5px 10px',
  borderRadius: 3,
  cursor: 'pointer',
  fontSize: 12
};

const alertCard = (level) => ({
  background: level === 'CRITICAL' ? '#ffebeb' : '#fff3cd',
  padding: 15,
  borderRadius: 5,
  marginBottom: 10,
  borderLeft: `4px solid ${level === 'CRITICAL' ? '#c0392b' : '#f39c12'}`
});

const Card = ({ title, value, color }) => (
  <div style={{
    flex: 1,
    background: 'white',
    padding: 20,
    borderRadius: 8,
    borderLeft: `5px solid ${color}`,
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
  }}>
    <div style={{ fontSize: 12, color: '#777' }}>{title}</div>
    <div style={{ fontSize: 32, fontWeight: 'bold' }}>{value}</div>
  </div>
);

export default AdminDashboard;
