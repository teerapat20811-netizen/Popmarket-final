import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import ImageUpload from '../components/ImageUpload';

function ShopperProfile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [form, setForm] = useState({ name: user.name || '', phone: '' });
  const [saveMsg, setSaveMsg] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); // 🟢 เพิ่ม State สำหรับเปิด-ปิด Modal รูปใหญ่

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login');
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
      setForm(prev => ({
        ...prev,
        name: res.data.name || prev.name,
        phone: res.data.phone || '',
      }));
    } catch (err) { console.log(err); }
  };

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
      setTimeout(() => setSaveMsg(''), 3000);
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
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <Link to="/" style={styles.backBtn}>← กลับหน้าหลัก</Link>
          <h1 style={styles.title}>โปรไฟล์ของฉัน</h1>
        </div>

        {/* Profile Card */}
        <div style={styles.card}>
          <div style={styles.cardGrid}>

            {/* Avatar */}
            <div style={styles.avatarSection}>
              <div 
                style={styles.avatarWrap}
                onClick={() => avatarUrl && setSelectedImage(avatarUrl)} // 🟢 กดที่รูปเพื่อขยายใหญ่
                title={avatarUrl ? "คลิกเพื่อดูรูปเต็ม" : ""}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={{ ...styles.avatarImg, cursor: 'pointer' }} />
                ) : (
                  <div style={styles.avatarPlaceholder}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <ImageUpload
                type="avatar"
                label="เปลี่ยนรูปโปรไฟล์"
                onUpload={async (url) => {
                  setAvatarUrl(url);
                  await api.put('/auth/profile', { avatar_url: url });
                }}
              />
            </div>

            {/* Fields */}
            <div style={styles.fields}>
              <div style={styles.roleTag}>
                {user.role === 'shopper' ? '🛍️ SHOPPER' : `👤 ${user.role?.toUpperCase()}`}
              </div>

              <label style={styles.label}>ชื่อ</label>
              <input style={styles.input}
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="ชื่อของคุณ" />

              <label style={styles.label}>เบอร์โทรศัพท์</label>
              <input style={styles.input}
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="0xx-xxx-xxxx" />

              <label style={styles.label}>อีเมล</label>
              <input style={{...styles.input, backgroundColor:'#f5f5f5', color:'#888'}}
                value={user.email} disabled />
              <p style={styles.disabledNote}>ไม่สามารถเปลี่ยนอีเมลได้</p>

              {saveMsg && (
                <div style={saveMsg.includes('✅') ? styles.successBox : styles.errorBox}>
                  {saveMsg}
                </div>
              )}

              <button style={styles.saveBtn} onClick={saveProfile}>
                💾 บันทึกข้อมูล
              </button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div style={styles.quickLinks}>
          <Link to="/favorites" style={styles.quickLink}>
            <span style={styles.quickIcon}>❤️</span>
            <span>ตลาดที่บันทึกไว้</span>
          </Link>
          <Link to="/markets" style={styles.quickLink}>
            <span style={styles.quickIcon}>🏪</span>
            <span>ค้นหาตลาด</span>
          </Link>
          <div style={{...styles.quickLink, cursor:'pointer', color:'#e74c3c'}}
            onClick={logout}>
            <span style={styles.quickIcon}>🚪</span>
            <span>ออกจากระบบ</span>
          </div>
        </div>

      </div>

      {/* 🟢 Modal สำหรับแสดงรูปโปรไฟล์เต็มจอ */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 9999,
            cursor: 'zoom-out'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="Avatar Full Size" 
              style={{ width: '100%', height: 'auto', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} 
            />
            <button 
              style={{
                position: 'absolute', top: '-15px', right: '-15px',
                background: '#fff', color: '#333', border: 'none',
                borderRadius: '50%', width: '36px', height: '36px',
                fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  page: { minHeight:'100vh', backgroundColor:'#f4f6f9', fontFamily:"'Sarabun', sans-serif" },
  container: { maxWidth:'640px', margin:'0 auto', padding:'32px 24px' },
  header: { marginBottom:'24px' },
  backBtn: { fontSize:'13px', color:'#1a7a4a', textDecoration:'none', fontWeight:'600' },
  title: { fontSize:'24px', fontWeight:'800', color:'#222', margin:'8px 0 0' },
  card: { backgroundColor:'#fff', borderRadius:'16px', padding:'28px', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', marginBottom:'16px' },
  cardGrid: { display:'grid', gridTemplateColumns:'180px 1fr', gap:'28px', alignItems:'start' },
  avatarSection: { display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' },
  avatarWrap: { marginBottom:'4px' },
  avatarImg: { width:'120px', height:'120px', borderRadius:'50%', objectFit:'cover', border:'3px solid #e8f5e9' },
  avatarPlaceholder: { width:'120px', height:'120px', borderRadius:'50%', backgroundColor:'#1a7a4a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'48px', fontWeight:'800' },
  fields: { display:'flex', flexDirection:'column' },
  roleTag: { display:'inline-block', fontSize:'11px', fontWeight:'700', color:'#3498db', backgroundColor:'#ebf5fb', padding:'4px 12px', borderRadius:'20px', marginBottom:'16px', width:'fit-content' },
  label: { display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' },
  input: { width:'100%', padding:'10px 12px', border:'1.5px solid #e8e8e8', borderRadius:'8px', fontSize:'13px', marginBottom:'12px', outline:'none', boxSizing:'border-box', backgroundColor:'#fafafa' },
  disabledNote: { fontSize:'11px', color:'#aaa', margin:'-8px 0 16px' },
  successBox: { backgroundColor:'#e8f5e9', color:'#1a7a4a', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'12px', fontWeight:'600' },
  errorBox: { backgroundColor:'#fff0f0', color:'#e74c3c', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'12px' },
  saveBtn: { padding:'12px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'700', width:'100%' },
  quickLinks: { display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'12px' },
  quickLink: { backgroundColor:'#fff', borderRadius:'12px', padding:'16px', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', color:'#333', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', fontSize:'13px', fontWeight:'600' },
  quickIcon: { fontSize:'24px' },
};

export default ShopperProfile;