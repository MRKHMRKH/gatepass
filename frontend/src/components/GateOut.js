import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import axios from 'axios';

export default function GateOut() {
  const [scanResult, setScanResult] = useState('');
  const [message, setMessage] = useState('');

  const handleScan = async (result, error) => {
    if (result) {
      const token = result?.text;
      if (token && token !== scanResult) {
        setScanResult(token);
        try {
          const res = await axios.post('http://localhost:5000/api/scan', { token });
          setMessage(`✅ Success: ${res.data.visitor.name} checked out successfully.`);
        } catch (err) {
          setMessage(`❌ Error: ${err.response?.data?.error || 'Invalid QR Code'}`);
        }
      }
    }
  };

  return (
    <div>
      <h2>Gate Out Scanner</h2>
      <div style={{ maxWidth: '400px', margin: '0 auto', border: '2px solid #333' }}>
        <QrReader 
          onResult={handleScan}
          constraints={{ facingMode: 'environment' }}
          style={{ width: '100%' }}
        />
      </div>
      
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <h3 style={{ color: message.includes('❌') ? 'red' : 'green' }}>{message}</h3>
        {scanResult && (
          <button onClick={() => { setScanResult(''); setMessage(''); }} style={{ padding: '10px 20px', marginTop: '10px' }}>
            Ready for Next Scan
          </button>
        )}
      </div>
    </div>
  );
}