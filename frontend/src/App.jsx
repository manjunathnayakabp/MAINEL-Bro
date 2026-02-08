import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink } from 'react-router-dom';

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
    return <div className="page-container">Loading...</div>;
  }

  // Role helper (case-insensitive safe)
  const isRole = (role) => user?.role?.toUpperCase() === role;
  const navClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  const driverClass = ({ isActive }) => `driver-link${isActive ? ' active' : ''}`;

  return (
    <Router>
      {/* ================= NAVBAR ================= */}
      {user && (
        <nav className="modern-navbar">
          <div className="navbar-content">
            <div className="brand" aria-label="Bus Kar Bhai">
              <span className="brand-icon" aria-hidden>
                BK
              </span>
              <span className="brand-text">Bus Kar Bhai</span>
              <span className="role-badge">{user.role}</span>
            </div>

            <div className="nav-links">
              {/* ADMIN */}
              {isRole('ADMIN') && (
                <NavLink to="/admin" className={navClass}>
                  Dashboard
                </NavLink>
              )}

              {/* USER + ADMIN */}
              {(isRole('USER') || isRole('ADMIN')) && (
                <NavLink to="/plan" className={navClass}>
                  Trip Planner
                </NavLink>
              )}

              {/* EVERYONE */}
              <NavLink to="/track" className={navClass}>
                Live Map
              </NavLink>

              {/* DRIVER */}
              {isRole('DRIVER') && (
                <NavLink to="/etm" className={driverClass}>
                  Driver Console
                </NavLink>
              )}

              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
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
                isRole('ADMIN') ? <Navigate to="/admin" /> :
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

export default App;
