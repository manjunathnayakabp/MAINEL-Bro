import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { wsUrl } from '../services/api';

const DEFAULT_CENTER = [12.95, 77.6];
const DEFAULT_ZOOM = 12;

const MapFocus = ({ bus, resetTick }) => {
  const map = useMap();

  useEffect(() => {
    if (bus) {
      map.flyTo([bus.lat, bus.lon], Math.max(map.getZoom(), 14), { duration: 0.6 });
    }
  }, [bus?.bus_id, bus?.lat, bus?.lon, map]);

  useEffect(() => {
    if (resetTick > 0) {
      map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.6 });
    }
  }, [resetTick, map]);

  return null;
};

const LiveTracking = () => {
  const [buses, setBuses] = useState({});
  const [isLive, setIsLive] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [filters, setFilters] = useState({ query: '', status: 'all' });
  const [resetTick, setResetTick] = useState(0);

  useEffect(() => {
    const ws = new WebSocket(wsUrl('/ws/tracking'));

    ws.onopen = () => setIsLive(true);
    ws.onclose = () => setIsLive(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.bus_id && data.lat && data.lon) {
          setBuses((prev) => ({ ...prev, [data.bus_id]: data }));
        }
      } catch (e) {
        console.error(e);
      }
    };

    return () => ws.close();
  }, []);

  const getOccupancyInfo = (pax, cap) => {
    const ratio = pax / cap;

    if (ratio <= 0.6) {
      return { text: 'Seats available', color: '#16a34a' };
    }
    if (ratio <= 0.85) {
      return { text: 'Standing space', color: '#f59e0b' };
    }
    return { text: 'Heavily crowded', color: '#dc2626' };
  };

  const createBusIcon = (color, isSelected) =>
    new L.DivIcon({
      className: 'custom-icon',
      html: `
        <div class="bus-marker ${isSelected ? 'bus-marker--selected' : ''}" style="--bus-color:${color || '#0f4c81'}">
          <div class="bus-marker__top"></div>
          <div class="bus-marker__body">
            <span class="bus-marker__window"></span>
            <span class="bus-marker__window"></span>
            <span class="bus-marker__window"></span>
          </div>
          <div class="bus-marker__wheels">
            <span></span><span></span>
          </div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

  const busList = Object.values(buses);
  const selectedBus = busList.find((bus) => bus.bus_id === selectedBusId);
  const onTimeCount = busList.filter((b) => b.color === 'green').length;
  const delayedCount = busList.filter((b) => b.color === 'orange').length;
  const criticalCount = busList.filter((b) => b.color === 'red').length;
  const crowdedCount = busList.filter((b) => (b.passenger_count / (b.capacity || 1)) >= 0.8).length;

  const queryLower = filters.query.toLowerCase();
  const filteredBusList = busList.filter((bus) => {
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

  return (
    <div className="map-page">
      <div className="map-header">
        <div>
          <h1 className="page-title">Live Operations Map</h1>
          <p className="page-subtitle">Monitor fleet movement, delays, and crowding in real time.</p>
        </div>
        <div className="status-group">
          <span className={`status-pill status-pill--${isLive ? 'success' : 'danger'}`}>
            {isLive ? 'Live' : 'Disconnected'}
          </span>
          <span className="status-pill status-pill--neutral">
            Active: {filteredBusList.length}
          </span>
        </div>
      </div>

      <div className="map-toolbar">
        <div className="map-toolbar__left">
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
        <div className="map-toolbar__right">
          <button className="btn btn-outline btn-sm" onClick={() => setResetTick((t) => t + 1)}>
            Reset View
          </button>
          {selectedBusId && (
            <button className="btn btn-outline btn-sm" onClick={() => setSelectedBusId(null)}>
              Clear Selection
            </button>
          )}
        </div>
      </div>

      <div className="map-metrics">
        <div className="metric-card">
          <span>Active Buses</span>
          <strong>{busList.length}</strong>
        </div>
        <div className="metric-card">
          <span>On Time</span>
          <strong>{onTimeCount}</strong>
        </div>
        <div className="metric-card">
          <span>Delayed</span>
          <strong>{delayedCount}</strong>
        </div>
        <div className="metric-card">
          <span>Critical</span>
          <strong>{criticalCount}</strong>
        </div>
        <div className="metric-card">
          <span>Crowded</span>
          <strong>{crowdedCount}</strong>
        </div>
      </div>

      <div className="map-layout">
        <div className="map-canvas">
          <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapFocus bus={selectedBus} resetTick={resetTick} />

            {filteredBusList.map((bus) => {
              const occ = getOccupancyInfo(bus.passenger_count, bus.capacity);

              return (
                <Marker
                  key={bus.bus_id}
                  position={[bus.lat, bus.lon]}
                  icon={createBusIcon(bus.color, bus.bus_id === selectedBusId)}
                  eventHandlers={{
                    click: () => setSelectedBusId(bus.bus_id)
                  }}
                >
                  <Tooltip direction="top" offset={[0, -12]} opacity={0.95}>
                    <div className="tooltip-card" style={{ borderLeftColor: occ.color }}>
                      <h4>{bus.bus_id}</h4>

                      <div className="tooltip-details">
                        <div><b>Route:</b> {bus.route_id}</div>
                        <div>
                          <b>Status:</b>{' '}
                          <span style={{ color: bus.color, fontWeight: 'bold' }}>{bus.status_text}</span>
                        </div>
                        <div><b>Speed:</b> {bus.speed?.toFixed(1)} km/h</div>
                        <div><b>Traffic:</b> {bus.traffic_level}%</div>

                        <div className="tooltip-occupancy">
                          <b>Occupancy:</b>{' '}
                          <span style={{ color: occ.color, fontWeight: 'bold' }}>{occ.text}</span>
                        </div>

                        <div className="occupancy-bar">
                          <div
                            className="occupancy-bar__fill"
                            style={{
                              width: `${Math.min((bus.passenger_count / bus.capacity) * 100, 100)}%`,
                              background: occ.color
                            }}
                          />
                        </div>

                        <div className="tooltip-footnote">
                          {bus.passenger_count}/{bus.capacity}
                        </div>
                      </div>
                    </div>
                  </Tooltip>

                  <Popup>
                    <div className="popup-card">
                      <h3>Bus {bus.bus_id}</h3>
                      <p>Route {bus.route_id}</p>
                      <p style={{ color: occ.color, fontWeight: 'bold' }}>{occ.text}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <aside className="map-panel">
          <div className="map-panel__header">
            <h3 className="panel-title">Active Bus Details</h3>
            <span className="status-pill status-pill--neutral">{filteredBusList.length} buses</span>
          </div>
          <div className="map-panel__section">
            <div className="legend">
              <div className="legend-item">
                <span className="legend-dot legend-dot--success" />
                <span>On Time</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot--warning" />
                <span>Delayed</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot--danger" />
                <span>Critical</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot legend-dot--neutral" />
                <span>Idle / Unknown</span>
              </div>
            </div>
          </div>

          <div className="map-panel__section">
            <h4>Focused Bus</h4>
            {selectedBus ? (
              <div className="focus-card">
                <div>
                  <strong>{selectedBus.bus_id}</strong>
                  <p className="text-muted">Route {selectedBus.route_id}</p>
                </div>
                <div className="focus-grid">
                  <div>
                    <span>Speed</span>
                    <strong>{Number(selectedBus.speed || 0).toFixed(1)} km/h</strong>
                  </div>
                  <div>
                    <span>Traffic</span>
                    <strong>{selectedBus.traffic_level}%</strong>
                  </div>
                  <div>
                    <span>Occupancy</span>
                    <strong>{selectedBus.passenger_count}/{selectedBus.capacity}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted">Select a bus on the map to focus details.</p>
            )}
          </div>
          {busList.length === 0 ? (
            <p className="empty-state">Waiting for live bus data...</p>
          ) : filteredBusList.length === 0 ? (
            <p className="empty-state">No buses match the current filters.</p>
          ) : (
            <div className="bus-list">
              {filteredBusList.map((bus) => {
                const statusTone =
                  bus.color === 'red' ? 'danger' : bus.color === 'orange' ? 'warning' : 'success';
                return (
                  <div
                    key={bus.bus_id}
                    className={`bus-row ${bus.bus_id === selectedBusId ? 'bus-row--active' : ''}`}
                    onClick={() => setSelectedBusId(bus.bus_id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setSelectedBusId(bus.bus_id);
                    }}
                  >
                    <div className="bus-row__title">
                      <div>
                        <div className="bus-row__id">{bus.bus_id}</div>
                        <div className="bus-row__route">Route {bus.route_id}</div>
                      </div>
                      <span className={`status-pill status-pill--${statusTone}`}>
                        {bus.status_text || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="bus-meta">
                      <div className="bus-meta__item">
                        <span>Speed</span>
                        <strong>{bus.speed?.toFixed(1)} km/h</strong>
                      </div>
                      <div className="bus-meta__item">
                        <span>Traffic</span>
                        <strong>{bus.traffic_level}%</strong>
                      </div>
                      <div className="bus-meta__item">
                        <span>Occupancy</span>
                        <strong>{bus.passenger_count}/{bus.capacity}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default LiveTracking;
