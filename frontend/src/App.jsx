import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import LiveTracking from './pages/LiveTracking';
import AdminDashboard from './pages/AdminDashboard';
import ManualETM from './pages/ManualETM';  

// ----------------------------------------------------------------------
// Future pages (enable when ready)
// import Login from './pages/Login';
// import Planner from './pages/Planner';
// ----------------------------------------------------------------------

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Navigation Header */}
        <nav style={styles.nav}>
          <div style={styles.logo}>MOOVIT-CHALO</div>

          <div style={styles.links}>
            <Link to="/" style={styles.link}>Live Tracking</Link>
            <Link to="/planner" style={styles.link}>Trip Planner</Link>
            <Link to="/admin" style={styles.link}>Admin Panel</Link>
            <Link to="/login" style={styles.link}>Login</Link>
          </div>
        </nav>

        {/* Route Definitions */}
        <Routes>
          {/* Home */}
          <Route path="/" element={<LiveTracking />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/etm" element={<ManualETM />} />

          {/* Placeholders */}
          <Route
            path="/planner"
            element={
              <div style={{ padding: 20 }}>
                <h2>Trip Planner (Coming Soon)</h2>
              </div>
            }
          />

          <Route
            path="/login"
            element={
              <div style={{ padding: 20 }}>
                <h2>Login Page (Coming Soon)</h2>
              </div>
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

// ----------------------------------------------------------------------
// Simple internal styles (temporary)
// ----------------------------------------------------------------------
const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#1a1a1a',
    color: 'white',
  },
  logo: {
    fontWeight: 'bold',
    fontSize: '1.2rem',
    color: '#4CAF50', // Chalo Green
  },
  links: {
    display: 'flex',
    gap: '20px',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '0.9rem',
  },
};

export default App;
