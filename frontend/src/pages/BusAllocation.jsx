import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BusAllocation = () => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const preSelectedRoute = queryParams.get('routeId'); // Get from URL if available

  const [crowdedRoutes, setCrowdedRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);

  // Selection State
  const [selectedRoute, setSelectedRoute] = useState(preSelectedRoute || '');
  const [selectedBus, setSelectedBus] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [msg, setMsg] = useState('');

  // 1. Fetch Data on Load
  useEffect(() => {
    // Get Routes
    fetch('http://127.0.0.1:8000/admin/crowded-routes')
      .then(res => res.json())
      .then(data => {
          // Format for dropdown
          setCrowdedRoutes(data.map(r => ({id: r[0], name: `${r[1]} (${r[2]} -> ${r[3]})`})));
      });

    // Get Idle Resources
    fetch('http://127.0.0.1:8000/admin/idle-resources')
      .then(res => res.json())
      .then(data => {
        setBuses(data.buses);
        setDrivers(data.drivers);
      });
  }, []);

  // 2. Handle Allocation
  const handleAllocate = async () => {
    if(!selectedRoute || !selectedBus || !selectedDriver) {
        alert("Please select all fields");
        return;
    }

    const payload = {
        route_id: parseInt(selectedRoute),
        bus_id: selectedBus,
        driver_id: parseInt(selectedDriver)
    };

    const res = await fetch('http://127.0.0.1:8000/admin/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if(res.ok) {
        setMsg("✅ Allocation Successful! Driver Notified.");
        // Refresh Lists
        setBuses(buses.filter(b => b.id !== selectedBus));
        setDrivers(drivers.filter(d => d.id !== selectedDriver));
        setSelectedBus('');
        setSelectedDriver('');
    } else {
        alert("Error allocating bus");
    }
  };

  return (
    <div style={{ padding: '30px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1>⚡ Dynamic Bus Allocation</h1>
      <p style={{color:'#666'}}>Assign idle resources to handle crowd surges instantly.</p>
      
      <div style={styles.card}>
        
        {/* Route Selection */}
        <div style={styles.group}>
            <label style={styles.label}>⚠️ Select Crowded Route</label>
            <select style={styles.select} value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)}>
                <option value="">-- Choose Route --</option>
                {crowdedRoutes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                ))}
            </select>
        </div>

        {/* Bus Selection */}
        <div style={styles.group}>
            <label style={styles.label}>🚌 Select Idle Bus</label>
            <select style={styles.select} value={selectedBus} onChange={e => setSelectedBus(e.target.value)}>
                <option value="">-- Choose Bus --</option>
                {buses.map(b => (
                    <option key={b.id} value={b.id}>{b.id} (Cap: {b.capacity})</option>
                ))}
            </select>
        </div>

        {/* Driver Selection */}
        <div style={styles.group}>
            <label style={styles.label}>👤 Select Idle Driver</label>
            <select style={styles.select} value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
                <option value="">-- Choose Driver --</option>
                {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
        </div>

        <button onClick={handleAllocate} style={styles.btn}>
            🚀 DEPLOY BUS NOW
        </button>

        {msg && <div style={styles.success}>{msg}</div>}

      </div>
    </div>
  );
};

const styles = {
  card: { background: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  group: { marginBottom: '20px' },
  label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#2c3e50' },
  select: { width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid #ccc', fontSize: '16px' },
  btn: { width: '100%', padding: '15px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  success: { marginTop: '20px', padding: '10px', background: '#d4edda', color: '#155724', borderRadius: '5px', textAlign: 'center' }
};

export default BusAllocation;