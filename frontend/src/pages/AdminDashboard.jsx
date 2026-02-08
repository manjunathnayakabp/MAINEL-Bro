import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AnalyticsCharts from '../components/AnalyticsCharts';
import { apiUrl, wsUrl } from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({ total: 0, active: 0, routes: 0, health: 'Unknown' });
  const [fleet, setFleet] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [filters, setFilters] = useState({ query: '', status: 'all' });

  useEffect(() => {
    fetch(apiUrl('/admin/fleet-stats?token=mock_token_for_demo'))
      .then((res) => res.json())
      .then((data) =>
        setStats({
          total: data.total_buses ?? 0,
          active: data.active_buses ?? 0,
          routes: data.total_routes ?? 0,
          health: data.system_health ?? 'Unknown'
        })
      )
      .catch(() => {
        setStats({ total: 0, active: 0, routes: 0, health: 'Unknown' });
      });

    fetch(apiUrl('/admin/analytics?token=mock_token_for_demo'))
      .then((res) => res.json())
      .then((data) => setAnalyticsData(data))
      .catch((err) => console.error('Analytics Error:', err));
  }, []);

  useEffect(() => {
    const ws = new WebSocket(wsUrl('/ws/tracking'));

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.bus_id) return;

      setFleet((prev) => ({
        ...prev,
        [data.bus_id]: {
          ...data,
          last_update: new Date().toLocaleTimeString()
        }
      }));

      if (data.alerts && data.alerts.length > 0) {
        setAlerts((prev) => [...data.alerts, ...prev].slice(0, 5));
      }

      setActivityLog((prev) => [
        {
          id: `${data.bus_id}-${Date.now()}`,
          text: `Bus ${data.bus_id} | Route ${data.route_id} | ${data.speed?.toFixed(1)} km/h`,
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ].slice(0, 6));
    };

    return () => ws.close();
  }, []);

  const fleetList = Object.values(fleet);
  const activeCount = fleetList.length;
  const delayedCount = fleetList.filter((b) => b.color === 'red').length;
  const moderateDelayCount = fleetList.filter((b) => b.color === 'orange').length;
  const stalledCount = fleetList.filter((b) => (b.speed ?? 0) < 2).length;
  const crowdedCount = fleetList.filter((b) => (b.passenger_count / (b.capacity || 1)) >= 0.8).length;
  const activeRoutes = new Set(fleetList.map((b) => b.route_id)).size;

  const avgSpeed = activeCount
    ? Math.round(
      fleetList.reduce((sum, b) => sum + (Number(b.speed) || 0), 0) / activeCount
    )
    : 0;
  const avgTraffic = activeCount
    ? Math.round(
      fleetList.reduce((sum, b) => sum + (Number(b.traffic_level) || 0), 0) / activeCount
    )
    : 0;
  const avgOccupancy = activeCount
    ? Math.round(
      (fleetList.reduce((sum, b) => sum + (b.passenger_count / (b.capacity || 1)), 0) / activeCount) * 100
    )
    : 0;
  const onTimeRate = activeCount
    ? Math.round(
      (fleetList.filter((b) => b.color === 'green').length / activeCount) * 100
    )
    : 0;

  const queryLower = filters.query.toLowerCase();
  const filteredFleet = fleetList.filter((bus) => {
    const matchesQuery =
      bus.bus_id?.toLowerCase().includes(queryLower) ||
      bus.route_id?.toString().toLowerCase().includes(queryLower);

    if (!matchesQuery) return false;

    if (filters.status === 'all') return true;
    if (filters.status === 'on-time') return bus.color === 'green';
    if (filters.status === 'delayed') return bus.color === 'orange';
    if (filters.status === 'critical') return bus.color === 'red';
    if (filters.status === 'crowded') return (bus.passenger_count / (bus.capacity || 1)) >= 0.8;
    if (filters.status === 'stalled') return (bus.speed ?? 0) < 2;
    return true;
  });

  const topCrowded = [...fleetList]
    .sort((a, b) => (b.passenger_count / (b.capacity || 1)) - (a.passenger_count / (a.capacity || 1)))
    .slice(0, 3);
  const slowest = [...fleetList]
    .sort((a, b) => (Number(a.speed) || 0) - (Number(b.speed) || 0))
    .slice(0, 3);

  const handleAllocate = async (bus_id, route_id) => {
    try {
      const response = await fetch(
        apiUrl('/admin/resolve-alert?token=mock_token_for_demo'),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bus_id,
            route_id: route_id.toString(),
            action_type: 'DEPLOY_SPARE'
          })
        }
      );

      if (response.ok) {
        alert(`Spare bus deployed for Route ${route_id}`);
        setAlerts((prev) =>
          prev.filter((a) => !(a.bus_id === bus_id && a.route_id === route_id))
        );
      } else {
        alert('Action failed');
      }
    } catch (err) {
      console.error(err);
      alert('Backend not reachable');
    }
  };

  return (
    <div className="page-container">
      <div className="section-header section-header--row">
        <div>
          <h1 className="page-title">Admin Control Center</h1>
          <p className="page-subtitle">Monitor fleet performance and manage live incidents.</p>
        </div>
        <Link to="/track" className="text-link">
          View Live Map
        </Link>
      </div>

      <div className="kpi-grid">
        <StatCard title="Total Fleet" value={stats.total} tone="info" helper="Registered buses" />
        <StatCard title="Active Buses" value={activeCount} tone="success" helper="Streaming now" />
        <StatCard title="Active Routes" value={activeRoutes} tone="info" helper="Routes in motion" />
        <StatCard title="Critical Delays" value={delayedCount} tone="danger" helper="Needs attention" />
        <StatCard title="Crowded Buses" value={crowdedCount} tone="warning" helper="80%+ full" />
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Operations Pulse</h3>
            <span className="status-pill status-pill--neutral">System: {stats.health}</span>
          </div>
          <div className="pulse-grid">
            <PulseCard label="Avg Speed" value={`${avgSpeed} km/h`} tone="info" />
            <PulseCard label="Avg Occupancy" value={`${avgOccupancy}%`} tone="warning" />
            <PulseCard label="Avg Traffic" value={`${avgTraffic}%`} tone="danger" />
            <PulseCard label="On-Time Rate" value={`${onTimeRate}%`} tone="success" />
          </div>
          <div className="meter-grid">
            <Meter label="On-Time" value={onTimeRate} tone="success" />
            <Meter label="Delays" value={moderateDelayCount + delayedCount} max={Math.max(activeCount, 1)} tone="warning" />
            <Meter label="Stalled" value={stalledCount} max={Math.max(activeCount, 1)} tone="danger" />
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Command Center</h3>
            <span className="text-muted">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="action-grid">
            <button className="btn btn-primary" onClick={() => navigate('/allocate')}>
              Allocate Resources
            </button>
            <Link to="/track" className="btn btn-outline">
              Open Live Map
            </Link>
            <button
              className="btn btn-outline"
              onClick={() => setFleet({})}
            >
              Clear Stream Cache
            </button>
          </div>
          <div className="activity-list">
            <div className="activity-title">Recent Activity</div>
            {activityLog.length === 0 ? (
              <p className="empty-state">Waiting for telemetry...</p>
            ) : (
              activityLog.map((item) => (
                <div key={item.id} className="activity-row">
                  <span>{item.text}</span>
                  <span className="text-muted">{item.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="layout-split">
        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title">Live Fleet Status</h3>
            <div className="table-controls">
              <input
                className="table-search"
                placeholder="Search bus or route"
                value={filters.query}
                onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))}
              />
              <select
                className="table-select"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="all">All Status</option>
                <option value="on-time">On Time</option>
                <option value="delayed">Delayed</option>
                <option value="critical">Critical</option>
                <option value="crowded">Crowded</option>
                <option value="stalled">Stalled</option>
              </select>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Bus</th>
                <th>Route</th>
                <th>Speed</th>
                <th>Traffic</th>
                <th>Occupancy</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredFleet.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    {fleetList.length === 0 ? 'Waiting for live data...' : 'No matches for current filters.'}
                  </td>
                </tr>
              ) : (
                filteredFleet.map((bus) => {
                  const statusTone =
                    bus.color === 'red' ? 'danger' : bus.color === 'orange' ? 'warning' : 'success';
                  const occupancy = Math.min(
                    Math.round((bus.passenger_count / (bus.capacity || 1)) * 100),
                    100
                  );
                  return (
                    <tr key={bus.bus_id} className={`table-row table-row--${statusTone}`}>
                      <td>
                        <div className="fleet-id">
                          <b>{bus.bus_id}</b>
                          <span className="text-muted">Cap {bus.capacity}</span>
                        </div>
                      </td>
                      <td>{bus.route_id}</td>
                      <td>{Number(bus.speed || 0).toFixed(1)} km/h</td>
                      <td>
                        <div className="traffic-bar">
                          <div
                            className="traffic-bar__fill"
                            style={{
                              width: `${bus.traffic_level}%`,
                              background:
                                bus.traffic_level > 80
                                  ? '#dc2626'
                                  : bus.traffic_level > 50
                                    ? '#f59e0b'
                                    : '#16a34a'
                            }}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="occupancy-meter">
                          <div className="occupancy-meter__label">
                            {bus.passenger_count}/{bus.capacity}
                          </div>
                          <div className="occupancy-meter__bar">
                            <div
                              className="occupancy-meter__fill"
                              style={{ width: `${occupancy}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${statusTone}`}>
                          {bus.status_text}
                        </span>
                      </td>
                      <td className="text-muted">{bus.last_update}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h3 className="panel-title panel-title--danger">Action Required</h3>
            <span className="status-pill status-pill--danger">{alerts.length}</span>
          </div>

          {alerts.length === 0 ? (
            <p className="empty-state">No active alerts</p>
          ) : (
            alerts.map((alert, i) => {
              const alertTone = alert.level?.toLowerCase() === 'critical' ? 'critical' : 'warning';
              return (
                <div key={i} className={`alert-card alert-card--${alertTone}`}>
                  <b>{alert.type}</b>
                  <div className="alert-message">{alert.message}</div>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleAllocate(alert.bus_id, alert.route_id)}
                  >
                    Allocate Spare Bus
                  </button>
                </div>
              );
            })
          )}

          <div className="mini-panel">
            <h4>Highest Occupancy</h4>
            {topCrowded.length === 0 ? (
              <p className="empty-state">No data yet</p>
            ) : (
              topCrowded.map((bus) => (
                <div key={bus.bus_id} className="mini-row">
                  <span>{bus.bus_id}</span>
                  <span className="text-muted">
                    {Math.round((bus.passenger_count / (bus.capacity || 1)) * 100)}%
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mini-panel">
            <h4>Slowest Buses</h4>
            {slowest.length === 0 ? (
              <p className="empty-state">No data yet</p>
            ) : (
              slowest.map((bus) => (
                <div key={bus.bus_id} className="mini-row">
                  <span>{bus.bus_id}</span>
                  <span className="text-muted">{Number(bus.speed || 0).toFixed(1)} km/h</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="analytics-section">
        <h2 className="section-title">Historical Performance</h2>
        <AnalyticsCharts data={analyticsData} />
      </div>
    </div>
  );
};

const StatCard = ({ title, value, tone, helper }) => (
  <div className={`stat-card stat-card--${tone}`}>
    <div className="stat-label">{title}</div>
    <div className="stat-value">{value}</div>
    {helper && <div className="stat-helper">{helper}</div>}
  </div>
);

const PulseCard = ({ label, value, tone }) => (
  <div className={`pulse-card pulse-card--${tone}`}>
    <div className="pulse-label">{label}</div>
    <div className="pulse-value">{value}</div>
  </div>
);

const Meter = ({ label, value, max = 100, tone }) => {
  const percent = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div className="meter">
      <div className="meter-header">
        <span>{label}</span>
        <span className="text-muted">{value}</span>
      </div>
      <div className="meter-bar">
        <div className={`meter-fill meter-fill--${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export default AdminDashboard;
