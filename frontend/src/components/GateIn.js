import React, { useState } from 'react';
import axios from 'axios';

export default function GateIn() {
  const [formData, setFormData] = useState({ name: '', purpose: '', email: '', phone: '', accompanying_persons: '' });
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/register', formData);
      setQrCode(res.data.qrCode);
      alert('Registration successful. QR sent to email!');
    } catch (error) {
      alert('Error: ' + (error.response?.data?.error || 'Registration failed.'));
    }
    setLoading(false);
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Print QR</title></head>
      <body style="text-align:center; margin-top: 50px;">
        <h2>Gate Pass for ${formData.name}</h2>
        <img src="${qrCode}" style="width:300px; height:300px;" onload="window.print();window.close()" />
      </body></html>
    `);
  };

  return (
    <div>
      <h2>Gate In Registration</h2>
      {!qrCode ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '400px', gap: '15px' }}>
          <input type="text" placeholder="Visitor Name" required onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '10px' }}/>
          <input type="text" placeholder="Purpose of Visit" required onChange={e => setFormData({...formData, purpose: e.target.value})} style={{ padding: '10px' }}/>
          <input type="email" placeholder="Email Address" required onChange={e => setFormData({...formData, email: e.target.value})} style={{ padding: '10px' }}/>
          <input type="tel" placeholder="Phone Number" required onChange={e => setFormData({...formData, phone: e.target.value})} style={{ padding: '10px' }}/>
          <input type="text" placeholder="Accompanying Persons (optional)" onChange={e => setFormData({...formData, accompanying_persons: e.target.value})} style={{ padding: '10px' }}/>
          <button type="submit" disabled={loading} style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
            {loading ? 'Processing...' : 'Register & Generate QR'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', maxWidth: '400px', border: '1px solid #ccc', padding: '20px' }}>
          <h3 style={{ color: 'green' }}>QR Code Generated</h3>
          <img src={qrCode} alt="Visitor QR Code" style={{ width: '250px' }}/>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '15px' }}>
            <button onClick={printQR} style={{ padding: '10px' }}>🖨️ Print QR Code</button>
            <button onClick={() => setQrCode(null)} style={{ padding: '10px' }}>Register Another</button>
          </div>
        </div>
      )}
    </div>
  );
}