import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ⚠️ UPDATE YOUR IP IF TESTING ON MOBILE
const API_URL = "http://127.0.0.1:8000/auth"; 

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true); // Toggle State
  
  // Form State (Updated for Email)
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '', 
    name: '', 
    role: 'USER' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/login' : '/register';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Authentication failed");
        setLoading(false);
        return;
      }

      if (isLogin) {
        // SUCCESS: Save user
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Redirect based on Role
        if (data.user.role === 'DRIVER') {
            navigate('/driver'); 
        } else {
            navigate('/plan');   
        }
        window.location.reload(); 
      } else {
        alert("Account Created! Please Login.");
        setIsLogin(true); 
        setLoading(false);
      }

    } catch (err) {
      setError("Server Error. Is Backend Running?");
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        
        {/* Header Section */}
        <div style={styles.header}>
          <div style={{fontSize: '40px', marginBottom: '10px'}}>🚍</div>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>BUS KAR BAHI </h2>
          <p style={{ color: '#7f8c8d', margin: '5px 0' }}>
            {isLogin ? "Welcome Back, Traveler!" : "Join the Smart Transit Network"}
          </p>
        </div>

        {error && <div style={styles.error}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          
          {/* Sign Up Fields */}
          {!isLogin && (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Full Name</label>
                <input 
                  name="name" 
                  placeholder="e.g. John Doe"
                  style={styles.input} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>I am a:</label>
                <select name="role" style={styles.select} onChange={handleChange}>
                  <option value="USER">Passenger</option>
                  <option value="DRIVER">Bus Driver</option>
                </select>
              </div>
            </>
          )}

          {/* Common Fields */}
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              name="email" 
              placeholder="name@example.com"
              style={styles.input} 
              onChange={handleChange} 
              required 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" 
              name="password" 
              placeholder="••••••"
              style={styles.input} 
              onChange={handleChange} 
              required 
            />
          </div>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? "Processing..." : (isLogin ? "LOGIN 🔓" : "CREATE ACCOUNT ✨")}
          </button>
        </form>

        {/* Toggle Link */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
          {isLogin ? "New to the app? " : "Already have an account? "}
          <span 
            style={styles.link}
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? "Sign Up" : "Login"}
          </span>
        </div>

      </div>
    </div>
  );
};

// Modern CSS Styles
const styles = {
  container: { 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  card: { 
    background: 'rgba(255, 255, 255, 0.95)', 
    padding: '40px', 
    borderRadius: '20px', 
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)', 
    width: '100%',
    maxWidth: '380px',
    backdropFilter: 'blur(10px)'
  },
  header: { textAlign: 'center', marginBottom: '30px' },
  inputGroup: { marginBottom: '15px' },
  label: { display: 'block', fontSize: '13px', color: '#666', marginBottom: '5px', fontWeight: '600' },
  input: { 
    width: '100%', padding: '12px', borderRadius: '8px', 
    border: '1px solid #ddd', fontSize: '15px', 
    boxSizing: 'border-box', transition: '0.3s',
    outline: 'none'
  },
  select: {
    width: '100%', padding: '12px', borderRadius: '8px', 
    border: '1px solid #ddd', fontSize: '15px', 
    boxSizing: 'border-box', background: 'white'
  },
  btn: { 
    width: '100%', padding: '14px', background: '#2c3e50', 
    color: 'white', border: 'none', borderRadius: '8px', 
    fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', 
    marginTop: '10px', transition: '0.3s',
    boxShadow: '0 4px 15px rgba(44, 62, 80, 0.3)'
  },
  error: { 
    background: '#ffebee', color: '#c62828', padding: '12px', 
    borderRadius: '8px', marginBottom: '20px', fontSize: '14px', 
    textAlign: 'center', border: '1px solid #ffcdd2'
  },
  link: { color: '#007bff', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }
};

export default Login;