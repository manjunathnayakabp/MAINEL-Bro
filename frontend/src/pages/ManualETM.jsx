import React, { useState, useEffect } from 'react';
import { apiUrl } from '../services/api';

const ManualETM = () => {
  const MAX_CAPACITY = 50;
  const [alert, setAlert] = useState(null);

  const [busList, setBusList] = useState([]);
  const [routeList, setRouteList] = useState([]);
  const [stopsList, setStopsList] = useState([]);

  const [busId, setBusId] = useState('');
  const [routeId, setRouteId] = useState('');

  const [isStarted, setIsStarted] = useState(false);
  const [currentStop, setCurrentStop] = useState('Depot');
  const [occupancy, setOccupancy] = useState(0);
  const [lastLog, setLastLog] = useState('Ready to start.');
  const [statusMsg, setStatusMsg] = useState('Connecting...');
  const [activityLog, setActivityLog] = useState([]);

  const [destStop, setDestStop] = useState('');
  const [ticketCount, setTicketCount] = useState(1);

  const pushLog = (message) => {
    setActivityLog((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message,
        time: new Date().toLocaleTimeString()
      },
      ...prev
    ].slice(0, 6));
  };

  useEffect(() => {
    setStatusMsg('Connecting to backend...');

    fetch(apiUrl('/etm/config'))
      .then((res) => {
        if (!res.ok) throw new Error('Backend not reachable');
        return res.json();
      })
      .then((data) => {
        setBusList(data.buses);
        setRouteList(data.routes);

        if (data.buses.length > 0) setBusId(data.buses[0]);
        if (data.routes.length > 0) setRouteId(data.routes[0].id);

        setStatusMsg('System online');
        pushLog('System online');
      })
      .catch((err) => {
        setStatusMsg(err.message);
        pushLog(err.message);
      });
  }, []);

  useEffect(() => {
    if (!routeId) return;

    fetch(apiUrl(`/etm/routes/${routeId}/stops`))
      .then((res) => res.json())
      .then((data) => {
        setStopsList(data);
        if (data.length > 0) setDestStop(data[data.length - 1].id);
      });
  }, [routeId]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const interval = setInterval(() => {
      fetch(apiUrl(`/admin/notifications/${user.id}`))
        .then((res) => res.json())
        .then((data) => {
          if (data.length > 0) {
            setAlert(data[0][0]);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const apiCall = async (endpoint, body) => {
    try {
      const res = await fetch(apiUrl(`/etm/${endpoint}`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch {
      alert('Connection error');
      return null;
    }
  };

  const handleStart = async () => {
    if (!busId || !routeId) return alert('Select bus and route');

    const res = await apiCall('start', { bus_id: busId, route_id: routeId });
    if (res) {
      setIsStarted(true);
      setCurrentStop(res.start_stop || 'Trip started');
      setOccupancy(0);
      setLastLog(`Trip started (${busId})`);
      pushLog(`Trip started on Bus ${busId}`);
    }
  };

  const handleNextStop = async () => {
    const res = await apiCall('move-next', { bus_id: busId, route_id: routeId });

    if (res?.status === 'End of Route') {
      handleEndTrip();
    } else if (res) {
      setCurrentStop(res.current_stop);
      setOccupancy(res.occupancy);
      setLastLog(`Arrived at ${res.current_stop}`);
      pushLog(`Arrived at ${res.current_stop}`);
    }
  };

  const handleIssueTicket = async () => {
    const res = await apiCall('issue-ticket', {
      bus_id: busId,
      route_id: routeId,
      dest_stop: destStop,
      count: ticketCount
    });

    if (res) {
      setOccupancy((o) => o + ticketCount);
      setLastLog(`Issued ${ticketCount} ticket(s)`);
      pushLog(`Issued ${ticketCount} ticket(s)`);
      setTicketCount(1);
    }
  };

  const handleEndTrip = async () => {
    if (!window.confirm('End trip?')) return;

    await apiCall('end', { bus_id: busId, route_id: routeId });

    setIsStarted(false);
    setCurrentStop('Depot');
    setOccupancy(0);
    setLastLog('Trip ended');
    pushLog('Trip ended');
  };

  const selectedRoute = routeList.find((route) => route.id === routeId);
  const routeName = selectedRoute?.name || 'Unassigned route';
  const occupancyPercent = Math.min(Math.round((occupancy / MAX_CAPACITY) * 100), 100);

  return (
    <div className="page-container">
      {alert && (
        <div className="alert-banner">
          Admin alert: {alert}
        </div>
      )}

      <div className="driver-hero">
        <div>
          <h2 className="page-title">Driver Operations Console</h2>
          <p className="page-subtitle">{statusMsg}</p>
        </div>
        <div className="driver-hero__meta">
          <span className={`status-pill status-pill--${isStarted ? 'success' : 'neutral'}`}>
            {isStarted ? 'On Route' : 'Idle'}
          </span>
          <span className="status-pill status-pill--neutral">
            Bus {busId || '—'}
          </span>
        </div>
      </div>

      <div className="driver-layout">
        <div className="driver-panel">
          {!isStarted ? (
            <div className="modern-card driver-card">
              <div className="driver-card__header">
                <div>
                  <h3>Start Trip</h3>
                  <p className="text-muted">Select your bus and route to begin.</p>
                </div>
                <span className="status-pill status-pill--neutral">Awaiting Start</span>
              </div>

              <div className="form-group">
                <label className="form-label">Bus</label>
                <select className="modern-select" value={busId} onChange={(e) => setBusId(e.target.value)}>
                  {busList.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Route</label>
                <select className="modern-select" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
                  {routeList.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <button className="btn btn-primary btn-full" onClick={handleStart}>Start Trip</button>
            </div>
          ) : (
            <>
              <div className="modern-card driver-card">
                <div className="driver-card__header">
                  <div>
                    <h3>Current Stop</h3>
                    <p className="text-muted">{currentStop}</p>
                  </div>
                  <span className="status-pill status-pill--success">Live</span>
                </div>

                <div className="stat-grid">
                  <div className="stat-tile">
                    <span>Passengers</span>
                    <strong>{occupancy}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>Capacity</span>
                    <strong>{MAX_CAPACITY}</strong>
                  </div>
                  <div className="stat-tile">
                    <span>Occupancy</span>
                    <strong>{occupancyPercent}%</strong>
                  </div>
                </div>

                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${occupancyPercent}%` }} />
                </div>

                <div className="info-box">{lastLog}</div>

                <div className="action-row">
                  <button className="btn btn-secondary" onClick={handleNextStop}>
                    Next Stop
                  </button>
                  <button className="btn btn-danger" onClick={handleEndTrip}>
                    End Trip
                  </button>
                </div>
              </div>

              <div className="modern-card driver-card">
                <div className="driver-card__header">
                  <div>
                    <h3>Ticketing</h3>
                    <p className="text-muted">Issue tickets for onboard passengers.</p>
                  </div>
                  <span className="status-pill status-pill--neutral">ETM Mode</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination</label>
                  <select className="modern-select" value={destStop} onChange={(e) => setDestStop(e.target.value)}>
                    {stopsList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="counter-row">
                  <button className="btn btn-outline btn-sm" onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}>-</button>
                  <div className="counter-value">{ticketCount}</div>
                  <button className="btn btn-outline btn-sm" onClick={() => setTicketCount(ticketCount + 1)}>+</button>
                </div>

                <button className="btn btn-primary btn-full" onClick={handleIssueTicket}>Print Ticket</button>
              </div>
            </>
          )}
        </div>

        <aside className="driver-aside">
          <div className="modern-card driver-card">
            <div className="driver-card__header">
              <div>
                <h3>Route Overview</h3>
                <p className="text-muted">{routeName}</p>
              </div>
              <span className="status-pill status-pill--neutral">Bus {busId || '—'}</span>
            </div>

            <div className="summary-grid">
              <div className="summary-item">
                <span>Trip Mode</span>
                <strong>{isStarted ? 'Manual' : 'Idle'}</strong>
              </div>
              <div className="summary-item">
                <span>Stops Loaded</span>
                <strong>{stopsList.length}</strong>
              </div>
              <div className="summary-item">
                <span>Last Update</span>
                <strong>{new Date().toLocaleTimeString()}</strong>
              </div>
              <div className="summary-item">
                <span>Occupancy</span>
                <strong>{occupancyPercent}%</strong>
              </div>
            </div>
          </div>

          <div className="modern-card driver-card">
            <div className="driver-card__header">
              <div>
                <h3>Activity Feed</h3>
                <p className="text-muted">Latest trip events.</p>
              </div>
            </div>

            {activityLog.length === 0 ? (
              <p className="text-muted">Waiting for activity...</p>
            ) : (
              <div className="activity-list">
                {activityLog.map((item) => (
                  <div key={item.id} className="activity-row">
                    <span>{item.message}</span>
                    <span className="text-muted">{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ManualETM;
