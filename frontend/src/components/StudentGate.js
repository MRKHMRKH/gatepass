import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import logo from './cutngate.jpg';

// Helper function embedded directly
function calculateAcademicYear(joinedYear) {
  const join = parseInt(joinedYear, 10);
  if (isNaN(join)) return joinedYear || '-';

  const now = new Date();
  const currentYear = now.getFullYear();
  // June is month index 5 (0-indexed: Jan=0, Feb=1, ... May=4, Jun=5)
  const isPastJune1 = now.getMonth() >= 5;

  const effectiveYear = isPastJune1 ? currentYear : currentYear - 1;
  const yearDiff = effectiveYear - join + 1;

  if (yearDiff <= 0) return 'Incoming';
  if (yearDiff === 1) return '1st Year';
  if (yearDiff === 2) return '2nd Year';
  if (yearDiff === 3) return '3rd Year';
  if (yearDiff === 4) return '4th Year';
  if (yearDiff === 5) return '5th Year';
  return 'Graduated / Alum';
}

export default function StudentGate() {
  const [regNo, setRegNo] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const inputRef = useRef(null);
  const audioCtxRef = useRef(null);
  const hideTimerRef = useRef(null);

  // Live ticking clock
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Keep input field permanently focused
  const keepFocus = () => {
    if (inputRef.current) inputRef.current.focus();
  };

  useEffect(() => {
    keepFocus();
    window.addEventListener('click', keepFocus);
    return () => {
      window.removeEventListener('click', keepFocus);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const playBeep = (isSuccess) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 250, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio fallback
    }
  };

  const handleRegisterSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanReg = regNo.trim().toUpperCase();
    if (!cleanReg) return;

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await axios.post('http://localhost:5000/api/student/gate-toggle', {
        register_number: cleanReg
      });
      playBeep(true);
      setCurrentStudent(res.data.student);
      setRegNo('');

      hideTimerRef.current = setTimeout(() => {
        setCurrentStudent(null);
      }, 3000);

    } catch (err) {
      playBeep(false);
      setErrorMessage(err.response?.data?.error || 'Student not recognized.');

      hideTimerRef.current = setTimeout(() => {
        setErrorMessage('');
      }, 4000);

    } finally {
      setLoading(false);
      setTimeout(keepFocus, 10);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header Section */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Student Gate Terminal</h1>
            <p style={styles.subtitle}>Type your register number and press Enter.</p>
            <div style={styles.curfewNotice}>
              ⚠️ <strong>Notice:</strong> Students must enter the campus before 10 PM.
            </div>
          </div>
          <span style={styles.badgeLive}>IN/OUT</span>
        </div>

        {/* Live Clock Strip */}
        <div style={styles.clockStrip}>
          <div style={styles.clockIconBox}>🕒</div>
          <div>
            <div style={styles.clockTime}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <div style={styles.clockDate}>
              {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={styles.pulsingDot} />
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#166534', letterSpacing: '0.4px' }}>LIVE TIME</span>
          </div>
        </div>

        {/* Input Form Box */}
        <form onSubmit={handleRegisterSubmit} style={styles.formBox}>
          <label style={styles.inputLabel}>STUDENT REGISTER NUMBER (PRESS ENTER)</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. P241343"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              onBlur={keepFocus}
              disabled={loading}
              autoComplete="off"
              style={styles.textInput}
            />
            <button type="submit" disabled={loading} style={styles.btnSubmit}>
              {loading ? '...' : 'Process ⭢'}
            </button>
          </div>
        </form>

        {errorMessage && <div style={styles.errorBanner}>⚠️ {errorMessage}</div>}

        {/* Render student card ONLY when details exist */}
        {currentStudent && (
          <div style={{
            ...styles.studentCard,
            borderColor: currentStudent.status === 'IN' ? '#86efac' : '#fde047',
            backgroundColor: currentStudent.status === 'IN' ? '#f0fdf4' : '#fefce8'
          }}>
            <div style={styles.photoContainer}>
              <img
                src={currentStudent.photo_url || 'https://via.placeholder.com/150'}
                alt={currentStudent.name}
                style={styles.studentPhoto}
              />
              <span style={{
                ...styles.statusTag,
                backgroundColor: currentStudent.status === 'IN' ? '#16a34a' : '#ca8a04'
              }}>
                {currentStudent.status === 'IN' ? 'CHECKED IN' : 'CHECKED OUT'}
              </span>
            </div>

            <div style={styles.detailsContainer}>
              <h2 style={styles.studentName}>{currentStudent.name}</h2>
              <div style={styles.regNumber}>{currentStudent.register_number}</div>

              <div style={styles.gridInfo}>
                <div>
                  <span style={styles.infoLabel}>Department:</span>
                  <span style={styles.infoVal}>{currentStudent.department}</span>
                </div>
                <div>
                  <span style={styles.infoLabel}>Year of Study:</span>
                  <span style={styles.infoVal}>
                    {calculateAcademicYear(currentStudent.year)} ({currentStudent.year} Batch)
                  </span>
                </div>
                <div>
                  <span style={styles.infoLabel}>Phone:</span>
                  <span style={styles.infoVal}>{currentStudent.phone || '-'}</span>
                </div>
                <div>
                  <span style={styles.infoLabel}>Gate Out Time:</span>
                  <span style={styles.infoVal}>
                    {currentStudent.gate_out_time ? new Date(currentStudent.gate_out_time).toLocaleTimeString() : '-'}
                  </span>
                </div>
                <div>
                  <span style={styles.infoLabel}>Gate In Time:</span>
                  <span style={styles.infoVal}>
                    {currentStudent.gate_in_time ? new Date(currentStudent.gate_in_time).toLocaleTimeString() : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '40px 20px',
    minHeight: 'calc(100vh - 72px)',
    backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.75)), url(${logo})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '820px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.28)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' },
  title: { fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' },
  subtitle: { fontSize: '13px', color: '#64748b', margin: '0 0 6px 0' },
  curfewNotice: {
    display: 'inline-block',
    fontSize: '12px',
    color: '#b45309',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    padding: '4px 10px',
    borderRadius: '6px',
    marginTop: '4px',
    fontWeight: '500'
  },
  badgeLive: { backgroundColor: '#ecfdf5', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '11px', border: '1px solid #a7f3d0' },
  clockStrip: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '10px 16px',
    marginBottom: '20px'
  },
  clockIconBox: { fontSize: '22px', lineHeight: 1 },
  clockTime: { fontFamily: 'monospace', fontSize: '18px', fontWeight: '800', color: '#14532d', lineHeight: 1.1 },
  clockDate: { fontSize: '12px', fontWeight: '600', color: '#15803d', marginTop: '2px' },
  pulsingDot: { width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 8px #22c55e' },
  formBox: { backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '0' },
  inputLabel: { display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px', letterSpacing: '0.5px' },
  textInput: { flex: 1, padding: '14px 16px', borderRadius: '8px', border: '2px solid #3b82f6', fontSize: '18px', fontWeight: '700', outline: 'none' },
  btnSubmit: { backgroundColor: '#0f172a', color: 'white', border: 'none', padding: '0 28px', borderRadius: '8px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' },
  errorBanner: { padding: '12px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', marginTop: '16px', fontWeight: '600' },
  studentCard: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    borderRadius: '14px',
    border: '2px solid',
    marginTop: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
  },
  photoContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  studentPhoto: { width: '130px', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #cbd5e1' },
  statusTag: { color: 'white', fontSize: '12px', fontWeight: '700', padding: '4px 12px', borderRadius: '12px' },
  detailsContainer: { flex: 1 },
  studentName: { margin: '0 0 4px 0', fontSize: '22px', color: '#0f172a', fontWeight: '800' },
  regNumber: { fontFamily: 'monospace', fontSize: '16px', fontWeight: '700', color: '#2563eb', marginBottom: '16px' },
  gridInfo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' },
  infoLabel: { color: '#64748b', fontWeight: '600', marginRight: '6px' },
  infoVal: { color: '#1e293b', fontWeight: '700' }
};