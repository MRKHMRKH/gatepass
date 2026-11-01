import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import logo from './unilogo.jpg';
import StudentGate from './components/StudentGate';
import GateDesk from './components/GateDesk';
import Dashboard from './components/Dashboard';
import AdminLogin from './components/AdminLogin';

function NavigationBar({ isAdmin, onLogout }) {
  const location = useLocation();

  const getBtnStyle = (path) => {
    const isActive = location.pathname === path;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none',
      padding: '8px 18px',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      backgroundColor: isActive ? '#2563eb' : 'transparent',
      color: isActive ? '#ffffff' : '#94a3b8',
      boxShadow: isActive ? '0 2px 10px rgba(37, 99, 235, 0.4)' : 'none'
    };
  };

  return (
    <nav style={headerStyles.navBar}>
      {/* Brand Identity */}
      <div style={headerStyles.leftSection}>
        <div style={headerStyles.logoBox}>
          <img src={logo} alt="Gate Logo" style={headerStyles.logoImg} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={headerStyles.brandTitle}>
              ABC <strong>STATE UNIVERSITY</strong>
            </span>
            <span style={headerStyles.campusSecureBadge}>CAMPUS SECURE</span>
          </div>
          <div style={headerStyles.brandSubtitle}>
            Visitor &amp; Campus Gate Access System
          </div>
        </div>
      </div>

      {/* Navigation Buttons + Gate 01 Status */}
      <div style={headerStyles.rightSection}>
        <div style={headerStyles.navLinks}>
          {/* Clicking Student tab automatically logs out admin */}
          <Link to="/" onClick={isAdmin ? onLogout : undefined} style={getBtnStyle('/')}>
            🎓 Student In / Out
          </Link>

          {/* Clicking Visitor tab automatically logs out admin */}
          <Link to="/visitors" onClick={isAdmin ? onLogout : undefined} style={getBtnStyle('/visitors')}>
            👤 Visitors Section
          </Link>

          {/* Dashboard tab */}
          <Link to={isAdmin ? "/dashboard" : "/login"} style={getBtnStyle(isAdmin ? '/dashboard' : '/login')}>
            📊Dashboard
          </Link>
        </div>

        <div style={headerStyles.divider} />

        <div style={headerStyles.gateStatusBox}>
          <span style={headerStyles.pulsingDot} />
          <div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#f8fafc', lineHeight: 1.1 }}>Gate 01</div>
            <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '500' }}>Active</div>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  });

  const handleLoginSuccess = () => {
    localStorage.setItem('isAdminLoggedIn', 'true');
    setIsAdmin(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    setIsAdmin(false);
  };

  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <NavigationBar isAdmin={isAdmin} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<StudentGate />} />
          <Route path="/visitors" element={<GateDesk />} />
          <Route 
            path="/login" 
            element={isAdmin ? <Navigate to="/dashboard" replace /> : <AdminLogin onLoginSuccess={handleLoginSuccess} />} 
          />
          <Route 
            path="/dashboard" 
            element={isAdmin ? <Dashboard onLogout={handleLogout} /> : <Navigate to="/login" replace />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

const headerStyles = {
  navBar: {
    backgroundColor: '#070d19',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '12px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  logoBox: {
    width: '42px',
    height: '42px',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
  },
  logoImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: '500',
    letterSpacing: '0.3px'
  },
  campusSecureBadge: {
    fontSize: '10px',
    fontWeight: '700',
    color: '#60a5fa',
    border: '1px solid #1d4ed8',
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    padding: '2px 7px',
    borderRadius: '6px',
    letterSpacing: '0.5px'
  },
  brandSubtitle: {
    fontSize: '12px',
    color: '#38bdf8',
    fontWeight: '400',
    marginTop: '2px',
    letterSpacing: '0.2px'
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  navLinks: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  divider: {
    height: '24px',
    width: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
  },
  gateStatusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  pulsingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 10px #10b981'
  }
};