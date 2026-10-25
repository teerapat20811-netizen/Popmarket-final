import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function PendingApproval() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [appStatus, setAppStatus] = useState(null);
  const [appData, setAppData] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    if (user.role === 'organizer') { navigate('/organizer'); return; }
    if (user.role === 'vendor') { navigate('/vendor'); return; }
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/applications/my');
      if (res.data && res.data.length > 0) {
        setAppStatus(res.data[0].status);
        setAppData(res.data[0]);
      }
    } catch (err) { console.log(err); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const displayEmail = user.email || appData?.user_email || 'อีเมลของคุณ';

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <Link to="/" style={s.logo}>🛒 PopMarket</Link>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link to="/pending-approval" style={s.statusBadgeLink}>
            ⏳ ตรวจสอบสถานะเจ้าของตลาด
          </Link>
          <button style={s.logoutBtn} onClick={logout}>ออกจากระบบ</button>
        </div>
      </div>

      <div style={s.container}>

        {/* Status Card */}
        <div style={s.card}>

          {/* Icon */}
          <div style={s.iconWrap}>
            {appStatus === 'approved' ? '🎉' : appStatus === 'rejected' ? '❌' : '⏳'}
          </div>

          {appStatus === 'pending' || !appStatus ? (
            <>
              <h1 style={s.title}>รอการอนุมัติจาก Admin</h1>
              <p style={s.sub}>
                ใบสมัครเป็นผู้จัดตลาดของคุณอยู่ระหว่างการพิจารณาจากทีมงาน PopMarket
              </p>

              {/* Progress Steps */}
              <div style={s.steps}>
                {[
                  { icon:'✅', label:'ส่งใบสมัครแล้ว', done: true },
                  { icon:'🔍', label:'ทีมงานกำลังพิจารณา', done: false, active: true },
                  { icon:'📞', label:'ติดต่อกลับ', done: false },
                  { icon:'🏪', label:'เริ่มใช้งาน', done: false },
                ].map((st, i) => (
                  <div key={i} style={s.stepItem}>
                    <div style={{
                      ...s.stepCircle,
                      backgroundColor: st.done ? '#1a7a4a' : st.active ? '#f39c12' : '#e0e0e0',
                      color: st.done || st.active ? '#fff' : '#aaa',
                    }}>
                      {st.icon}
                    </div>
                    <div style={{
                      ...s.stepLabel,
                      color: st.done ? '#1a7a4a' : st.active ? '#f39c12' : '#aaa',
                      fontWeight: st.active ? '700' : '400',
                    }}>
                      {st.label}
                    </div>
                    {i < 3 && <div style={{...s.stepLine, backgroundColor: st.done ? '#1a7a4a' : '#e0e0e0'}} />}
                  </div>
                ))}
              </div>

              {/* ข้อมูลผู้ใช้งาน */}
              <div style={s.infoBox}>
                👤 บัญชีของคุณ: <strong>{user.name || 'Organizer'}</strong> | {displayEmail}
              </div>

              {/* ข้อมูลที่ยื่นสมัคร */}
              {appData && (
                <div style={s.infoBoxSub}>
                  <h4 style={s.infoTitle}>📋 ข้อมูลธุรกิจที่ยื่นไป</h4>
                  {[
                    { k:'ชื่อธุรกิจ', v: appData.business_name || '-' },
                    { k:'ประเภทธุรกิจ', v: appData.business_type || '-' },
                    { k:'วันที่ยื่น', v: appData.created_at ? new Date(appData.created_at).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' }) : '-' },
                  ].map((row, i) => (
                    <div key={i} style={s.infoRow}>
                      <span style={s.infoKey}>{row.k}</span>
                      <span style={s.infoVal}>{row.v}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={s.timeBox}>
                🕐 ใช้เวลาพิจารณา <strong>1-3 วันทำการ</strong><br />
                ทีมงานจะติดต่อกลับผ่านอีเมล <strong>{displayEmail}</strong>
              </div>

              <button style={s.refreshBtn} onClick={fetchStatus}>
                🔄 เช็คสถานะ
              </button>
            </>
          ) : appStatus === 'approved' ? (
            <>
              <h1 style={{...s.title, color:'#1a7a4a'}}>ได้รับการอนุมัติแล้ว! 🎉</h1>
              <p style={s.sub}>ยินดีด้วย! คุณสามารถเริ่มสร้างตลาดได้แล้ว</p>
              <button style={s.goBtn} onClick={() => {
                api.get('/auth/profile').then(() => {
                  localStorage.setItem('user', JSON.stringify({...user, role:'organizer'}));
                  navigate('/organizer');
                });
              }}>
                🏪 ไปหน้า Dashboard ผู้จัดตลาด
              </button>
            </>
          ) : (
            <>
              <h1 style={{...s.title, color:'#e74c3c'}}>ใบสมัครถูกปฏิเสธ</h1>
              <p style={s.sub}>ขออภัย ใบสมัครของคุณไม่ผ่านการพิจารณาในครั้งนี้</p>
              {appData?.admin_note && (
                <div style={{...s.infoBoxSub, backgroundColor:'#fff0f0', border:'1px solid #ffd0d0', textAlign:'left'}}>
                  <h4 style={{...s.infoTitle, color:'#e74c3c'}}>หมายเหตุจาก Admin</h4>
                  <p style={{fontSize:'13px', color:'#555', margin:0}}>{appData.admin_note}</p>
                </div>
              )}
              <button style={{...s.goBtn, backgroundColor:'#e74c3c'}} onClick={logout}>
                ออกจากระบบ
              </button>
            </>
          )}
        </div>

        {/* ระหว่างรอ (เมนูลัด) */}
        {(appStatus === 'pending' || !appStatus) && (
          <div style={s.whileWaiting}>
            <h3 style={s.waitTitle}>ระหว่างรออนุมัติ คุณสามารถ...</h3>
            <div style={s.waitGrid}>
              {[
                { icon:'🏪', label:'ดูตลาดทั้งหมด', link:'/' },
                { icon:'🛍️', label:'ดูร้านค้าอื่นๆ', link:'/shops' },
              ].map((item, i) => (
                <Link key={i} to={item.link} style={s.waitCard}>
                  <div style={{fontSize:'28px', marginBottom:'8px'}}>{item.icon}</div>
                  <div style={{fontSize:'13px', fontWeight:'600', color:'#333'}}>{item.label}</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { minHeight:'100vh', backgroundColor:'#f4f6f9', fontFamily:"'Sarabun', sans-serif" },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', backgroundColor:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  logo: { fontSize:'20px', fontWeight:'800', color:'#1a7a4a', textDecoration:'none' },
  
  // 🟢 สไตล์ปุ่มสถานะที่เพิ่มเข้ามาใหม่
  statusBadgeLink: { 
    fontSize: '13px', 
    backgroundColor: '#fff9e6', 
    color: '#f39c12', 
    padding: '6px 14px', 
    borderRadius: '20px', 
    textDecoration: 'none', 
    fontWeight: '700', 
    border: '1px solid #fce5a0' 
  },

  logoutBtn: { padding:'8px 16px', backgroundColor:'#f0f0f0', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', color:'#555' },

  container: { maxWidth:'600px', margin:'40px auto', padding:'0 24px' },

  card: { backgroundColor:'#fff', borderRadius:'20px', padding:'40px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)', textAlign:'center', marginBottom:'20px' },
  iconWrap: { fontSize:'56px', marginBottom:'16px' },
  title: { fontSize:'24px', fontWeight:'800', color:'#222', margin:'0 0 8px' },
  sub: { fontSize:'14px', color:'#888', margin:'0 0 28px', lineHeight:1.6 },

  steps: { display:'flex', alignItems:'flex-start', justifyContent:'center', marginBottom:'24px' },
  stepItem: { display:'flex', flexDirection:'column', alignItems:'center', position:'relative', flex:1 },
  stepCircle: { width:'40px', height:'40px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', zIndex:1, marginBottom:'6px' },
  stepLabel: { fontSize:'11px', textAlign:'center', lineHeight:1.3 },
  stepLine: { position:'absolute', top:'20px', left:'60%', width:'80%', height:'2px', zIndex:0 },

  infoBox: { backgroundColor:'#f8f9fa', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#555', marginBottom:'16px' },
  infoBoxSub: { backgroundColor:'#f8f9fa', borderRadius:'12px', padding:'16px', marginBottom:'16px', textAlign:'left' },
  infoTitle: { fontSize:'13px', fontWeight:'800', color:'#222', margin:'0 0 10px' },
  infoRow: { display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid #eee', fontSize:'13px' },
  infoKey: { color:'#888' },
  infoVal: { fontWeight:'600', color:'#222' },

  timeBox: { backgroundColor:'#fff9e6', border:'1px solid #fce5a0', borderRadius:'10px', padding:'14px', fontSize:'13px', color:'#777', lineHeight:1.7, marginBottom:'20px' },
  refreshBtn: { padding:'10px 24px', backgroundColor:'#f0f0f0', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600', color:'#555' },
  goBtn: { width:'100%', padding:'14px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'15px', fontWeight:'700', marginTop:'16px' },

  whileWaiting: { backgroundColor:'#fff', borderRadius:'16px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  waitTitle: { fontSize:'15px', fontWeight:'800', color:'#222', margin:'0 0 16px' },
  waitGrid: { display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'12px' },
  waitCard: { padding:'16px', backgroundColor:'#f8f9fa', borderRadius:'12px', textDecoration:'none', textAlign:'center', display:'block' },
};

export default PendingApproval;