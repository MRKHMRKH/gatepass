const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'gatepass.db'));
db.pragma('journal_mode = WAL');

// 1. Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS student_directory (
    register_number TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    department TEXT NOT NULL,
    year TEXT NOT NULL CHECK(year IN ('1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year')),
    photo_url TEXT
  );

  CREATE TABLE IF NOT EXISTS student_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    register_number TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    department TEXT,
    year TEXT,
    photo_url TEXT,
    status TEXT NOT NULL, -- 'IN' or 'OUT'
    gate_out_time TEXT,
    gate_in_time TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    accompanying_persons TEXT,
    status TEXT NOT NULL,
    gate_in_time TEXT NOT NULL,
    gate_out_time TEXT
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );
`);

// Ensure default admin always exists
const adminCount = db.prepare('SELECT count(*) as count FROM admins').get().count;
if (adminCount === 0) {
  db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', 'admin123');
 
}

// 2. Pre-enter Student Data (1st, 2nd, 3rd, 4th, 5th Year examples)
const seedData = () => {
  const studentCount = db.prepare('SELECT count(*) as count FROM student_directory').get().count;

  if (studentCount === 0) {
    const insert = db.prepare(`
      INSERT INTO student_directory (register_number, name, phone, department, year, photo_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const students = [
      [
        '24CS001',
        'Aarav Sharma',
        '+91 9876543201',
        'Computer Science',
        '1st Year',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80'
      ],
       [
        'P251325',
        'razi',
        '+91 9876543201',
        'Computer Science',
        '2st Year',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80'
      ],
      [
        '23EC014',
        'Diya Patel',
        '+91 9876543202',
        'Electronics & Communication',
        '2nd Year',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80'
      ],
      [
        '22ME045',
        'Muhammed Razi K',
        '+91 9876543203',
        'Mechanical Engineering',
        '3rd Year',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'
      ],
      [
        '21EE032',
        'Sneha Roy',
        '+91 9876543204',
        'Electrical Engineering',
        '4th Year',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
      ],
      [
        '20AR008',
        'Karthik Menon',
        '+91 9876543205',
        'Architecture',
        '5th Year',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80'
      ]
    ];

    

    const insertTx = db.transaction((rows) => {
      for (const row of rows) insert.run(...row);
    });

    insertTx(students);
    console.log('✅ Student directory seeded with 1st through 5th year records.');
  }

  const adminCount = db.prepare('SELECT count(*) as count FROM admins').get().count;
  if (adminCount === 0) {
    db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', 'admin123');
  }
};

seedData();

module.exports = db;