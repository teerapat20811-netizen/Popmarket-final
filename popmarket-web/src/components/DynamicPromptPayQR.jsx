import { useState, useEffect } from 'react';
import api from '../services/api';
 
function CheckoutComponent({ bookingAmount }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    const fetchDynamicQR = async () => {
      try {
        // ส่งยอดเงิน (bookingAmount) ไปให้ Backend สร้าง QR Code แบบเฉพาะเจาะจง
        const res = await api.post('/payments/generate-qr', { amount: bookingAmount });
        setQrCodeUrl(res.data.qrCodeUrl);
      } catch (err) {
        console.error('Failed to load QR', err);
      } finally {
        setLoading(false);
      }
    };
 
    if (bookingAmount) {
      fetchDynamicQR();
    }
  }, [bookingAmount]);
 
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h3>สแกนเพื่อชำระเงินยอด ฿{Number(bookingAmount).toLocaleString()}</h3>
      {loading ? (
        <p>กำลังสร้าง QR Code...</p>
      ) : (
        <img src={qrCodeUrl} alt="PromptPay QR" style={{ width: '200px', height: '200px' }} />
      )}
      <p style={{ fontSize: '12px', color: '#666' }}>ยอดเงินจะถูกตั้งค่าอัตโนมัติเมื่อสแกนผ่านแอปธนาคาร</p>
    </div>
  );
}