import React, { useState, useEffect } from 'react';

const TripPlanner = () => {
  // Location State
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState('');

  // Search State
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedStopId, setSelectedStopId] = useState(null); // Actual ID needed for backend
  
  // Results State
  const [plans, setPlans] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. Get GPS
  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setStatus("Geolocation not supported");
      return;
    }
    setStatus("Locating...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus("Location Found ✅");
      },
      () => setStatus("Location access denied ❌")
    );
  };

  // 2. Auto-Complete Logic
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    // Debounce to prevent too many API calls
    const timer = setTimeout(() => {
        fetch(`http://127.0.0.1:8000/trip/search-stops?q=${query}`)
        .then(res => res.json())
        .then(data => setSuggestions(data))
        .catch(err => console.log("Search error", err));
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // 3. Select a Stop
  const handleSelectStop = (stop) => {
    setQuery(stop.name);
    setSelectedStopId(stop.id);
    setSuggestions([]); // Hide dropdown
  };

  // 4. Find Route
  const findRoute = async () => {
    if (!coords || !selectedStopId) {
      alert("Please get location and select a destination from the list.");
      return;
    }
    setLoading(true);
    setPlans(null); // Clear previous results while loading
    try {
        const res = await fetch(`http://127.0.0.1:8000/trip/plan?start_lat=${coords.lat}&start_lon=${coords.lon}&dest_stop_id=${selectedStopId}`);
        const data = await res.json();
        
        if (res.ok) {
            setPlans(data);
        } else {
            alert(data.detail || "Error finding route");
        }
    } catch (err) {
        alert("Server Connection Error");
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{textAlign: 'center', color: '#2c3e50'}}>🗺️ Smart Trip Planner</h1>
      
      <div style={styles.card}>
        {/* Step 1: Location */}
        <div style={{ marginBottom: '15px' }}>
          <label style={styles.label}>1. Your Location</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              readOnly 
              value={coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : ''} 
              placeholder="Waiting for GPS..." 
              style={styles.input} 
            />
            <button onClick={getMyLocation} style={styles.btnSmall}>📍 Locate</button>
          </div>
          <small style={{color: status.includes('Found') ? 'green' : '#666'}}>{status}</small>
        </div>

        {/* Step 2: Searchable Dropdown */}
        <div style={{ marginBottom: '15px', position: 'relative' }}>
          <label style={styles.label}>2. Where to?</label>
          <input 
            type="text"
            placeholder="Search stop (e.g., Jayanagar)"
            value={query}
            onChange={(e) => {
                setQuery(e.target.value);
                setSelectedStopId(null); // Reset selection on edit
            }}
            style={styles.input}
          />
          
          {/* Suggestions List */}
          {suggestions.length > 0 && (
            <div style={styles.dropdown}>
              {suggestions.map(stop => (
                <div 
                  key={stop.id} 
                  style={styles.dropdownItem}
                  onClick={() => handleSelectStop(stop)}
                >
                  📍 {stop.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={findRoute} style={styles.btnBig} disabled={loading}>
          {loading ? "Calculating..." : "🚀 Find Best Route"}
        </button>
      </div>

      {/* RESULTS DISPLAY */}
      {plans && (
        <div style={{ marginTop: '20px' }}>
          {/* FIXED LINE BELOW: Changed plans.end to plans.destination */}
          <div style={styles.header}>
             Trip: {plans.start} ➝ {plans.destination}
          </div>
          
          {plans.plans.length === 0 ? (
             <div style={styles.noRoute}>
                {plans.message || "No route found. Try a different stop."}
             </div>
          ) : (
            plans.plans.map((plan, idx) => (
              <div key={idx} style={styles.resultCard}>
                <span style={styles.badge}>{plan.type}</span>
                
                {plan.segments.map((seg, i) => (
                    <div key={i} style={{marginBottom:'10px', display:'flex', alignItems:'center'}}>
                        <div style={{
                           minWidth: '30px', 
                           textAlign: 'center', 
                           fontSize: '20px', 
                           marginRight: '10px'
                        }}>
                            {seg.mode === 'WALK' ? '🚶' : seg.mode === 'BUS' ? '🚌' : '🔄'}
                        </div>
                        <div style={{fontSize: '15px', color: '#333'}}>
                           {seg.instruction}
                        </div>
                    </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
  card: { background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
  label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' },
  input: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '16px', boxSizing: 'border-box' },
  btnSmall: { padding: '0 15px', background: '#34495e', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  btnBig: { width: '100%', padding: '15px', background: '#2ecc71', color: 'white', border: 'none', borderRadius: '6px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
  dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ddd', borderRadius: '6px', zIndex: 10, maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  dropdownItem: { padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer' },
  header: { background: '#3498db', color: 'white', padding: '10px', borderRadius: '5px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' },
  noRoute: { padding:'15px', background:'#fee', color:'#c0392b', borderRadius:'5px', border: '1px solid #f5c6cb' },
  resultCard: { background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px', borderLeft: '5px solid #2ecc71', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', position: 'relative' },
  badge: { position: 'absolute', top: '10px', right: '10px', background: '#e67e22', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }
};

export default TripPlanner;