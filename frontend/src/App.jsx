import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// --- IMPORT YOUR PAGES ---
import Login from './pages/Login';
import LiveTracking from './pages/LiveTracking';
import TripPlanner from './pages/TripPlanner';
import ManualETM from './pages/ManualETM'; 
import AdminDashboard from './pages/AdminDashboard'; // IMPORT NEW PAGE

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Check Login Status
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // 2. Logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/'; 
  };

  if (loading) return <div style={{padding:'20px'}}>Loading...</div>;

  // Helper to safely check roles (Case Insensitive)
  const isRole = (role) => user?.role?.toUpperCase() === role;

  return (
    <Router>
      {/* --- NAVBAR --- */}
      {user && (
        <nav style={navStyles.nav}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            🚌 Moovit-Chalo <span style={navStyles.roleBadge}>{user.role}</span>
          </div>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            
            {/* ADMIN LINK */}
            {isRole('ADMIN') && (
              <a href="/admin" style={navStyles.link}>Dashboard</a>
            )}

            {/* TRIP PLANNER: User & Admin */}
            {(isRole('USER') || isRole('ADMIN')) && (
              <a href="/plan" style={navStyles.link}>Trip Planner</a>
            )}

            {/* LIVE MAP: Everyone */}
            <a href="/track" style={navStyles.link}>Live Map</a>
            
            {/* DRIVER CONSOLE: Driver Only */}
            {isRole('DRIVER') && (
              <a href="/etm" style={navStyles.driverLink}>🎮 Driver Console</a>
            )}

            <button onClick={handleLogout} style={navStyles.logoutBtn}>Logout</button>
          </div>
        </nav>
      )}

      {/* --- ROUTES --- */}
      <Routes>
        
        {/* Not Logged In? -> Login Page */}
        {!user ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            {/* --- DEFAULT REDIRECTS (The Logic You Wanted) --- */}
            <Route path="/" element={
               isRole('DRIVER') ? <Navigate to="/etm" /> : 
               isRole('ADMIN')  ? <Navigate to="/admin" /> : 
               <Navigate to="/plan" />
            } />
            
            {/* --- PROTECTED ROUTES --- */}

            {/* Admin Dashboard: Only Admin */}
            <Route path="/admin" element={
              isRole('ADMIN') ? <AdminDashboard /> : <Navigate to="/" />
            } />

            {/* Plan: User & Admin */}
            <Route path="/plan" element={
              (isRole('USER') || isRole('ADMIN')) ? <TripPlanner /> : <Navigate to="/" />
            } />

            {/* Track: Everyone */}
            <Route path="/track" element={<LiveTracking />} />

            {/* ETM: Only Driver */}
            <Route path="/etm" element={
              isRole('DRIVER') ? <ManualETM /> : <Navigate to="/" />
            } />
          </>
        )}

      </Routes>
    </Router>
  );
}

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
    marginLeft: '10px',
    verticalAlign: 'middle'
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
    borderRadius: '5px',
    cursor: 'pointer'
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