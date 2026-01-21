import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// ================= IMPORT PAGES =================
import Login from './pages/Login';
import LiveTracking from './pages/LiveTracking';
import TripPlanner from './pages/TripPlanner';
import ManualETM from './pages/ManualETM';
import AdminDashboard from './pages/AdminDashboard';
import BusAllocation from './pages/BusAllocation';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // =================================================
  // 1. CHECK LOGIN STATUS ON PAGE LOAD
  // =================================================
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // =================================================
  // 2. LOGOUT
  // =================================================
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>;
  }

  // Role helper (case-insensitive safe)
  const isRole = (role) => user?.role?.toUpperCase() === role;

  return (
    <Router>
      {/* ================= NAVBAR ================= */}
      {user && (
        <nav style={navStyles.nav}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            🚌 BUS KAR BAHI 
            <span style={navStyles.roleBadge}>{user.role}</span>
          </div>

          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {/* ADMIN */}
            {isRole('ADMIN') && (
              <a href="/admin" style={navStyles.link}>Dashboard</a>
            )}

            {/* USER + ADMIN */}
            {(isRole('USER') || isRole('ADMIN')) && (
              <a href="/plan" style={navStyles.link}>Trip Planner</a>
            )}

            {/* EVERYONE */}
            <a href="/track" style={navStyles.link}>Live Map</a>

            {/* DRIVER */}
            {isRole('DRIVER') && (
              <a href="/etm" style={navStyles.driverLink}>
                🎮 Driver Console
              </a>
            )}

            <button onClick={handleLogout} style={navStyles.logoutBtn}>
              Logout
            </button>
          </div>
        </nav>
      )}

      {/* ================= ROUTES ================= */}
      <Routes>
        {/* NOT LOGGED IN */}
        {!user ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            {/* -------- DEFAULT REDIRECT -------- */}
            <Route
              path="/"
              element={
                isRole('DRIVER') ? <Navigate to="/etm" /> :
                isRole('ADMIN')  ? <Navigate to="/admin" /> :
                <Navigate to="/plan" />
              }
            />

            {/* -------- ADMIN ONLY -------- */}
            <Route
              path="/admin"
              element={
                isRole('ADMIN') ? <AdminDashboard /> : <Navigate to="/" />
              }
            />

            <Route
              path="/allocate"
              element={
                isRole('ADMIN') ? <BusAllocation /> : <Navigate to="/" />
              }
            />

            {/* -------- USER + ADMIN -------- */}
            <Route
              path="/plan"
              element={
                (isRole('USER') || isRole('ADMIN'))
                  ? <TripPlanner />
                  : <Navigate to="/" />
              }
            />

            {/* -------- EVERYONE -------- */}
            <Route path="/track" element={<LiveTracking />} />

            {/* -------- DRIVER ONLY -------- */}
            <Route
              path="/etm"
              element={
                isRole('DRIVER') ? <ManualETM /> : <Navigate to="/" />
              }
            />
          </>
        )}
      </Routes>
    </Router>
  );
}

// ================= STYLES =================
const navStyles = {
  nav: {
    padding: '15px 30px',
    background: '#2c3e50',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
  },
  roleBadge: {
    fontSize: '12px',
    background: 'rgba(255,255,255,0.2)',
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '10px'
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  driverLink: {
    color: '#f1c40f',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: 'bold',
    border: '1px solid #f1c40f',
    padding: '5px 10px',
    borderRadius: '5px'
  },
  logoutBtn: {
    background: '#e74c3c',
    border: 'none',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default App;
