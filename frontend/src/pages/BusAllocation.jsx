import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiUrl } from '../services/api';

const BusAllocation = () => {
  const { search } = useLocation();
  const queryParams = new URLSearchParams(search);
  const preSelectedRoute = queryParams.get('routeId');

  const [crowdedRoutes, setCrowdedRoutes] = useState([]);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [selectedRoute, setSelectedRoute] = useState(preSelectedRoute || '');
  const [selectedBus, setSelectedBus] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(apiUrl('/admin/crowded-routes'))
      .then((res) => res.json())
      .then((data) => {
        setCrowdedRoutes(data.map((r) => ({
          id: r[0],
          name: `${r[1]} (${r[2]} -> ${r[3]})`
        })));
      });

    fetch(apiUrl('/admin/idle-resources'))
      .then((res) => res.json())
      .then((data) => {
        setBuses(data.buses);
        setDrivers(data.drivers);
      });
  }, []);

  const handleAllocate = async () => {
    if (!selectedRoute || !selectedBus || !selectedDriver) {
      alert('Please select all fields');
      return;
    }

    const payload = {
      route_id: parseInt(selectedRoute),
      bus_id: selectedBus,
      driver_id: parseInt(selectedDriver)
    };

    const res = await fetch(apiUrl('/admin/allocate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setMsg('Allocation successful. Driver notified.');
      setBuses(buses.filter((b) => b.id !== selectedBus));
      setDrivers(drivers.filter((d) => d.id !== selectedDriver));
      setSelectedBus('');
      setSelectedDriver('');
    } else {
      alert('Error allocating bus');
    }
  };

  return (
    <div className="page-container">
      <div className="section-header">
        <h1 className="page-title">Dynamic Bus Allocation</h1>
        <p className="page-subtitle">Assign idle resources to handle crowd surges quickly.</p>
      </div>

      <div className="modern-card">
        <div className="form-group">
          <label className="form-label">Select Crowded Route</label>
          <select
            className="modern-select"
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
          >
            <option value="">-- Choose Route --</option>
            {crowdedRoutes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Select Idle Bus</label>
          <select
            className="modern-select"
            value={selectedBus}
            onChange={(e) => setSelectedBus(e.target.value)}
          >
            <option value="">-- Choose Bus --</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>{b.id} (Cap: {b.capacity})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Select Idle Driver</label>
          <select
            className="modern-select"
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
          >
            <option value="">-- Choose Driver --</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <button onClick={handleAllocate} className="btn btn-danger btn-full">
          Deploy Bus Now
        </button>

        {msg && <div className="form-alert form-alert--success">{msg}</div>}
      </div>
    </div>
  );
};

export default BusAllocation;
