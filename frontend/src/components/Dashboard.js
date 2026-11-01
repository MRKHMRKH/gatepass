import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('logs');
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [viewType, setViewType] = useState('all');

  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');

  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    name: '',
    regNumber: '',
    phone: ''
  });

  const getLatestTimestamp = (timeIn, timeOut) => {
    const tIn = timeIn ? new Date(timeIn).getTime() : 0;
    const tOut = timeOut ? new Date(timeOut).getTime() : 0;
    return Math.max(tIn, tOut);
  };

  useEffect(() => {
    Promise.all([
      axios.get('http://localhost:5000/api/visitors').catch(() => ({ data: [] })),
      axios.get('http://localhost:5000/api/student-logs').catch(() => ({ data: [] })),
      axios.get('http://localhost:5000/api/students/all').catch(() => ({ data: [] }))
    ]).then(([resVisitors, resStudentLogs, resStudents]) => {
      const visitorsFormatted = (resVisitors.data || []).map(v => {
        const latestTime = getLatestTimestamp(v.gate_in_time, v.gate_out_time);
        return {
          id: `v-${v.id}`,
          type: 'Visitor',
          name: v.name,
          identifier: v.token,
          details: v.purpose || 'Visit',
          phone: v.phone || '-',
          photo_url: null,
          time_out: v.gate_out_time,
          time_in: v.gate_in_time,
          latest_time: latestTime,
          status: v.status
        };
      });

      const studentsFormatted = (resStudentLogs.data || []).map(s => {
        const dir = s.student_directory || {};
        const latestTime = getLatestTimestamp(s.gate_in_time, s.gate_out_time);
        const dynamicYear = calculateAcademicYear(dir.year);

        return {
          id: `s-${s.id}`,
          type: 'Student',
          name: dir.name || 'Unknown',
          identifier: s.register_number,
          details: dir.department ? `${dir.department} (${dynamicYear})` : '-',
          phone: dir.phone || '-',
          photo_url: dir.photo_url || null,
          time_out: s.gate_out_time,
          time_in: s.gate_in_time,
          latest_time: latestTime,
          status: s.status
        };
      });

      // Sort strictly by latest event (IN or OUT)
      const combined = [...visitorsFormatted, ...studentsFormatted].sort(
        (a, b) => b.latest_time - a.latest_time
      );

      setRecords(combined);
      setFilteredRecords(combined);

      const studentData = resStudents.data || [];
      setAllStudents(studentData);
      setFilteredStudents(studentData);
    });
  }, []);

  // Filter Gate Access Logs
  useEffect(() => {
    let result = records;

    if (viewType !== 'all') {
      result = result.filter(r => r.type.toLowerCase() === viewType);
    }

    if (filters.name.trim()) {
      const term = filters.name.trim().toLowerCase();
      result = result.filter(r => r.name && r.name.toLowerCase().includes(term));
    }

    if (filters.regNumber.trim()) {
      const term = filters.regNumber.trim().toUpperCase();
      result = result.filter(r => r.identifier && r.identifier.toUpperCase().includes(term));
    }

    if (filters.phone.trim()) {
      result = result.filter(r => r.phone && r.phone.includes(filters.phone.trim()));
    }

    if (filters.fromDate) {
      const from = new Date(filters.fromDate);
      from.setHours(0, 0, 0, 0);
      result = result.filter(r => r.latest_time >= from.getTime());
    }

    if (filters.toDate) {
      const to = new Date(filters.toDate);
      to.setHours(23, 59, 59, 999);
      result = result.filter(r => r.latest_time <= to.getTime());
    }

    setFilteredRecords(result);
  }, [filters, viewType, records]);

  // Filter Student Directory
  useEffect(() => {
    if (!studentSearch.trim()) {
      setFilteredStudents(allStudents);
    } else {
      const query = studentSearch.trim().toLowerCase();
      setFilteredStudents(
        allStudents.filter(
          s =>
            (s.name && s.name.toLowerCase().includes(query)) ||
            (s.register_number && s.register_number.toLowerCase().includes(query)) ||
            (s.department && s.department.toLowerCase().includes(query)) ||
            (s.year && s.year.toLowerCase().includes(query)) ||
            (s.phone && s.phone.includes(query))
        )
      );
    }
  }, [studentSearch, allStudents]);

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1240px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: '0 0 6px 0', color: '#0f172a' }}>Admin Dashboard</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            Supabase-backed gate activity records and student database.
          </p>
        </div>
        <button onClick={onLogout} style={styles.btnLogout}>
          Logout
        </button>
      </div>

      <div style={styles.tabContainer}>
        <button
          onClick={() => setActiveTab('logs')}
          style={activeTab === 'logs' ? styles.tabActive : styles.tabInactive}
        >
          📋 Gate Access Logs
        </button>
        <button
          onClick={() => setActiveTab('students')}
          style={activeTab === 'students' ? styles.tabActive : styles.tabInactive}
        >
          🎓 All Registered Students ({allStudents.length})
        </button>
      </div>

      {activeTab === 'logs' && (
        <>
          <div style={styles.filterCard}>
            <div style={styles.filterGrid}>
              <div style={styles.inputGroup}>
                <label style={styles.filterLabel}>Type</label>
                <select value={viewType} onChange={e => setViewType(e.target.value)} style={styles.filterInput}>
                  <option value="all">All Logs</option>
                  <option value="student">Student Only</option>
                  <option value="visitor">Visitor Only</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.filterLabel}>Name</label>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={filters.name}
                  onChange={e => setFilters({ ...filters, name: e.target.value })}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.filterLabel}>Register No / Token</label>
                <input
                  type="text"
                  placeholder="e.g. 21CS045"
                  value={filters.regNumber}
                  onChange={e => setFilters({ ...filters, regNumber: e.target.value })}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.filterLabel}>Phone Number</label>
                <input
                  type="text"
                  placeholder="Search phone..."
                  value={filters.phone}
                  onChange={e => setFilters({ ...filters, phone: e.target.value })}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.filterLabel}>From Date</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.filterLabel}>To Date</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={e => setFilters({ ...filters, toDate: e.target.value })}
                  style={styles.filterInput}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                Showing <strong>{filteredRecords.length}</strong> matching entries
              </span>
              <button
                onClick={() => setFilters({ fromDate: '', toDate: '', name: '', regNumber: '', phone: '' })}
                style={styles.btnClear}
              >
                Reset All Filters
              </button>
            </div>
          </div>

          <div style={styles.tableCard}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Photo</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Register No / Token</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Details / Dept</th>
                  <th style={styles.th}>Gate Out Time</th>
                  <th style={styles.th}>Gate In Time</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length > 0 ? (
                  filteredRecords.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: r.type === 'Student' ? '#e0e7ff' : '#ede9fe',
                          color: r.type === 'Student' ? '#3730a3' : '#6d28d9'
                        }}>
                          {r.type}
                        </span>
                      </td>

                      <td style={styles.td}>
                        {r.photo_url ? (
                          <img
                            src={r.photo_url}
                            alt=""
                            style={{
                              width: '40px',
                              height: '44px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: '1px solid #cbd5e1'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '40px',
                            height: '44px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: '#64748b',
                            border: '1px solid #e2e8f0'
                          }}>
                            {r.type === 'Visitor' ? 'VIS' : 'N/A'}
                          </div>
                        )}
                      </td>

                      <td style={styles.td}>
                        <strong>{r.name}</strong>
                      </td>

                      <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: '700', color: '#2563eb' }}>
                        {r.identifier}
                      </td>

                      <td style={styles.td}>{r.phone}</td>
                      <td style={styles.td}>{r.details}</td>
                      <td style={styles.td}>{r.time_out ? new Date(r.time_out).toLocaleString() : '-'}</td>
                      <td style={styles.td}>{r.time_in ? new Date(r.time_in).toLocaleString() : '-'}</td>

                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: r.status === 'IN' ? '#dcfce7' : '#fef3c7',
                          color: r.status === 'IN' ? '#15803d' : '#b45309'
                        }}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      No access logs found matching filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'students' && (
        <>
          <div style={styles.filterCard}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search by Student Name, Register Number, Department, or Phone..."
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value)}
                style={{ ...styles.filterInput, flex: 1, padding: '12px 14px' }}
              />
              {studentSearch && (
                <button onClick={() => setStudentSearch('')} style={styles.btnClear}>
                  Clear
                </button>
              )}
            </div>
            <div style={{ marginTop: '12px', fontSize: '13px', color: '#64748b' }}>
              Showing <strong>{filteredStudents.length}</strong> of <strong>{allStudents.length}</strong> registered students
            </div>
          </div>

          <div style={styles.tableCard}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={styles.th}>Photo</th>
                  <th style={styles.th}>Register Number</th>
                  <th style={styles.th}>Student Name</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Year of Study</th>
                  <th style={styles.th}>Phone Number</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <tr key={student.register_number} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={styles.td}>
                        <img
                          src={student.photo_url || 'https://via.placeholder.com/150'}
                          alt={student.name}
                          style={{
                            width: '44px',
                            height: '48px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid #cbd5e1'
                          }}
                        />
                      </td>
                      <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: '700', color: '#2563eb' }}>
                        {student.register_number}
                      </td>
                      <td style={styles.td}>
                        <strong style={{ color: '#0f172a' }}>{student.name}</strong>
                      </td>
                      <td style={styles.td}>{student.department}</td>
                      <td style={styles.td}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700',
                          backgroundColor: '#f1f5f9',
                          color: '#334155'
                        }}>
                          {calculateAcademicYear(student.year)}
                        </span>
                        <span style={{ marginLeft: '6px', fontSize: '11px', color: '#64748b' }}>
                          ({student.year} Batch)
                        </span>
                      </td>
                      <td style={styles.td}>{student.phone || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                      No students found matching your query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    borderBottom: '2px solid #e2e8f0',
    paddingBottom: '2px'
  },
  tabActive: {
    backgroundColor: '#ffffff',
    color: '#2563eb',
    border: '2px solid #2563eb',
    borderBottom: 'none',
    borderRadius: '8px 8px 0 0',
    padding: '10px 20px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer'
  },
  tabInactive: {
    backgroundColor: 'transparent',
    color: '#64748b',
    border: 'none',
    padding: '10px 20px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer'
  },
  filterCard: {
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    marginBottom: '24px'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '14px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  filterLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '6px'
  },
  filterInput: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    outline: 'none',
    color: '#1e293b',
    backgroundColor: '#ffffff'
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0'
  },
  th: {
    padding: '12px 16px',
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: '700'
  },
  td: {
    padding: '14px 16px',
    fontSize: '13px',
    color: '#334155'
  },
  btnLogout: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px'
  },
  btnClear: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600'
  }
};