import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import socket from '../services/socket';

function NotificationBell() {
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!user.id) return;

    // Join socket room
    socket.emit('join', user.id);

    // รับ notification realtime
    socket.on('notification', (notif) => {
      setNotifs(prev => [notif, ...prev]);
      // แสดง browser notification
      if (Notification.permission === 'granted') {
        new Notification(notif.title, { body: notif.message });
      }
    });

    // โหลด notification เก่า
    fetchNotifs();

    // ขอ permission browser notification
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.off('notification');
    };
  }, [user.id]);

  const fetchNotifs = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const res = await api.get('/notifications');
      setNotifs(res.data);
    } catch (err) { console.log(err); }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifs(prev => prev.map(n =>
        n.id === id ? {...n, is_read: true} : n
      ));
    } catch (err) { console.log(err); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifs(prev => prev.map(n => ({...n, is_read: true})));
    } catch (err) { console.log(err); }
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  const typeIcon = (type) => ({
    booking: '🔖', payment: '💳',
    market: '🏪', system: '📢',
  }[type] || '📢');

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'เพิ่งส่ง';
    if (mins < 60) return `${mins} นาทีที่แล้ว`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} ชั่วโมงที่แล้ว`;
    return `${Math.floor(hrs / 24)} วันที่แล้ว`;
  };

  if (!localStorage.getItem('token')) return null;

  return (
    <div style={styles.wrap}>
      {/* Bell Button */}
      <button style={styles.bell} onClick={() => setOpen(!open)}>
        🔔
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div style={styles.backdrop} onClick={() => setOpen(false)} />
          <div style={styles.dropdown}>
            <div style={styles.dropHeader}>
              <h3 style={styles.dropTitle}>การแจ้งเตือน</h3>
              {unreadCount > 0 && (
                <button style={styles.readAllBtn} onClick={markAllRead}>
                  อ่านทั้งหมด
                </button>
              )}
            </div>

            {notifs.length === 0 ? (
              <div style={styles.empty}>
                <p style={styles.emptyIcon}>🔔</p>
                <p style={styles.emptyText}>ยังไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              <div style={styles.list}>
                {notifs.map(n => (
                  <div
                    key={n.id}
                    style={{
                      ...styles.item,
                      backgroundColor: n.is_read ? '#fff' : '#f0f9f4',
                    }}
                    onClick={() => {
                      markRead(n.id);
                      if (n.link) navigate(n.link);
                      setOpen(false);
                    }}
                  >
                    <div style={styles.itemIcon}>{typeIcon(n.type)}</div>
                    <div style={styles.itemContent}>
                      <div style={styles.itemTitle}>{n.title}</div>
                      <div style={styles.itemMsg}>{n.message}</div>
                      <div style={styles.itemTime}>{timeAgo(n.created_at)}</div>
                    </div>
                    {!n.is_read && <div style={styles.unreadDot} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  wrap: { position: 'relative' },
  bell: {
    position: 'relative',
    width: '40px', height: '40px',
    borderRadius: '50%',
    backgroundColor: '#f0f0f0',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: '-2px', right: '-2px',
    backgroundColor: '#e74c3c',
    color: '#fff',
    fontSize: '9px',
    fontWeight: '700',
    padding: '2px 5px',
    borderRadius: '10px',
    minWidth: '16px',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 998,
  },
  dropdown: {
    position: 'absolute',
    top: '48px',
    right: 0,
    width: '340px',
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    zIndex: 999,
    overflow: 'hidden',
    border: '1px solid #eee',
  },
  dropHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
  },
  dropTitle: { fontSize: '15px', fontWeight: '800', margin: 0, color: '#222' },
  readAllBtn: {
    fontSize: '12px',
    color: '#1a7a4a',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
  },
  empty: { padding: '40px', textAlign: 'center' },
  emptyIcon: { fontSize: '32px', margin: '0 0 8px' },
  emptyText: { fontSize: '13px', color: '#aaa', margin: 0 },
  list: { maxHeight: '380px', overflowY: 'auto' },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 20px',
    cursor: 'pointer',
    borderBottom: '1px solid #f8f8f8',
    transition: 'background 0.1s',
  },
  itemIcon: {
    width: '36px', height: '36px',
    borderRadius: '50%',
    backgroundColor: '#e8f5e9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: '13px', fontWeight: '700', color: '#222', marginBottom: '2px' },
  itemMsg: { fontSize: '12px', color: '#666', marginBottom: '4px', lineHeight: 1.4 },
  itemTime: { fontSize: '11px', color: '#aaa' },
  unreadDot: {
    width: '8px', height: '8px',
    borderRadius: '50%',
    backgroundColor: '#1a7a4a',
    flexShrink: 0,
    marginTop: '4px',
  },
};

export default NotificationBell;