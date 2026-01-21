import React, { useState, useEffect } from 'react';

// =====================================================
// AUTO-DETECT BACKEND (Mobile + Laptop Friendly)
// =====================================================
const PROTOCOL = window.location.protocol;
const HOST = window.location.hostname;
const PORT = '8000';
const API_BASE = `${PROTOCOL}//${HOST}:${PORT}`;

const ManualETM = () => {

  // =====================================================
  // ADMIN → DRIVER ALERT
  // =====================================================
  const [alert, setAlert] = useState(null);

  // =====================================================
  // DATA LISTS
  // =====================================================
  const [busList, setBusList] = useState([]);
  const [routeList, setRouteList] = useState([]);
  const [stopsList, setStopsList] = useState([]);

  // =====================================================
  // SELECTIONS
  // =====================================================
  const [busId, setBusId] = useState('');
  const [routeId, setRouteId] = useState('');

  // =====================================================
  // TRIP STATE
  // =====================================================
  const [isStarted, setIsStarted] = useState(false);
  const [currentStop, setCurrentStop] = useState('Depot');
  const [occupancy, setOccupancy] = useState(0);
  const [lastLog, setLastLog] = useState('Ready to start...');
  const [statusMsg, setStatusMsg] = useState('Connecting...');

  // =====================================================
  // TICKETING
  // =====================================================
  const [destStop, setDestStop] = useState('');
  const [ticketCount, setTicketCount] = useState(1);

  // =====================================================
  // 1. LOAD CONFIG (BUSES + ROUTES)
  // =====================================================
  useEffect(() => {
    setStatusMsg(`Connecting to ${API_BASE}...`);

    fetch(`${API_BASE}/etm/config`)
      .then(res => {
        if (!res.ok) throw new Error("Backend not reachable");
        return res.json();
      })
      .then(data => {
        setBusList(data.buses);
        setRouteList(data.routes);

        if (data.buses.length > 0) setBusId(data.buses[0]);
        if (data.routes.length > 0) setRouteId(data.routes[0].id);

        setStatusMsg("✅ System Online");
      })
      .catch(err => setStatusMsg(`❌ ${err.message}`));
  }, []);

  // =====================================================
  // 2. LOAD STOPS ON ROUTE CHANGE
  // =====================================================
  useEffect(() => {
    if (!routeId) return;

    fetch(`${API_BASE}/etm/routes/${routeId}/stops`)
      .then(res => res.json())
      .then(data => {
        setStopsList(data);
        if (data.length > 0) setDestStop(data[data.length - 1].id);
      });
  }, [routeId]);

  // =====================================================
  // 3. ADMIN ALERT POLLING (EVERY 5s)
  // =====================================================
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const interval = setInterval(() => {
      fetch(`${API_BASE}/admin/notifications/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.length > 0) {
            setAlert(data[0][0]);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // =====================================================
  // API HELPER
  // =====================================================
  const apiCall = async (endpoint, body) => {
    try {
      const res = await fetch(`${API_BASE}/etm/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch {
      alert("❌ Connection Error");
      return null;
    }
  };

  // =====================================================
  // ACTION HANDLERS
  // =====================================================
  const handleStart = async () => {
    if (!busId || !routeId) return alert("Select Bus & Route");

    const res = await apiCall('start', { bus_id: busId, route_id: routeId });
    if (res) {
      setIsStarted(true);
      setCurrentStop(res.start_stop || 'Trip Started');
      setOccupancy(0);
      setLastLog(`✅ Trip Started (${busId})`);
    }
  };

  const handleNextStop = async () => {
    const res = await apiCall('move-next', { bus_id: busId, route_id: routeId });

    if (res?.status === "End of Route") {
      handleEndTrip();
    } else if (res) {
      setCurrentStop(res.current_stop);
      setOccupancy(res.occupancy);
      setLastLog(`📍 Arrived at ${res.current_stop}`);
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
      setOccupancy(o => o + ticketCount);
      setLastLog(`🎟️ Issued ${ticketCount} Ticket(s)`);
      setTicketCount(1);
    }
  };

  const handleEndTrip = async () => {
    if (!window.confirm("End Trip?")) return;

    await apiCall('end', { bus_id: busId, route_id: routeId });

    setIsStarted(false);
    setCurrentStop('Depot');
    setOccupancy(0);
    setLastLog("🏁 Trip Ended");
  };

  // =====================================================
  // UI
  // =====================================================
  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f0f2f5', minHeight: '100vh', padding: 15 }}>

      {/* 🔔 ADMIN ALERT */}
      {alert && (
        <div style={{
          background: '#d63031',
          color: 'white',
          padding: 15,
          textAlign: 'center',
          fontWeight: 'bold',
          borderRadius: 6,
          marginBottom: 10
        }}>
          🔔 ADMIN ALERT: {alert}
        </div>
      )}

      {/* HEADER */}
      <div style={{ background: '#2c3e50', color: 'white', padding: 15, borderRadius: 10, marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>🚌 Driver Console</h2>
        <small>{statusMsg}</small>
      </div>

      {!isStarted ? (
        <div style={styles.card}>
          <h3>🚩 Start Trip</h3>

          <label>Bus</label>
          <select style={styles.select} value={busId} onChange={e => setBusId(e.target.value)}>
            {busList.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <label>Route</label>
          <select style={styles.select} value={routeId} onChange={e => setRouteId(e.target.value)}>
            {routeList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>

          <button style={styles.btnStart} onClick={handleStart}>START ▶</button>
        </div>
      ) : (
        <>
          <div style={styles.card}>
            <h3>{currentStop}</h3>
            <p>👥 Passengers: {occupancy}</p>
            <div style={styles.info}>{lastLog}</div>
            <button style={styles.btnEnd} onClick={handleEndTrip}>END TRIP ✕</button>
          </div>

          <button style={styles.btnNext} onClick={handleNextStop}>NEXT STOP ➡</button>

          <div style={{ ...styles.card, marginTop: 20 }}>
            <h3>🎟️ Ticket</h3>
            <select style={styles.select} value={destStop} onChange={e => setDestStop(e.target.value)}>
              {stopsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setTicketCount(Math.max(1, ticketCount - 1))}>-</button>
              <div style={styles.counter}>{ticketCount}</div>
              <button onClick={() => setTicketCount(ticketCount + 1)}>+</button>
            </div>

            <button style={styles.btnTicket} onClick={handleIssueTicket}>PRINT 🖨️</button>
          </div>
        </>
      )}
    </div>
  );
};

// =====================================================
const styles = {
  card: { background: 'white', padding: 20, borderRadius: 12 },
  select: { width: '100%', padding: 10, marginBottom: 10 },
  btnStart: { width: '100%', padding: 15, background: '#27ae60', color: 'white' },
  btnNext: { width: '100%', padding: 18, background: '#2980b9', color: 'white', marginTop: 15 },
  btnEnd: { marginTop: 10, background: '#e74c3c', color: 'white', padding: 10, width: '100%' },
  btnTicket: { width: '100%', padding: 15, background: '#8e44ad', color: 'white', marginTop: 10 },
  info: { marginTop: 10, background: '#e1f5fe', padding: 10 },
  counter: { flex: 1, textAlign: 'center', fontSize: 20 }
};

export default ManualETM;
