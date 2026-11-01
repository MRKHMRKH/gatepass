const db = require('./db');

module.exports = {
  // Query to select all students from the students/directory table
  getAllStudentsFromTable: () => {
    return db.prepare(`
      SELECT register_number, name, phone, department, year, photo_url 
      FROM student_directory 
      ORDER BY register_number ASC
    `).all();
  },

  // Check if student exists in directory
  getStudentByRegNo: (registerNumber) => {
    return db.prepare(`
      SELECT register_number, name, phone, department, year, photo_url 
      FROM student_directory 
      WHERE register_number = ?
    `).get(registerNumber);
  },

  // Check if student is currently marked OUT
  getActiveOutStudentLog: (registerNumber) => {
    return db.prepare(`
      SELECT * FROM student_logs 
      WHERE register_number = ? AND status = 'OUT' 
      ORDER BY id DESC LIMIT 1
    `).get(registerNumber);
  },

  // Record GATE OUT
  recordStudentGateOut: ({ register_number, name, phone, department, year, photo_url, time }) => {
    return db.prepare(`
      INSERT INTO student_logs (register_number, name, phone, department, year, photo_url, status, gate_out_time)
      VALUES (?, ?, ?, ?, ?, ?, 'OUT', ?)
    `).run(register_number, name, phone, department, year, photo_url, time);
  },

  // Record GATE IN (Return)
  recordStudentGateIn: (logId, time) => {
    return db.prepare(`
      UPDATE student_logs 
      SET status = 'IN', gate_in_time = ? 
      WHERE id = ?
    `).run(time, logId);
  },

  // Retrieve all logs for dashboard
  getAllStudentLogs: () => {
    return db.prepare('SELECT * FROM student_logs ORDER BY id DESC').all();
  },

  // --- Visitor Queries ---
  createVisitorPass: ({ token, name, purpose, email, phone, accompanying_persons, time }) => {
    return db.prepare(`
      INSERT INTO visitors (token, name, purpose, email, phone, accompanying_persons, status, gate_in_time)
      VALUES (?, ?, ?, ?, ?, ?, 'IN', ?)
    `).run(token, name, purpose, email, phone, accompanying_persons, time);
  },

  getVisitorByToken: (token) => {
    return db.prepare('SELECT * FROM visitors WHERE token = ?').get(token);
  },

  recordVisitorGateOut: (token, time) => {
    return db.prepare(`
      UPDATE visitors 
      SET status = 'OUT', gate_out_time = ? 
      WHERE token = ?
    `).run(time, token);
  },

  getAllVisitors: () => {
    return db.prepare('SELECT * FROM visitors ORDER BY id DESC').all();
  },

  // --- Admin User ---
  getAdminUser: (username, password) => {
    return db.prepare('SELECT id, username FROM admins WHERE username = ? AND password = ?').get(username, password);
  }
};