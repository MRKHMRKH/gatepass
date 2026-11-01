require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  },
  tls: { rejectUnauthorized: false }
});

// =========================================================================
// 1. STUDENT GATE IN / OUT TOGGLE
// =========================================================================
app.post('/api/student/gate-toggle', async (req, res) => {
  const rawReg = req.body.register_number ? req.body.register_number.trim().toUpperCase() : '';
  if (!rawReg) {
    return res.status(400).json({ error: 'Register number is required.' });
  }

  try {
    // 1. Look up student in directory
    const { data: student, error: studentErr } = await supabase
      .from('student_directory')
      .select('*')
      .eq('register_number', rawReg)
      .maybeSingle();

    if (studentErr) throw studentErr;

    if (!student) {
      return res.status(404).json({ error: `Student register number "${rawReg}" not found in database.` });
    }

    const now = new Date().toISOString();

    // 2. Check active OUT log
    const { data: activeOutLog, error: logErr } = await supabase
      .from('student_logs')
      .select('*')
      .eq('register_number', rawReg)
      .eq('status', 'OUT')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logErr) throw logErr;

    if (activeOutLog) {
      // Return IN: Only update gate_in_time and status
      const { error: updateErr } = await supabase
        .from('student_logs')
        .update({ status: 'IN', gate_in_time: now })
        .eq('id', activeOutLog.id);

      if (updateErr) throw updateErr;

      return res.json({
        success: true,
        action: 'GATE_IN',
        message: `GATE IN: ${student.name}`,
        student: {
          register_number: student.register_number,
          name: student.name,
          phone: student.phone,
          department: student.department,
          year: student.year,
          photo_url: student.photo_url,
          gate_in_time: now,
          gate_out_time: activeOutLog.gate_out_time,
          status: 'IN'
        }
      });
    } else {
      // Heading OUT: Only insert register_number, status, gate_out_time
      const { error: insertErr } = await supabase
        .from('student_logs')
        .insert([{
          register_number: student.register_number,
          status: 'OUT',
          gate_out_time: now
        }]);

      if (insertErr) throw insertErr;

      return res.json({
        success: true,
        action: 'GATE_OUT',
        message: `GATE OUT: ${student.name}`,
        student: {
          register_number: student.register_number,
          name: student.name,
          phone: student.phone,
          department: student.department,
          year: student.year,
          photo_url: student.photo_url,
          gate_out_time: now,
          status: 'OUT'
        }
      });
    }
  } catch (error) {
    console.error('Student Gate Toggle Error:', error);
    res.status(500).json({ error: error.message || 'Database error occurred.' });
  }
});

// =========================================================================
// 2. VISITOR REGISTRATION & QR CHECKOUT
// =========================================================================
app.post('/api/register', async (req, res) => {
  const { name, purpose, email, phone, accompanying_persons } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and Email are required.' });
  }

  const token = uuidv4().substring(0, 8).toUpperCase();
  const now = new Date().toISOString();

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(token);

    const { error: dbError } = await supabase
      .from('visitors')
      .insert([{
        token,
        name,
        purpose,
        email,
        phone: phone || '-',
        accompanying_persons: accompanying_persons || '-',
        status: 'IN',
        gate_in_time: now
      }]);

    if (dbError) throw dbError;

    res.json({ success: true, token, qrCode: qrCodeDataUrl });

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Visitor Gate Pass QR Code & Token',
        html: `
          <div style="font-family: sans-serif; padding: 16px; color: #333;">
            <h2 style="color: #2563eb;">Visitor Gate Pass Confirmation</h2>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Your visitor checkout token is: <strong>${token}</strong>.</p>
            <p>Please present the attached QR code at the gate to check out.</p>
          </div>
        `,
        attachments: [{
          filename: `GatePass_${token}.png`,
          content: qrCodeDataUrl.split('base64,')[1],
          encoding: 'base64'
        }]
      }).catch(err => console.error('Visitor Email Error:', err.message));
    }
  } catch (error) {
    console.error('Visitor Registration Error:', error);
    res.status(500).json({ error: 'Registration failed.' });
  }
});

app.post('/api/visitor/scan-out', async (req, res) => {
  const token = req.body.token ? req.body.token.trim().toUpperCase() : '';
  if (!token) return res.status(400).json({ error: 'Token is required.' });

  try {
    const { data: visitor, error: fetchErr } = await supabase
      .from('visitors')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (fetchErr) throw fetchErr;
    if (!visitor) return res.status(404).json({ error: 'Visitor pass not found.' });
    if (visitor.status === 'OUT') return res.status(400).json({ error: 'Visitor pass has already checked out.' });

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('visitors')
      .update({ status: 'OUT', gate_out_time: now })
      .eq('token', token);

    if (updateErr) throw updateErr;

    res.json({
      success: true,
      message: `Checked OUT: ${visitor.name}`,
      visitor: { ...visitor, gate_out_time: now, status: 'OUT' }
    });
  } catch (error) {
    console.error('Visitor Checkout Error:', error);
    res.status(500).json({ error: 'Checkout failed.' });
  }
});

// =========================================================================
// 3. ADMIN, LOGS & REGISTERED STUDENTS
// =========================================================================
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  try {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username')
      .eq('username', username.trim())
      .eq('password', password.trim())
      .maybeSingle();

    if (error) throw error;
    if (!admin) return res.status(401).json({ error: 'Invalid username or password.' });

    res.json({ success: true, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/visitors', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Joins student_logs with student_directory via register_number foreign key
app.get('/api/student-logs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_logs')
      .select(`
        id,
        register_number,
        gate_out_time,
        gate_in_time,
        status,
        student_directory (
          name,
          phone,
          department,
          year,
          photo_url
        )
      `)
      .order('id', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all enrolled students from student_directory
app.get('/api/students/all', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('student_directory')
      .select('*')
      .order('register_number', { ascending: true });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Supabase backend running on port ${PORT}`));