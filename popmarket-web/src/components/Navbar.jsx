import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useState, useEffect } from 'react';
import api from '../services/api';
import ImageUpload from './ImageUpload';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [form, setForm] = useState({ name: user.name || '', phone: '' });
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (token) {
      api.get('/auth/profile')
        .then(res => {
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
          setForm(prev => ({
            ...prev,
            name: res.data.name || prev.name,
            phone: res.data.phone || '',
          }));
        })
        .catch(() => {});
    }
  }, [token]);

  const saveProfile = async () => {
    try {
      await api.put('/auth/profile', {
        name: form.name,
        phone: form.phone,
        avatar_url: avatarUrl || null,
      });
      const updatedUser = { ...user, name: form.name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setSaveMsg('✅ บันทึกสำเร็จ!');
      setTimeout(() => { setSaveMsg(''); setShowProfile(false); }, 1500);
    } catch (err) {
      setSaveMsg('❌ เกิดข้อผิดพลาด');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <>
      <nav style={styles.nav}>
        <Link to="/" style={styles.logo}>
          🛒 <span style={styles.logoText}>PopMarket</span>
        </Link>

        <div style={styles.menu}>
          <Link to="/" style={styles.link}>หน้าแรก</Link>
          <Link to="/markets" style={styles.link}>ตลาดยอดนิยม</Link>
          <Link to="/shops" style={styles.link}>ร้านค้า</Link>
          <Link to="/nearme" style={styles.link}>ตลาดนัดใกล้ฉัน</Link>
          {token && <Link to="/favorites" style={styles.link}>รายการโปรด</Link>}
          
          {/* 💬 แสดงปุ่มข้อความแชทเฉพาะลูกค้าทั่วไป (ไม่แสดงสำหรับ vendor, organizer, admin) */}
          {token && user.role !== 'vendor' && user.role !== 'organizer' && user.role !== 'admin' && (
            <Link to="/messages" style={styles.chatNavBtn}>
              💬 ข้อความแชท
            </Link>
          )}
        </div>

        <div style={styles.right}>
          {token ? (
            <>
              <div
                style={styles.userNameLink}
                onClick={() => { setSaveMsg(''); setShowProfile(true); }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={styles.navAvatar} />
                ) : (
                  <span style={styles.navAvatarPlaceholder}>
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                )}
                {user.name}
              </div>
              {user.role === 'vendor' && <Link to="/vendor" style={styles.btnOutline}>แดชบอร์ด</Link>}
              {user.role === 'organizer' && <Link to="/organizer" style={styles.btnOutline}>แดชบอร์ด</Link>}
              {user.role === 'admin' && <Link to="/admin" style={styles.btnOutline}>Admin</Link>}
              {token && <NotificationBell />}
              <button onClick={logout} style={styles.btnLogout}>ออกจากระบบ</button>
            </>
          ) : (
            <>
              <Link to="/login" style={styles.btnOutline}>เข้าสู่ระบบ</Link>
              <Link to="/register" style={styles.btnGreen}>สมัครสมาชิก</Link>
            </>
          )}
        </div>
      </nav>

      {/* ===== MODAL: โปรไฟล์ ===== */}
      {showProfile && (
        <div style={styles.overlay} onClick={() => setShowProfile(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>👤 ข้อมูลส่วนตัว</h3>
                <p style={styles.modalSub}>แก้ไขชื่อและเบอร์โทรศัพท์ของคุณ</p>
              </div>
              <button style={styles.modalClose} onClick={() => setShowProfile(false)}>✕</button>
            </div>

            <div style={styles.profileGrid}>
              <div style={styles.avatarSection}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={styles.avatarImg} />
                ) : (
                  <div style={styles.avatarPlaceholder}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <ImageUpload
                  type="shop"
                  label="เปลี่ยนรูปโปรไฟล์"
                  onUpload={async (url) => {
                    setAvatarUrl(url);
                    await api.put('/auth/profile', { avatar_url: url });
                  }}
                />
              </div>

              <div>
                <label style={styles.label}>ชื่อร้านค้า / ชื่อเล่น</label>
                <input style={styles.input}
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})} />

                <label style={styles.label}>เบอร์โทรศัพท์</label>
                <input style={styles.input}
                  placeholder="0xx-xxx-xxxx"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})} />

                <label style={styles.label}>อีเมล</label>
                <input style={{...styles.input, backgroundColor:'#f5f5f5', color:'#888'}}
                  value={user.email} disabled />
                <p style={{fontSize:'11px', color:'#aaa', margin:'-8px 0 12px'}}>
                  ไม่สามารถเปลี่ยนอีเมลได้
                </p>

                {saveMsg && (
                  <div style={{
                    padding:'10px', borderRadius:'8px', fontSize:'13px',
                    marginBottom:'12px', fontWeight:'600',
                    backgroundColor: saveMsg.includes('✅') ? '#e8f5e9' : '#fff0f0',
                    color: saveMsg.includes('✅') ? '#1a7a4a' : '#e74c3c',
                  }}>
                    {saveMsg}
                  </div>
                )}

                <button style={styles.saveBtn} onClick={saveProfile}>
                  💾 บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles = {
  nav: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 32px', backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: '8px',
    textDecoration: 'none', color: '#1a7a4a',
  },
  logoText: { fontSize: '20px', fontWeight: 'bold', color: '#1a7a4a' },
  menu: { display: 'flex', gap: '24px', alignItems: 'center' },
  link: { color: '#333', textDecoration: 'none', fontSize: '14px', fontWeight: '500' },
  
  // 💬 สไตล์ปุ่มข้อความแชทบนแถบ Navbar
  chatNavBtn: { 
    textDecoration: 'none', 
    backgroundColor: '#e8f5e9', 
    color: '#1a7a4a', 
    padding: '6px 14px', 
    borderRadius: '20px', 
    fontSize: '13px', 
    fontWeight: '700', 
    border: '1px solid #c8e6c9' 
  },

  right: { display: 'flex', gap: '12px', alignItems: 'center' },
  userName: { fontSize: '14px', color: '#555' },
  btnOutline: {
    padding: '7px 16px', border: '1.5px solid #1a7a4a',
    color: '#1a7a4a', borderRadius: '6px', textDecoration: 'none',
    fontSize: '14px', fontWeight: '500',
  },
  btnGreen: {
    padding: '7px 16px', backgroundColor: '#1a7a4a',
    color: '#fff', borderRadius: '6px', textDecoration: 'none',
    fontSize: '14px', fontWeight: '500',
  },
  btnLogout: {
    padding: '7px 16px', backgroundColor: '#e74c3c',
    color: '#fff', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontSize: '14px',
  },
  userNameLink: { display:'flex', alignItems:'center', gap:'8px', textDecoration:'none', color:'#555', fontSize:'14px', fontWeight:'500' },
  navAvatar: { width:'32px', height:'32px', borderRadius:'50%', objectFit:'cover', border:'2px solid #e8f5e9' },
  navAvatarPlaceholder: { width:'32px', height:'32px', borderRadius:'50%', backgroundColor:'#1a7a4a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'13px' },
  overlay: { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:'16px' },
  modal: { backgroundColor:'#fff', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'520px', boxShadow:'0 8px 40px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' },
  modalHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' },
  modalTitle: { fontSize:'17px', fontWeight:'800', margin:0, color:'#222' },
  modalSub: { fontSize:'12px', color:'#888', margin:'2px 0 0' },
  modalClose: { background:'none', border:'none', fontSize:'20px', cursor:'pointer', color:'#aaa' },
  profileGrid: { display:'grid', gridTemplateColumns:'160px 1fr', gap:'24px', alignItems:'start' },
  avatarSection: { display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' },
  avatarImg: { width:'110px', height:'110px', borderRadius:'50%', objectFit:'cover', border:'3px solid #e8f5e9' },
  avatarPlaceholder: { width:'110px', height:'110px', borderRadius:'50%', backgroundColor:'#1a7a4a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'42px', fontWeight:'800' },
  label: { display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' },
  input: { width:'100%', padding:'10px 12px', border:'1.5px solid #e8e8e8', borderRadius:'8px', fontSize:'13px', marginBottom:'12px', outline:'none', boxSizing:'border-box', backgroundColor:'#fafafa' },
  saveBtn: { width:'100%', padding:'12px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'700' },
};

export default Navbar;