import React, { useState } from 'react';
import { apiUrl } from '../services/api';

const AUTH_URL = apiUrl('/auth');

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'USER'
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);

    const endpoint = isLogin ? '/login' : '/register';

    try {
      const res = await fetch(`${AUTH_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || 'Authentication failed');
        setLoading(false);
        return;
      }

      if (isLogin) {
        localStorage.setItem('user', JSON.stringify(data.user));

        const role = data.user?.role?.toUpperCase();
        const redirectPath = role === 'DRIVER' ? '/etm' : role === 'ADMIN' ? '/admin' : '/plan';
        window.location.href = redirectPath;
      } else {
        setIsLogin(true);
        setNotice('Account created. Please sign in.');
        setLoading(false);
      }
    } catch (err) {
      setError('Server error. Is the backend running?');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="auth-hero__brand">
            <span className="auth-badge">Smart Transit Suite</span>
            <h1>Bus Kar Bhai</h1>
            <p>
              Dispatch teams, drivers, and passengers on one reliable platform.
              Live tracking, alerts, and ETM tools in seconds.
            </p>
          </div>

          <div className="auth-highlights">
            <div className="auth-highlight">
              <span>Real-Time</span>
              <strong>Live Fleet Monitoring</strong>
              <p>Track buses, crowding, and delays with a single dashboard.</p>
            </div>
            <div className="auth-highlight">
              <span>Operations</span>
              <strong>Driver + ETM Console</strong>
              <p>Issue tickets, manage stops, and stay coordinated with HQ.</p>
            </div>
            <div className="auth-highlight">
              <span>Insights</span>
              <strong>Demand Intelligence</strong>
              <p>See congestion hotspots and allocation suggestions instantly.</p>
            </div>
          </div>
        </div>

        <div className="auth-card auth-card--wide">
          <div className="auth-header">
            <div className="auth-eyebrow">{isLogin ? 'Welcome Back' : 'Create Your Account'}</div>
            <h2 className="auth-title">Sign in to continue</h2>
            <p className="auth-subtitle">
              {isLogin ? 'Access your control center and live operations.' : 'Join the smart transit network today.'}
            </p>
          </div>

          {error && <div className="form-alert form-alert--error">{error}</div>}
          {notice && <div className="form-alert form-alert--success">{notice}</div>}

          <form onSubmit={handleSubmit} className="form-stack">
            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    name="name"
                    placeholder="e.g. John Doe"
                    className="modern-input"
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select name="role" className="modern-select" onChange={handleChange}>
                    <option value="USER">Passenger</option>
                    <option value="DRIVER">Bus Driver</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="name@example.com"
                className="modern-input"
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-action">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  className="modern-input"
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="form-hint">Use at least 6 characters for a strong password.</div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="form-footer">
            <span>{isLogin ? 'New to the app?' : 'Already have an account?'}</span>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setNotice('');
              }}
            >
              {isLogin ? 'Create account' : 'Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
