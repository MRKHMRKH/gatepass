import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import logo from './cutngate.jpg';

export default function GateDesk() {
  const [visitorData, setVisitorData] = useState({
    name: '',
    phone: '',
    email: '',
    accompanying_persons: '',
    purpose: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedPass, setGeneratedPass] = useState(null);

  const [manualToken, setManualToken] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const scannerRef = useRef(null);
  const lastScannedRef = useRef('');

  const handleVisitorRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/register', visitorData);
      setGeneratedPass(res.data);
      setVisitorData({ name: '', phone: '', email: '', accompanying_persons: '', purpose: '' });
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || 'Registration failed.'));
    }
    setLoading(false);
  };

  const handleVisitorCheckout = async (token) => {
    const cleanToken = token ? token.trim().toUpperCase() : '';
    if (!cleanToken || cleanToken === lastScannedRef.current) return;
    lastScannedRef.current = cleanToken;

    try {
      const res = await axios.post('http://localhost:5000/api/visitor/scan-out', { token: cleanToken });
      setIsSuccess(true);
      setScanMessage(`✅ ${res.data.message}`);
      setManualToken('');
    } catch (err) {
      setIsSuccess(false);
      setScanMessage(`❌ ${err.response?.data?.error || 'Checkout failed'}`);
    }

    setTimeout(() => {
      setScanMessage('');
      lastScannedRef.current = '';
    }, 3000);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    setScanMessage('');
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('visitor-qr-reader');
    }
    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => handleVisitorCheckout(decodedText)
      );
    } catch (err) {
      console.error('Camera start error:', err);
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error(err);
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div style={styles.pageContainer}>
      {/* 1. VISITOR CHECK-IN */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Visitor Check-In (Gate IN)</h2>
          <p style={styles.cardSubtitle}>
            Generate digital gate pass and QR code, then send to your entered email address. Please enter a valid email.
          </p>
        </div>

        {generatedPass && (
          <div style={styles.passBox}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '700', color: '#166534' }}>
              ✅ Pass Generated! Token: <span style={{ fontFamily: 'monospace', fontSize: '18px' }}>{generatedPass.token}</span>
            </p>
            <img src={generatedPass.qrCode} alt="Visitor QR" style={{ width: '130px', height: '130px' }} />
            <button onClick={() => setGeneratedPass(null)} style={styles.btnSmall}>Dismiss</button>
          </div>
        )}

        <form onSubmit={handleVisitorRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={styles.label}>Full Name *</label>
            <input
              style={styles.input}
              type="text"
              placeholder="John Doe"
              value={visitorData.name}
              onChange={e => setVisitorData({ ...visitorData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={styles.label}>Phone Number</label>
              <input
                style={styles.input}
                type="tel"
                placeholder="+91 9876543210"
                value={visitorData.phone}
                onChange={e => setVisitorData({ ...visitorData, phone: e.target.value })}
              />
            </div>
            <div>
              <label style={styles.label}>Email Address *</label>
              <input
                style={styles.input}
                type="email"
                placeholder="john@example.com"
                value={visitorData.email}
                onChange={e => setVisitorData({ ...visitorData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label style={styles.label}>Purpose of Visit Detailed*</label>
            <input
              style={styles.input}
              type="text"
              placeholder=" Meeting / Cleaning / Delivery "
              value={visitorData.purpose}
              onChange={e => setVisitorData({ ...visitorData, purpose: e.target.value })}
              required
            />
          </div>

          <div>
            <label style={styles.label}>Accompanying Persons</label>
            <input
              style={styles.input}
              type="text"
              placeholder="None or names"
              value={visitorData.accompanying_persons}
              onChange={e => setVisitorData({ ...visitorData, accompanying_persons: e.target.value })}
            />
          </div>

          <button type="submit" style={styles.btnPrimary} disabled={loading}>
            {loading ? 'Generating...' : 'Register Visitor & Issue Pass'}
          </button>
        </form>
      </div>

      {/* 2. VISITOR QR CODE CHECK-OUT */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Visitor Check-Out (Gate OUT)</h2>
          <p style={styles.cardSubtitle}>Scan pass QR code or enter token manually to check out.</p>
        </div>

        <div style={styles.cameraBox}>
          <div id="visitor-qr-reader" style={{ width: '100%', height: '100%' }}></div>
          {!isCameraActive && (
            <div style={styles.cameraOverlay}>
              <button style={styles.btnPrimary} onClick={startCamera}>📷 Activate QR Scanner</button>
            </div>
          )}
          {isCameraActive && (
            <button style={styles.stopBtn} onClick={stopCamera}>Stop Camera</button>
          )}
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={styles.label}>Or Enter Token Manually</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g., 3F8A1B2C"
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
            />
            <button style={styles.btnDark} onClick={() => handleVisitorCheckout(manualToken)}>Exit</button>
          </div>
        </div>

        {scanMessage && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: isSuccess ? '#ecfdf5' : '#fef2f2',
            color: isSuccess ? '#065f46' : '#991b1b',
            border: `1px solid ${isSuccess ? '#a7f3d0' : '#fecaca'}`,
            textAlign: 'center',
            fontWeight: '600'
          }}>
            {scanMessage}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '28px',
    padding: '36px 20px',
    flexWrap: 'wrap',
    minHeight: '100vh',                 // Changed from calc(100vh - 72px) to 100vh
    margin: 0,
    boxSizing: 'border-box',
    backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.75)), url(${logo})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '30px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.28)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxSizing: 'border-box',
    alignSelf: 'flex-start'
  },
  cardHeader: { marginBottom: '20px' },
  cardTitle: { margin: '0 0 6px 0', fontSize: '18px', fontWeight: '700', color: '#0f172a' },
  cardSubtitle: { margin: 0, fontSize: '13px', color: '#64748b' },
  label: { fontSize: '12px', fontWeight: '600', color: '#334155', display: 'block', marginBottom: '6px' },
  input: { width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  btnPrimary: { backgroundColor: '#2563eb', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', width: '100%' },
  btnDark: { backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  btnSmall: { backgroundColor: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginTop: '6px' },
  cameraBox: { height: '240px', backgroundColor: '#0f172a', borderRadius: '12px', overflow: 'hidden', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  cameraOverlay: { position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)' },
  stopBtn: { position: 'absolute', top: '10px', right: '10px', backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', zIndex: 10 },
  passBox: { backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '16px', marginBottom: '18px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }
};