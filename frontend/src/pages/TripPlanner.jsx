import React, { useState, useEffect } from 'react';
import { apiUrl } from '../services/api';

const TripPlanner = () => {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('');

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStopId, setSelectedStopId] = useState(null);

  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const quickStops = [
    'City Center',
    'Central Bus Stand',
    'Airport Terminal',
    'Railway Station'
  ];

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation not supported');
      return;
    }
    setStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus('Location found');
      },
      () => setStatus('Location access denied')
    );
  };

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`${apiUrl('/trip/search-stops')}?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => setSuggestions(data))
        .catch((err) => console.log('Search error', err));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectStop = (stop) => {
    setQuery(stop.name);
    setSelectedStopId(stop.id);
    setSuggestions([]);
  };

  const findRoute = async () => {
    if (!coords || !selectedStopId) {
      alert('Please get location and select a destination from the list.');
      return;
    }
    setLoading(true);
    setPlans(null);
    try {
      const res = await fetch(
        `${apiUrl('/trip/plan')}?start_lat=${coords.lat}&start_lon=${coords.lon}&dest_stop_id=${encodeURIComponent(selectedStopId)}`
      );
      const data = await res.json();

      if (res.ok) {
        setPlans(data);
        setLastUpdated(new Date());
      } else {
        alert(data.detail || 'Error finding route');
      }
    } catch (err) {
      alert('Server connection error');
    }
    setLoading(false);
  };

  const statusTone = status
    ? status.toLowerCase().includes('found')
      ? 'success'
      : status.toLowerCase().includes('denied')
        ? 'danger'
        : 'neutral'
    : '';

  const planCount = plans?.plans?.length || 0;
  const directCount = plans?.plans?.filter((p) => p.type?.includes('DIRECT')).length || 0;
  const transferCount = plans?.plans?.filter((p) => p.type?.includes('TRANSFER')).length || 0;

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="page-title">Smart Trip Planner</h1>
        <p className="page-subtitle">Plan routes using live stop data and your current location.</p>
      </div>

      <div className="trip-layout">
        <div className="trip-panel">
          <div className="modern-card trip-card">
            <div className="trip-card__header">
              <div>
                <h2>Plan Your Route</h2>
                <p className="text-muted">Get a fast route with live occupancy signals.</p>
              </div>
              <span className="status-pill status-pill--success">Live Network</span>
            </div>

            <div className="form-group">
              <label className="form-label">1. Your Location</label>
              <div className="input-row">
                <input
                  readOnly
                  value={coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : ''}
                  placeholder="Waiting for GPS..."
                  className="modern-input"
                />
                <button onClick={getMyLocation} className="btn btn-secondary btn-sm">
                  Locate
                </button>
              </div>
              {status && (
                <span className={`status-pill status-pill--${statusTone}`}>{status}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">2. Destination Stop</label>
              <input
                type="text"
                placeholder="Search stop (e.g., Jayanagar)"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedStopId(null);
                }}
                className="modern-input"
              />

              {suggestions.length > 0 && (
                <div className="dropdown">
                  {suggestions.map((stop) => (
                    <button
                      type="button"
                      key={stop.id}
                      className="dropdown-item"
                      onClick={() => handleSelectStop(stop)}
                    >
                      {stop.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="chip-group">
              {quickStops.map((stop) => (
                <button
                  key={stop}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setQuery(stop);
                    setSelectedStopId(null);
                  }}
                >
                  {stop}
                </button>
              ))}
            </div>

            <button onClick={findRoute} className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Calculating...' : 'Find Best Route'}
            </button>
          </div>

          {plans && (
            <div className="results-block">
              <div className="result-header">
                Trip: {plans.start} to {plans.destination}
              </div>

              {plans.plans.length === 0 ? (
                <div className="empty-state">
                  {plans.message || 'No route found. Try a different stop.'}
                </div>
              ) : (
                plans.plans.map((plan, idx) => (
                  <div key={idx} className="result-card">
                    <div className="result-card__header">
                      <span className="badge badge-accent">{plan.type}</span>
                      {plan.total_stops !== undefined && (
                        <span className="text-muted">{plan.total_stops} stops</span>
                      )}
                    </div>

                    {plan.segments.map((seg, i) => {
                      const modeKey = (seg.mode || 'OTHER').toLowerCase();
                      return (
                        <div key={i} className="segment-row">
                          <span className={`segment-badge segment-badge--${modeKey}`}>{seg.mode}</span>
                          <div className="segment-text">{seg.instruction}</div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <aside className="trip-insights">
          <div className="modern-card insight-card">
            <h3>Trip Summary</h3>
            {plans ? (
              <div className="summary-grid">
                <div className="summary-item">
                  <span>Options</span>
                  <strong>{planCount}</strong>
                </div>
                <div className="summary-item">
                  <span>Direct</span>
                  <strong>{directCount}</strong>
                </div>
                <div className="summary-item">
                  <span>Transfers</span>
                  <strong>{transferCount}</strong>
                </div>
                <div className="summary-item">
                  <span>Updated</span>
                  <strong>{lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</strong>
                </div>
              </div>
            ) : (
              <p className="text-muted">Run a search to see smart recommendations here.</p>
            )}
          </div>

          <div className="modern-card insight-card">
            <h3>Travel Tips</h3>
            <ul className="insight-list">
              <li>Enable GPS for accurate stop suggestions.</li>
              <li>Try route keywords like “Market” or “Terminal”.</li>
              <li>Check occupancy before boarding.</li>
            </ul>
          </div>

          <div className="modern-card insight-card">
            <h3>Service Status</h3>
            <div className="status-stack">
              <div className="status-row">
                <span className="status-dot status-dot--success" />
                <span>Live tracking online</span>
              </div>
              <div className="status-row">
                <span className="status-dot status-dot--warning" />
                <span>Expect delays near central hubs</span>
              </div>
              <div className="status-row">
                <span className="status-dot status-dot--neutral" />
                <span>Support: 24/7 dispatch</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default TripPlanner;
