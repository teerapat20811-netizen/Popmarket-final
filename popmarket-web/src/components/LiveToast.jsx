import { useState, useEffect } from 'react';
import api from '../services/api';

function LiveToast() {
  const [toast, setToast] = useState(null);
  const [lastNotifId, setLastNotifId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // ตรวจสอบการแจ้งเตือนใหม่ทุก 5 วินาที (Polling)
    const checkNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        const notifs = res.data || [];
        if (notifs.length > 0) {
          const latest = notifs[0];
          // ถ้ามีแจ้งเตือนใหม่ที่ยังไม่ได้อ่าน และเป็นคนละตัวกับที่เคยเด้ง
          if (!latest.is_read && latest.id !== lastNotifId) {
            setLastNotifId(latest.id);
            setToast({
              title: latest.title || '🔔 แจ้งเตือนใหม่',
              message: latest.message || 'มีรายการอัปเดตในระบบ',
              type: latest.title?.includes('ปฏิเสธ') ? 'danger' : 'success'
            });

            // ปิดการแจ้งเตือนอัตโนมัติใน 5 วินาที
            setTimeout(() => setToast(null), 5000);
          }
        }
      } catch (err) {
        // silent error
      }
    };

    checkNotifications();
    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, [lastNotifId]);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      zIndex: 999999,
      backgroundColor: '#fff',
      borderLeft: `5px solid ${toast.type === 'danger' ? '#e74c3c' : '#1a7a4a'}`,
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      borderRadius: '8px',
      padding: '14px 20px',
      minWidth: '280px',
      maxWidth: '380px',
      animation: 'slideIn 0.3s ease-out',
      fontFamily: "'Sarabun', sans-serif"
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontWeight: '800', fontSize: '14px', color: toast.type === 'danger' ? '#e74c3c' : '#1a7a4a', marginBottom: '4px' }}>
          {toast.title}
        </div>
        <button 
          onClick={() => setToast(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#999' }}
        >
          ✕
        </button>
      </div>
      <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.4' }}>
        {toast.message}
      </div>
    </div>
  );
}

export default LiveToast;