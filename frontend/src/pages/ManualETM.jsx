import React, { useState, useEffect } from 'react';

// ⚠️ CHANGE THIS TO YOUR BACKEND IP
const API_BASE = 'http://10.103.20.36:8000';

const ManualETM = () => {
  // Lists from DB
  const [busList, setBusList] = useState([]);
  const [routeList, setRouteList] = useState([]);
  const [stopsList, setStopsList] = useState([]);

  // Selections
  const [busId, setBusId] = useState('');
  const [routeId, setRouteId] = useState('');

  // Trip State
  const [isStarted, setIsStarted] = useState(false);
  const [currentStop, setCurrentStop] = useState('Depot');
  const [occupancy, setOccupancy] = useState(0);
  const [lastLog, setLastLog] = useState('Ready to start...');

  // Ticketing
  const [destStop, setDestStop] = useState('');
  const [ticketCount, setTicketCount] = useState(1);

  // --------------------------------------------------
  // 1. Load Initial Config (Buses & Routes)
  // --------------------------------------------------
  useEffect(() => {
    fetch(`${API_BASE}/etm/config`)
      .then(res => res.json())
      .then(data => {
        setBusList(data.buses);
        setRouteList(data.routes);

        if (data.buses.length > 0) setBusId(data.buses[0]);
        if (data.routes.length > 0) setRouteId(data.routes[0].id);
      })
      .catch(() => alert("❌ Backend not reachable"));
  }, []);

  // --------------------------------------------------
  // 2. Load Stops When Route Changes
  // --------------------------------------------------
  useEffect(() => {
    if (!routeId) return;

    fetch(`${API_BASE}/etm/routes/${routeId}/stops`)
      .then(res => res.json())
      .then(data => {
        setStopsList(data);
        if (data.length > 0) setDestStop(data[data.length - 1].id);
      });
  }, [routeId]);

  // --------------------------------------------------
  // API Helper
  // --------------------------------------------------
  const apiCall = async (endpoint, body) => {
    try {
      const res = await fetch(`${API_BASE}/etm/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch {
      return null;
    }
  };

  // --------------------------------------------------
  // ACTION HANDLERS
  // --------------------------------------------------
  const handleStart = async () => {
    setLastLog("Initializing...");
    const res = await apiCall('start', { bus_id: busId, route_id: routeId });
    if (res) {
      setIsStarted(true);
      setCurrentStop('Trip Started');
      setOccupancy(0);
      setLastLog(`✅ Trip Active: ${busId}`);
    }
  };

  const handleIssueTicket = async () => {
    const res = await apiCall('issue-ticket', {
      bus_id: busId,
      route_id: routeId,
      source_stop: currentStop,
      dest_stop: destStop,
      count: ticketCount
    });
    if (res) {
      setOccupancy(prev => prev + ticketCount);
      setLastLog(`🎟️ Ticket Issued (+${ticketCount})`);
    }
  };

  const handleNextStop = async () => {
    setLastLog("🚌 Moving to next stop...");
    const res = await apiCall('move-next', { bus_id: busId, route_id: routeId });

    if (res?.status === "End of Route") {
      alert("🏁 Route Completed");
      setIsStarted(false);
      setCurrentStop('Depot');
      setOccupancy(0);
      setLastLog("Trip Finished");
    } else if (res) {
      setCurrentStop(res.current_stop);
      setOccupancy(res.occupancy);
      setLastLog(`📍 Arrived at ${res.current_stop} (-${res.deboarded})`);
    }
  };

  const handleEndTrip = async () => {
    if (!window.confirm("End trip and return bus to Auto-Pilot?")) return;

    await apiCall('end', { bus_id: busId, route_id: routeId });

    setIsStarted(false);
    setOccupancy(0);
    setCurrentStop('Depot');
    setLastLog("Trip Ended. Bus returned to Simulator.");
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------
  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f0f2f5', minHeight: '100vh', padding: '15px' }}>

      {/* Header */}
      <div style={{ background: '#2c3e50', color: 'white', padding: '15px', borderRadius: '10px', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🚌 ETM Console</h2>
        <small>Connected to: {API_BASE}</small>
      </div>

      {!isStarted ? (
        /* START SCREEN */
        <div style={styles.card}>
          <h3>🚩 Start New Trip</h3>

          <label style={styles.label}>Bus</label>
          <select style={styles.select} value={busId} onChange={e => setBusId(e.target.value)}>
            {busList.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <label style={styles.label}>Route</label>
          <select style={styles.select} value={routeId} onChange={e => setRouteId(e.target.value)}>
            {routeList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <button onClick={handleStart} style={styles.btnStart}>START TRIP ▶</button>
        </div>
      ) : (
        /* ACTIVE TRIP */
        <>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <small>Current Stop</small>
                <h3>{currentStop}</h3>
              </div>
              <div>
                <small>Occupancy</small>
                <h2>{occupancy}</h2>
              </div>
            </div>

            <div style={styles.infoBox}>ℹ {lastLog}</div>

            <button onClick={handleEndTrip} style={styles.btnEnd}>
              END TRIP ✕
            </button>
          </div>

          <button onClick={handleNextStop} style={styles.btnNext}>
            ARRIVE NEXT STOP ➡
          </button>

          <div style={{ ...styles.card, marginTop: 20 }}>
            <h3>🎟️ Issue Ticket</h3>

            <label style={styles.label}>Destination</label>
            <select style={styles.select} value={destStop} onChange={e => setDestStop(e.target.value)}>
              {stopsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <label style={styles.label}>Passengers</label>
            <div style={{ display: 'flex', gap: 10 }}>
              <button style={styles.btnCounter} onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}>-</button>
              <div style={styles.counterBox}>{ticketCount}</div>
              <button style={styles.btnCounter} onClick={() => setTicketCount(ticketCount + 1)}>+</button>
            </div>

            <button onClick={handleIssueTicket} style={styles.btnTicket}>PRINT TICKET 🖨️</button>
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  card: { background: 'white', padding: 20, borderRadius: 12 },
  label: { fontWeight: 'bold', marginTop: 10 },
  select: { width: '100%', padding: 10, marginBottom: 10 },
  btnStart: { width: '100%', padding: 15, background: '#27ae60', color: 'white', fontSize: 18 },
  btnNext: { width: '100%', padding: 18, background: '#2980b9', color: 'white', marginTop: 15 },
  btnEnd: { marginTop: 10, background: '#e74c3c', color: 'white', padding: 10, width: '100%' },
  btnCounter: { width: 50, fontSize: 20 },
  btnTicket: { width: '100%', padding: 15, background: '#8e44ad', color: 'white', marginTop: 10 },
  counterBox: { flex: 1, textAlign: 'center', fontSize: 20, padding: 10, background: '#f9f9f9' },
  infoBox: { marginTop: 10, background: '#e1f5fe', padding: 10 }
};

export default ManualETM;
