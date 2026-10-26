import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import ImageUpload from '../components/ImageUpload';
import NotificationBell from '../components/NotificationBell';

function VendorDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab, setTab] = useState('profile');
  const [bookings, setBookings] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [posts, setPosts] = useState([]);
  
  // State สำหรับระบบโพสต์ (รองรับหลายรูป)
  const [postCaption, setPostCaption] = useState('');
  const [postImages, setPostImages] = useState([]); 
  const [postFeeling, setPostFeeling] = useState('');
  const [postLoading, setPostLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const [subscriptions, setSubscriptions] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]); 
  const [checkinLoading, setCheckinLoading] = useState(false);

  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [expandedSubId, setExpandedSubId] = useState(null);
  const [subDatesMap, setSubDatesMap] = useState({});

  const [chatPartner, setChatPartner] = useState({ id: null, name: '' });
  const [conversations, setConversations] = useState([]);
  const [fullImage, setFullImage] = useState(null);

  // State โปรไฟล์ร้านค้า พร้อม LINE ID และ Social Media
  const [profile, setProfile] = useState({
    shop_name: user.name || '',
    category: 'food',
    description: '',
    logo_url: '',
    line_id: '',
    social_media: '',
  });

  const [avatarUrl, setAvatarUrl] = useState('');
  const [userEdit, setUserEdit] = useState({
    name: user.name || '',
    phone: user.phone || '',
  });
  const [shopLogo, setShopLogo] = useState('');

  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [personalSaveMsg, setPersonalSaveMsg] = useState('');

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    title: '', description: '', category: 'other', priority: 'normal',
  });

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login');
    fetchBookings();
    fetchMarkets();
    fetchProfile();
    fetchPosts();
    fetchSubscriptions();
    fetchActiveBookings();
    fetchConversations();
  }, []);

  useEffect(() => {
    if (conversations.length > 0 && !chatPartner.id) {
      setChatPartner({ 
        id: conversations[0].user_id, 
        name: conversations[0].shop_name || conversations[0].name 
      });
    }
  }, [conversations]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
      if (res.data.logo_url) {
        setProfile(prev => ({ ...prev, logo_url: res.data.logo_url }));
        setShopLogo(res.data.logo_url);
      }
      setProfile(prev => ({
        ...prev,
        shop_name: res.data.shop_name || user.name || '',
        description: res.data.description || '',
        category: res.data.category || 'food',
        line_id: res.data.line_id || '',
        social_media: res.data.social_media || '',
      }));
      setUserEdit(prev => ({
        ...prev,
        name: res.data.name || prev.name,
        phone: res.data.phone || prev.phone,
      }));
    } catch (err) { console.log(err); }
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/messages/conversations/list');
      setConversations(res.data);
    } catch (err) { console.log(err); }
  };

  const saveUserInfo = async () => {
    try {
      await api.put('/auth/profile', {
        name: userEdit.name,
        phone: userEdit.phone,
        avatar_url: avatarUrl || null,
      });
      const updatedUser = { ...user, name: userEdit.name, phone: userEdit.phone };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setPersonalSaveMsg('✅ บันทึกสำเร็จ!');
      setTimeout(() => setPersonalSaveMsg(''), 3000);
    } catch (err) {
      setPersonalSaveMsg('❌ เกิดข้อผิดพลาด');
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await api.get(`/admin/vendors/public/${user.id}/posts`);
      setPosts(res.data);
    } catch (err) { console.log(err); }
  };

  const deletePost = async (id) => {
    if (!window.confirm('ลบโพสต์นี้ไหม?')) return;
    await api.delete(`/posts/${id}`);
    fetchPosts();
  };

  // อัปโหลดหลายรูปพร้อมกันสำหรับสร้างโพสต์
  const handleMultipleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingImages(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('image', file);
       const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://popmarket-api.onrender.com';
       const res = await fetch(`${API_URL}/api/upload/shop`,  {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (data.url) uploadedUrls.push(data.url);
      }
      setPostImages(prev => [...prev, ...uploadedUrls]);
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูป');
    } finally {
      setUploadingImages(false);
    }
  };

  // ถอดรหัสรูปภาพในโพสต์ (รองรับทั้งแบบรูปเดี่ยวและหลายรูปในแบบ JSON)
  const parsePostImages = (imgStr) => {
    if (!imgStr) return [];
    try {
      if (imgStr.startsWith('[')) return JSON.parse(imgStr);
      return [imgStr];
    } catch (e) {
      return [imgStr];
    }
  };

  const fetchBookings = async () => {
    try {
      const resBookings = await api.get('/bookings/my');
      const resSubs = await api.get('/subscriptions/my');

      const formattedBookings = (resBookings.data || []).map(b => ({
        id: `book-${b.id}`,
        market_name: b.market_name || 'ตลาดนัดป๊อปอัพ',
        lock_number: b.lock_number || '-',
        zone: b.zone || '',
        book_date: b.book_date ? b.book_date.slice(0, 10) : '-',
        total_price: Number(b.total_price || 0),
        status: b.status || 'confirmed',
        payment_status: b.status === 'confirmed' ? 'ชำระเงินแล้ว' : 'รอชำระเงิน',
        note: b.note || '',
        raw_date: b.book_date,
        is_subscription: false
      }));

      const formattedSubs = (resSubs.data || []).map(sub => ({
        id: `sub-${sub.id}`,
        market_name: sub.market_name || 'ตลาดนัดป๊อปอัพ',
        lock_number: sub.lock_number || '-',
        zone: sub.zone || '',
        book_date: `ตั้งแต่ ${sub.start_date ? sub.start_date.slice(0, 10) : ''} ถึง ${sub.end_date ? sub.end_date.slice(0, 10) : ''}`,
        total_price: Number(sub.amount > 3000 ? 1650 : (sub.amount || 0)),
        status: sub.status === 'active' ? 'confirmed' : 'pending',
        payment_status: sub.status === 'active' ? 'ชำระเงินแล้ว' : 'รอตรวจสอบ',
        note: sub.note || '',
        raw_date: sub.end_date,
        is_subscription: true
      }));

      const allBookings = [...formattedBookings, ...formattedSubs];
      allBookings.sort((a, b) => new Date(b.raw_date) - new Date(a.raw_date));
      setBookings(allBookings);
    } catch (err) { console.log(err); }
  };

  const fetchActiveBookings = async () => {
    try {
      const res = await api.get('/bookings/vendor/active-bookings');
      const formatted = res.data.map(b => ({
        ...b,
        display_date: b.book_date ? b.book_date.slice(0, 10) : (b.end_date ? b.end_date.slice(0, 10) : '-'),
        checkin_status: b.today_is_open === 0 ? 'absent' : (b.today_is_open === 1 ? 'active' : 'pending')
      }));
      setActiveBookings(formatted.filter(b => new Date(b.end_date || b.book_date) >= new Date(new Date().toDateString())));
    } catch (err) { console.log(err); }
  };

  const fetchMarkets = async () => {
    try {
      const res = await api.get('/markets');
      setMarkets(res.data.filter(m => m.status !== 'suspended'));
    } catch (err) { console.log(err); }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await api.get('/subscriptions/my');
      const formattedSubs = res.data.map(sub => ({
        ...sub,
        status: sub.today_is_open === 0 ? 'absent' : (sub.today_is_open === 1 ? 'active' : sub.status)
      }));
      setSubscriptions(formattedSubs.filter(sub => new Date(sub.end_date) >= new Date(new Date().toDateString())));
    } catch (err) { console.log(err); }
  };

  const toggleSubDates = async (sub) => {
    if (expandedSubId === sub.id) {
      setExpandedSubId(null);
      return;
    }
    setExpandedSubId(sub.id);
    if (!subDatesMap[sub.id]) {
      try {
        const dates = [];
        let curr = new Date(sub.start_date);
        let end = new Date(sub.end_date);
        while (curr <= end) {
          dates.push(curr.toISOString().slice(0, 10));
          curr.setDate(curr.getDate() + 7); 
        }
        setSubDatesMap(prev => ({ ...prev, [sub.id]: dates }));
      } catch (err) {
        setSubDatesMap(prev => ({ ...prev, [sub.id]: [sub.start_date, sub.end_date] }));
      }
    }
  };

  const doCheckin = async (sub, is_open) => {
    setCheckinLoading(true);
    try {
      await api.post('/subscriptions/checkin', {
        stall_id: sub.stall_id,
        market_id: sub.market_id,
        is_open,
      });
      setSubscriptions(prev => 
        prev.map(item => 
          item.id === sub.id ? { ...item, status: is_open ? 'active' : 'absent', is_open: is_open } : item
        )
      );
      alert(is_open ? '🟢 เช็คอินสำเร็จ!' : '🔴 แจ้งไม่มาสำเร็จ');
    } catch (err) { alert('เกิดข้อผิดพลาด'); }
    setCheckinLoading(false);
  };

  const doBookingCheckin = async (b, is_open) => {
  setCheckinLoading(true);
  try {
    await api.post('/subscriptions/checkin', {
      stall_id: b.stall_id,
      market_id: b.market_id,
      is_open,
    });

    // 🟢 อัปเดตสถานะใน State activeBookings ทันทีไม่ต้องรอโหลดใหม่
    setActiveBookings(prev =>
      prev.map(item =>
        item.id === b.id 
          ? { ...item, checkin_status: is_open ? 'active' : 'absent' } 
          : item
      )
    );

    alert(is_open ? '🟢 เช็คอินสำเร็จ!' : '🔴 แจ้งไม่มาสำเร็จ');
  } catch (err) {
    alert('เกิดข้อผิดพลาด');
  }
  setCheckinLoading(false);
};

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const statusColor = (s) => ({
    confirmed: '#1a7a4a', pending: '#f39c12',
    cancelled: '#e74c3c', expired: '#999', rejected: '#e74c3c'
  }[s] || '#999');

  const statusLabel = (s) => ({
    confirmed: 'ยืนยันแล้ว', pending: 'รอดำเนินการ',
    cancelled: 'ยกเลิก', expired: 'หมดอายุ', rejected: 'ปฏิเสธแล้ว'
  }[s] || s);

  const getCategoryName = (cat) => {
    const map = {
      food: '🍕 อาหารและเครื่องดื่ม',
      handmade: '🎨 งานฝีมือ / Handmade',
      fashion: '👗 แฟชั่นและเสื้อผ้า',
      other: '🏷️ สินค้าทั่วไป'
    };
    return map[cat] || cat || 'ทั่วไป';
  };

  const navItems = [
    { key: 'profile', icon: '👤', label: 'ข้อมูลร้านค้า' },
    { key: 'booking', icon: '🔖', label: 'จองพื้นที่ขาย' },
    { key: 'history', icon: '📋', label: 'ประวัติการจอง' },
    { key: 'messages', icon: '💬', label: 'ข้อความแชท' },
  ];

  const submitReport = async () => {
    if (!reportForm.title) { alert('กรุณากรอกหัวข้อปัญหา'); return; }
    try {
      await api.post('/tickets', reportForm);
      alert('ส่งเรื่องสำเร็จ ✅ Admin จะติดต่อกลับเร็วๆ นี้');
      setShowReportModal(false);
      setReportForm({ title:'', description:'', category:'other', priority:'normal' });
    } catch (err) { alert(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
  };

  // ฟังก์ชันแปลงวันที่แบบไทย (เช่น 13 ต.ค. 2569) ตัดเวลา :00:00.000Z ออก
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.split('T')[0]; // กรณีแปลงไม่ได้ให้ตัดเอาเฉพาะ YYYY-MM-DD
  return d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

  return (
    <div style={styles.page}>
      {/* ===== SIDEBAR ===== */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.sidebarLogo}>
            <span style={styles.logoEmoji}>🛒</span>
            <div>
              <div style={styles.logoName}>PopMarket</div>
              <div style={styles.logoRole}>VENDOR</div>
            </div>
          </div>

          <nav style={styles.nav}>
            {navItems.map(item => (
              <div key={item.key}
                style={{
                  ...styles.navItem,
                  ...(tab === item.key ? styles.navItemActive : {})
                }}
                onClick={() => setTab(item.key)}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
                {tab === item.key && <div style={styles.navIndicator} />}
              </div>
            ))}
          </nav>
        </div>

        <div style={styles.sidebarBottom}>
          <div style={styles.logoutBtn} onClick={logout}>
            <span>🚪</span>
            <span>ออกจากระบบ</span>
          </div>
        </div>
        <div style={{marginBottom:'8px'}}>
          <div
            style={{
              padding:'10px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'13px',
              color:'#e67e22', backgroundColor:'#fff9e6', display:'flex', alignItems:'center', gap:'8px',
            }}
            onClick={() => setShowReportModal(true)}
          >
            <span>🆘</span><span>แจ้งปัญหา</span>
          </div>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main style={styles.main}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <Link to="/" style={styles.homeBtn}>← กลับหน้าหลัก</Link>
            <div>
              <h1 style={styles.topbarTitle}>Vendor Dashboard</h1>
              <p style={styles.topbarSub}>จัดการร้านค้าและติดตามการจองของคุณ</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <NotificationBell />

            <div
              style={styles.userChip}
              onClick={() => { setPersonalSaveMsg(''); setShowPersonalModal(true); }}
              title="แก้ไขข้อมูลส่วนตัว"
            >
              <div style={styles.userAvatar}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={styles.userAvatarImg} />
                ) : (
                  user.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div style={styles.userName}>{profile.shop_name || user.name}</div>
                <div style={styles.userBadge}>✅ VERIFIED VENDOR</div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== PROFILE TAB ========== */}
        {tab === 'profile' && (
          <div style={styles.content}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>🏪 โปรไฟล์ร้านค้า</h2>
                  <p style={styles.cardSub}>ข้อมูลร้านค้าที่แสดงให้ลูกค้าและผู้จัดตลาดเห็น</p>
                </div>
                {!editMode && (
                  <button style={styles.editBtn} onClick={() => setEditMode(true)}>
                    ✏️ แก้ไขร้านค้า
                  </button>
                )}
              </div>

              <div style={styles.statsRow}>
                {[
                  { label:'ชื่อร้านค้า', val: profile.shop_name || user.name },
                  { label:'เบอร์โทร', val: user.phone || 'ไม่ระบุ' },
                  { label:'อีเมล', val: user.email },
                  { label:'สถานะ', val: '✅ ยืนยันแล้ว', green: true },
                ].map((s, i) => (
                  <div key={i} style={styles.statBox}>
                    <div style={styles.statLabel}>{s.label}</div>
                    <div style={{...styles.statVal, color: s.green ? '#1a7a4a' : '#222'}}>{s.val}</div>
                  </div>
                ))}
              </div>

              {!editMode ? (
                <div style={styles.profileRow}>
                  <div style={styles.shopAvatarBox}>
                    {profile.logo_url ? (
                      <img 
                        src={profile.logo_url} 
                        alt="shop" 
                        style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'12px', cursor:'pointer'}} 
                        onClick={() => setFullImage(profile.logo_url)}
                        title="คลิกเพื่อดูรูปขนาดเต็ม"
                      />
                    ) : (
                      (profile.shop_name || user.name)?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={styles.shopInfo}>
                    <h3 style={styles.shopName}>{profile.shop_name}</h3>
                    
                    <div style={styles.tagRow}>
                      <span style={styles.tag}>{getCategoryName(profile.category)}</span>
                      <span style={styles.tag}>✅ VERIFIED</span>
                    </div>

                    {/* แสดง LINE ID และ Social Media ของร้าน */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', margin: '8px 0 12px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00c300', fontWeight: '700', backgroundColor: '#f0fbf0', padding: '4px 10px', borderRadius: '6px' }}>
                        <span>💬 LINE ID:</span>
                        <span style={{ color: '#333' }}>{profile.line_id ? `@${profile.line_id.replace('@', '')}` : 'ยังไม่ระบุ'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1877f2', fontWeight: '700', backgroundColor: '#f0f5ff', padding: '4px 10px', borderRadius: '6px' }}>
                        <span>🌐 Social Media:</span>
                        <span style={{ color: '#333' }}>{profile.social_media || 'ยังไม่ระบุ'}</span>
                      </div>
                    </div>

                    <p style={styles.shopDesc}>{profile.description || 'กดแก้ไขร้านค้าเพื่อเพิ่มคำอธิบาย...'}</p>
                  </div>
                </div>
              ) : (
                <div style={styles.editForm}>
                  <div style={styles.editGrid}>
                    <div>
                      <label style={styles.label}>ชื่อร้านค้า *</label>
                      <input style={styles.input} value={profile.shop_name} onChange={e => setProfile({...profile, shop_name: e.target.value})} />
                    </div>
                    <div>
                      <label style={styles.label}>หมวดหมู่สินค้า *</label>
                      <select style={styles.input} value={profile.category} onChange={e => setProfile({...profile, category: e.target.value})}>
                        <option value="food">🍕 อาหารและเครื่องดื่ม</option>
                        <option value="handmade">🎨 งานฝีมือ / Handmade</option>
                        <option value="fashion">👗 แฟชั่นและเสื้อผ้า</option>
                        <option value="other">🏷️ สินค้าทั่วไป</option>
                      </select>
                    </div>
                  </div>

                  {/* ฟิลด์แก้ไข LINE ID และ Social Media */}
                  <div style={styles.editGrid}>
                    <div>
                      <label style={styles.label}>💬 LINE ID</label>
                      <input 
                        style={styles.input} 
                        placeholder="@yourline" 
                        value={profile.line_id} 
                        onChange={e => setProfile({...profile, line_id: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label style={styles.label}>🌐 Social Media (Facebook / IG / TikTok)</label>
                      <input 
                        style={styles.input} 
                        placeholder="เช่น Facebook: หมูทอดป้าแดง หรือ IG: mootod_official" 
                        value={profile.social_media} 
                        onChange={e => setProfile({...profile, social_media: e.target.value})} 
                      />
                    </div>
                  </div>

                  <label style={styles.label}>รูปร้านค้า / โลโก้</label>
                  <ImageUpload type="shop" label="อัปโหลดรูปร้านค้า" onUpload={(url) => setShopLogo(url)} />

                  <label style={styles.label}>คำอธิบายร้านค้า</label>
                  <textarea style={{...styles.input, height:'80px'}} value={profile.description} onChange={e => setProfile({...profile, description: e.target.value})} />

                  <div style={styles.editBtnRow}>
                    <button style={styles.saveBtn} onClick={async () => {
                      await api.put('/auth/profile', { 
                        logo_url: shopLogo || profile.logo_url || null, 
                        shop_name: profile.shop_name, 
                        description: profile.description, 
                        category: profile.category,
                        line_id: profile.line_id,
                        social_media: profile.social_media
                      });
                      setProfile(prev => ({ ...prev, logo_url: shopLogo || prev.logo_url }));
                      setEditMode(false);
                      alert('บันทึกข้อมูลโปรไฟล์ร้านค้าสำเร็จ ✅');
                    }}>💾 บันทึก</button>
                    <button style={styles.cancelBtn} onClick={() => setEditMode(false)}>ยกเลิก</button>
                  </div>
                </div>
              )}
            </div>

            {/* ล็อคที่เข้าร่วม */}
            {(subscriptions.length > 0 || activeBookings.length > 0) && (
              <div style={{...vd.subSection, backgroundColor:'#fff', borderRadius:'14px', padding:'24px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', marginBottom:'16px'}}>
                <h3 style={vd.subTitle}>🔒 ล็อคที่เข้าร่วมทั้งหมด</h3>
                {subscriptions.map(sub => {
                  const expired = new Date(sub.end_date) < new Date();
                  const daysLeft = Math.ceil((new Date(sub.end_date) - new Date()) / 86400000);
                  const isExpanded = expandedSubId === sub.id;

                  return (
                    <div key={`sub-${sub.id}`} style={vd.subCard}>
                      <div style={vd.subInfo}>
                        <div 
                          style={{ ...vd.subName, cursor: 'pointer', color: '#1a7a4a', textDecoration: 'underline' }}
                          onClick={() => toggleSubDates(sub)}
                        >
                          {sub.market_name} <span style={{fontSize:'11px', color:'#1a7a4a', backgroundColor:'#e8f5e9', padding:'2px 8px', borderRadius:'10px', marginLeft:'6px'}}>ล็อคประจำ 🔍</span>
                        </div>
                        <div style={vd.subMeta}>🔒 ล็อค {sub.lock_number} {sub.zone && `Zone ${sub.zone}`}</div>
                        <div style={vd.subMeta}>
                          📅 ตั้งแต่ {sub.start_date?.slice(0,10)} ถึง {sub.end_date?.slice(0,10)}
                          {!expired && <span style={{color:'#1a7a4a', marginLeft:'8px'}}>({daysLeft} วัน)</span>}
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f1f8f5', borderRadius: '8px', border: '1px solid #c8e6c9' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a7a4a', marginBottom: '4px' }}>📌 วันที่เปิดขายในรอบเดือนนี้:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {(subDatesMap[sub.id] || [sub.start_date, sub.end_date]).map((d, i) => (
                                <span key={i} style={{ fontSize: '11px', backgroundColor: '#fff', padding: '2px 8px', borderRadius: '4px', border: '1px solid #d4edda', color: '#155724', fontWeight: '600' }}>
                                  📅 {d}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <span style={{
                          fontSize:'11px', padding:'3px 10px', borderRadius:'20px', fontWeight:'700',
                          backgroundColor: expired ? '#fff0f0' : sub.status==='active' ? '#e8f5e9' : '#fff9e6',
                          color: expired ? '#e74c3c' : sub.status==='active' ? '#1a7a4a' : '#f39c12',
                          display:'block', textAlign:'center', marginBottom:'8px'
                        }}>
                          {expired ? '❌ หมดอายุ' : sub.status==='active' ? '✅ ACTIVE (มาขาย)' : '⏳ รอยืนยัน'}
                        </span>
                        {!expired && (
                          <div style={{display:'flex', gap:'6px'}}>
                            <button style={vd.checkinBtn} onClick={() => doCheckin(sub, 1)} disabled={checkinLoading}>🟢 มาวันนี้</button>
                            <button style={vd.absentBtn} onClick={() => doCheckin(sub, 0)} disabled={checkinLoading}>🔴 ไม่มา</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {activeBookings.map(b => (
                  <div key={`book-${b.id}`} style={vd.subCard}>
                    <div style={vd.subInfo}>
                      <div style={vd.subName}>{b.market_name} <span style={{fontSize:'11px', color:'#3498db', backgroundColor:'#ebf5fb', padding:'2px 8px', borderRadius:'10px', marginLeft:'6px'}}>จองรายวัน</span></div>
                      <div style={vd.subMeta}>🔒 ล็อค {b.lock_number} {b.zone && `Zone ${b.zone}`}</div>
                      <div style={vd.subMeta}>📅 วันที่จองจริง: {b.display_date}</div>
                    </div>
                    <div>
                     <span style={{
                       fontSize: '11px', 
                       padding: '3px 10px', 
                       borderRadius: '20px', 
                       fontWeight: '700',
                        display: 'block', 
                       textAlign: 'center', 
                       marginBottom: '8px',
                      // 🟢 เปลี่ยนสีพื้นหลังและสีตัวหนังสือตามสถานะ
                       backgroundColor: b.checkin_status === 'absent' ? '#ffebee' : b.checkin_status === 'active' ? '#e8f5e9' : '#e8f5e9',
                      color: b.checkin_status === 'absent' ? '#d32f2f' : b.checkin_status === 'active' ? '#1a7a4a' : '#1a7a4a'
                        }}>
                        {b.checkin_status === 'absent' 
                            ? '🔴 วันนี้แจ้งไม่มา' 
                             : b.checkin_status === 'active' 
                         ? '✅ ACTIVE (มาขาย)' 
                         : '✅ ยืนยันการจองแล้ว'
                                  }
                             </span>
                      <div style={{display:'flex', gap:'6px'}}>
                        <button style={vd.checkinBtn} onClick={() => doBookingCheckin(b, 1)} disabled={checkinLoading}>🟢 มาวันนี้</button>
                        <button style={vd.absentBtn} onClick={() => doBookingCheckin(b, 0)} disabled={checkinLoading}>🔴 ไม่มา</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* โพสต์ของร้านค้า */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>📸 โพสต์ของร้านค้า</h3>
              <p style={styles.cardSub}>แชร์เมนูเด็ด สินค้าใหม่ หรือโปรโมชันให้ลูกค้าเห็น</p>
              
              {/* แถบกดสร้างโพสต์แบบเดิม */}
              <div 
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: '16px', padding: '14px 18px', backgroundColor: '#f8f9fa', 
                  borderRadius: '12px', cursor: 'pointer', border: '1px solid #e9ecef',
                  maxWidth: '560px', boxSizing: 'border-box'
                }}
                onClick={() => setShowPostModal(true)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#495057', fontSize: '14px', fontWeight: '500' }}>
                  <span style={{ fontSize: '18px' }}>✨</span>
                  <span>แชร์เรื่องราว โปรโมชัน หรือสินค้าใหม่ของคุณที่นี่...</span>
                </div>
                <div style={{
                  backgroundColor: '#1a7a4a', color: '#fff', padding: '8px 16px', 
                  borderRadius: '8px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap'
                }}>
                  + สร้างโพสต์ใหม่
                </div>
              </div>

              {/* ฟีดแสดงโพสต์ */}
              <div style={{display:'flex', flexDirection:'column', gap:'16px', marginTop:'20px', maxWidth:'560px'}}> 
                {posts.map(p => {
                  const imgs = parsePostImages(p.image_url);
                  return (
                    <div key={p.id} style={{
                      padding:'18px', border:'1px solid #eaeaea', borderRadius:'14px', 
                      backgroundColor:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px'}}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
                            {profile.logo_url ? <img src={profile.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (profile.shop_name || user.name)?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{fontWeight:'700', color:'#212529', fontSize:'14px'}}>{profile.shop_name || user.name}</span>
                            <div style={{fontSize:'11px', color:'#888'}}>
                              {new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        
                        {p.feeling && (
                          <span style={{backgroundColor:'#e8f5e9', color:'#1a7a4a', padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:'600'}}>
                            {p.feeling}
                          </span>
                        )}
                      </div>

                      <p style={{fontSize:'14px', color:'#343a40', margin:'0 0 12px', lineHeight:'1.5', whiteSpace:'pre-wrap'}}>{p.caption}</p>

                      {/* แสดงรูปภาพแบบ Grid */}
                      {imgs.length > 0 && (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: imgs.length === 1 ? '1fr' : 'repeat(2, 1fr)',
                          gap: '4px',
                          borderRadius: '10px',
                          overflow: 'hidden',
                          marginBottom: '12px'
                        }}>
                          {imgs.map((url, i) => (
                            <img 
                              key={i} 
                              src={url} 
                              alt={`post-${i}`} 
                              style={{ 
                                width: '100%', 
                                height: imgs.length === 1 ? 'auto' : '180px', 
                                maxHeight: '420px', 
                                objectFit: 'cover', 
                                cursor: 'pointer' 
                              }}
                              onClick={() => setFullImage(url)}
                            />
                          ))}
                        </div>
                      )}
                      
                      <div style={{display:'flex', justifyContent:'flex-end', borderTop:'1px solid #f8f9fa', paddingTop:'8px'}}>
                        <button 
                          style={{border:'none', backgroundColor:'#fff5f5', color:'#e53e3e', padding:'6px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor:'pointer'}} 
                          onClick={() => deletePost(p.id)}
                        >
                          🗑️ ลบโพสต์
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* MODAL: สร้างโพสต์ใหม่ พร้อมรองรับหลายรูปภาพ */}
            {showPostModal && (
              <div style={styles.overlay} onClick={() => setShowPostModal(false)}>
                <div style={{...styles.modal, width:'500px', maxWidth:'95vw', padding:'20px', borderRadius:'16px'}} onClick={e => e.stopPropagation()}>
                  
                  {/* Header */}
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #e4e6eb', paddingBottom:'12px', marginBottom:'14px'}}>
                    <h3 style={{fontSize:'18px', fontWeight:'800', color:'#050505', margin:0, textAlign:'center', flex:1}}>สร้างโพสต์ใหม่</h3>
                    <button style={{background:'#e4e6eb', border:'none', width:'32px', height:'32px', borderRadius:'50%', cursor:'pointer', fontSize:'16px', fontWeight:'bold'}} onClick={() => setShowPostModal(false)}>✕</button>
                  </div>

                  {/* หมวดหมู่ / สถานะ */}
                  <div style={{marginBottom:'14px'}}>
                    <label style={{display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'6px'}}>🏷️ หมวดหมู่โพสต์</label>
                    <select 
                      style={{width:'100%', fontSize:'13px', backgroundColor:'#f8f9fa', color:'#212529', border:'1px solid #ced4da', borderRadius:'10px', padding:'10px 12px', fontWeight:'600', outline:'none', cursor:'pointer'}}
                      value={postFeeling}
                      onChange={e => setPostFeeling(e.target.value)}
                    >
                      <option value="">เลือกหมวดหมู่หรือสถานะ (ไม่บังคับ)</option>
                      <option value="🔥 กำลังจัดโปรโมชันพิเศษ">🔥 กำลังจัดโปรโมชันพิเศษ</option>
                      <option value="✨ เมนูแนะนำ / Best Seller">✨ เมนูแนะนำ / Best Seller</option>
                      <option value="🎉 เปิดร้านพร้อมขายแล้ววันนี้">🎉 เปิดร้านพร้อมขายแล้ววันนี้</option>
                      <option value="⏳ สินค้ามีจำนวนจำกัด">⏳ สินค้ามีจำนวนจำกัด</option>
                    </select>
                  </div>

                  {/* Caption Textarea (ใช้ข้อความเดิมตามที่ต้องการ) */}
                  <textarea 
                    style={{
                      width:'100%', border:'1px solid #ced4da', borderRadius:'10px',
                      padding:'12px', outline:'none', fontSize:'14px', minHeight:'110px',
                      resize:'none', fontFamily:"'Sarabun', sans-serif", boxSizing:'border-box',
                      marginBottom:'14px'
                    }} 
                    placeholder="เขียนข้อความหรือรายละเอียดโปรโมชันของคุณที่นี่..." 
                    value={postCaption} 
                    onChange={e => setPostCaption(e.target.value)} 
                  />

                  {/* พรีวิวรูปภาพหลายใบ */}
                  {postImages.length > 0 && (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: postImages.length === 1 ? '1fr' : 'repeat(2, 1fr)', 
                      gap: '6px', 
                      maxHeight: '260px', 
                      overflowY: 'auto', 
                      marginBottom: '14px', 
                      padding: '8px', 
                      backgroundColor: '#f7f8fa', 
                      borderRadius: '10px' 
                    }}>
                      {postImages.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', height: '120px', borderRadius: '8px', overflow: 'hidden' }}>
                          <img src={url} alt={`upload-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button 
                            type="button" 
                            style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '11px' }}
                            onClick={() => setPostImages(postImages.filter((_, i) => i !== idx))}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ส่วนแนบรูปภาพหลายใบ */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid #ced4da', borderRadius: '10px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#050505' }}>แนบรูปภาพประกอบ</span>
                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#45bd62', fontWeight: '600' }}>
                      <span style={{ fontSize: '20px' }}>🖼️</span> เลือกรูปภาพ (หลายรูปได้)
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        onChange={handleMultipleImageUpload} 
                        disabled={uploadingImages}
                      />
                    </label>
                  </div>

                  {uploadingImages && (
                    <div style={{ fontSize: '12px', color: '#1a7a4a', textAlign: 'center', marginBottom: '10px' }}>
                      ⏳ กำลังอัปโหลดรูปภาพ...
                    </div>
                  )}

                  <button 
                    style={{
                      width:'100%', padding:'12px', backgroundColor: (postCaption || postImages.length > 0) ? '#1a7a4a' : '#e4e6eb',
                      color: (postCaption || postImages.length > 0) ? '#fff' : '#bcc0c4', border:'none', borderRadius:'8px',
                      fontSize:'15px', fontWeight:'700', cursor: (postCaption || postImages.length > 0) ? 'pointer' : 'not-allowed'
                    }} 
                    onClick={async () => {
                      if (!postCaption && postImages.length === 0) return alert('กรุณาใส่ข้อความหรือรูปภาพก่อนโพสต์');
                      setPostLoading(true);
                      try {
                        const imgPayload = postImages.length > 0 ? JSON.stringify(postImages) : '';
                        await api.post('/posts', { caption: postCaption, image_url: imgPayload, feeling: postFeeling });
                        setPostCaption('');
                        setPostImages([]);
                        setPostFeeling('');
                        fetchPosts();
                        setShowPostModal(false);
                      } catch (err) { alert('เกิดข้อผิดพลาดในการโพสต์'); }
                      setPostLoading(false);
                    }} 
                    disabled={postLoading || (!postCaption && postImages.length === 0)}
                  >
                    {postLoading ? '⏳ กำลังเผยแพร่...' : 'เผยแพร่โพสต์'}
                  </button>
                </div>
              </div>
            )}
          </div>  
        )}        

        {/* ========== BOOKING TAB ========== */}
        {tab === 'booking' && (
          <div style={styles.content}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>🔖 จองพื้นที่ขาย</h2>
                  <p style={styles.cardSub}>เลือกตลาดที่ต้องการจองพื้นที่ขาย</p>
                </div>
                <input style={styles.searchInput} placeholder="🔍 ค้นหาตลาด..." />
              </div>

              {markets.length === 0 ? (
                <div style={styles.emptyBox}>
                  <p style={styles.emptyEmoji}>🏪</p>
                  <p style={styles.emptyText}>ยังไม่มีตลาดที่เปิดรับจอง</p>
                </div>
              ) : (
                <div style={styles.marketList}>
                  {markets.map(m => (
                    <div key={m.id} style={styles.marketItem}>
                      <div style={styles.marketThumb}>🏪</div>
                      <div style={styles.marketInfo}>
                        <h4 style={styles.marketName}>{m.name}</h4>
                        <div style={styles.marketMeta}>
                          <span>🗓️ {formatDate(m.start_date)} — {formatDate(m.end_date)}</span>
                          <span>📍 {m.address || m.province || 'ไม่ระบุ'}</span>
                        </div>
                      </div>
                      <div style={styles.marketActions}>
                        <span style={styles.activeBadge}>🟢 ACTIVE</span>
                        <Link to={`/book/${m.id}`} style={styles.bookNowBtn}>เลือกจอง →</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== HISTORY TAB ========== */}
        {tab === 'history' && (
          <div style={styles.content}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={styles.cardTitle}>📋 My Bookings</h2>
                  <p style={styles.cardSub}>ประวัติการจองพื้นที่ขายทั้งหมด</p>
                </div>
                <span style={styles.totalBadge}>{bookings.length} รายการ</span>
              </div>

              {bookings.length === 0 ? (
                <div style={styles.emptyBox}>
                  <p style={styles.emptyEmoji}>📋</p>
                  <p style={styles.emptyText}>ยังไม่มีประวัติการจอง</p>
                  <button style={styles.goBookBtn} onClick={() => setTab('booking')}>จองพื้นที่ตอนนี้ →</button>
                </div>
              ) : (
                <div style={styles.bookingList}>
                  {bookings.map(b => (
                    <div key={b.id} style={styles.bookingItem}>
                      <div style={styles.bookingLeft}>
                        <div style={styles.bookingIconBox}>📅</div>
                        <div>
                          <h4 style={styles.bookingMarket}>
                            {b.market_name} 
                            {b.is_subscription && <span style={{fontSize:'10px', color:'#1a7a4a', backgroundColor:'#e8f5e9', padding:'2px 6px', borderRadius:'10px', marginLeft:'6px'}}>ล็อคประจำ</span>}
                          </h4>
                          <p style={styles.bookingDetail}>
                            ล็อค {b.lock_number}
                            {b.zone && ` • Zone ${b.zone}`}
                            {' • '}{b.book_date}
                          </p>
                          <p style={styles.bookingPrice}>฿{b.total_price}</p>
                        </div>
                      </div>
                      
                      <div style={{ ...styles.bookingRight, display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                        <span style={{
                          ...styles.statusChip,
                          backgroundColor: statusColor(b.status) + '18',
                          color: statusColor(b.status),
                          border: `1px solid ${statusColor(b.status)}40`,
                        }}>
                          {statusLabel(b.status)}
                        </span>

                        {/* แสดงเหตุผลที่ถูกปฏิเสธ หากผู้จัดตลาดไม่อนุมัติ */}
                        {(b.status === 'cancelled' || b.status === 'rejected') && b.note && b.note.includes('[เหตุผลที่ปฏิเสธ:') && (
                          <div style={{
                            backgroundColor: '#fff0f0', color: '#c0392b', fontSize: '11px',
                            padding: '6px 10px', borderRadius: '6px', border: '1px solid #ffd0d0',
                            marginTop: '2px', maxWidth: '280px', textAlign: 'left'
                          }}>
                            ⚠️ <strong>เหตุผลที่ปฏิเสธ:</strong> {b.note.match(/\[เหตุผลที่ปฏิเสธ:\s*([^\]]+)\]/)?.[1] || 'ไม่ผ่านเกณฑ์'}
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button style={styles.detailBtn} onClick={() => setSelectedBooking(b)}>
                            ดูรายละเอียด
                          </button>

                          {b.status === 'pending' && !b.is_subscription && (
                            <button 
                              style={{
                                padding: '6px 12px', backgroundColor: '#e74c3c', color: '#fff',
                                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
                              }}
                              onClick={() => setCancelModalBooking(b)}
                            >
                              ยกเลิก
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== MESSAGES TAB ========== */}
        {tab === 'messages' && (
          <div style={styles.content}>
            <div style={{ display: 'flex', height: '75vh', backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ width: '320px', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', fontWeight: '800', fontSize: '15px', color: '#222' }}>
                  💬 ข้อความจากลูกค้า ({conversations.length})
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {conversations.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#aaa', padding: '32px', fontSize: '13px' }}>ยังไม่มีข้อความจากลูกค้า</p>
                  ) : (
                    conversations.map(c => (
                      <div 
                        key={c.user_id} 
                        onClick={() => setChatPartner({ id: c.user_id, name: c.shop_name || c.name })}
                        style={{ 
                          padding: '14px 18px', cursor: 'pointer', borderBottom: '1px solid #f8f9fa', 
                          backgroundColor: chatPartner.id === c.user_id ? '#e8f5e9' : 'transparent', 
                          transition: 'background 0.2s' 
                        }}
                      >
                        <div style={{ fontWeight: '700', fontSize: '14px', color: '#222' }}>{c.shop_name || c.name}</div>
                        <div style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '4px' }}>
                          {c.last_message || 'ส่งรูปภาพ'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fcfcfc', position: 'relative' }}>
                {chatPartner.id ? (
                  <InlineChatBox receiverId={chatPartner.id} receiverName={chatPartner.name} onMessageSent={fetchConversations} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa' }}>
                    <span style={{ fontSize: '36px', marginBottom: '8px' }}>💬</span>
                    <p style={{ fontSize: '14px', margin: 0 }}>เลือกรายชื่อลูกค้าทางด้านซ้ายเพื่อเริ่มสนทนา</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ===== MODAL: ข้อมูลส่วนตัว ===== */}
      {showPersonalModal && (
        <div style={styles.overlay} onClick={() => setShowPersonalModal(false)}>
          <div style={{...styles.modal, width:'480px', maxWidth:'92vw'}} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>👤 ข้อมูลส่วนตัว</h3>
                <p style={{fontSize:'12px', color:'#888', margin:'2px 0 0'}}>แก้ไขชื่อและเบอร์โทรศัพท์ของคุณ</p>
              </div>
              <button style={styles.modalClose} onClick={() => setShowPersonalModal(false)}>✕</button>
            </div>

            <div style={styles.userEditGrid}>
              <div>
                <div style={styles.avatarSection}>
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="avatar" 
                      style={{...styles.avatarImg, cursor:'pointer'}} 
                      onClick={() => setFullImage(avatarUrl)}
                    />
                  ) : (
                    <div style={styles.avatarPlaceholder}>{user.name?.charAt(0).toUpperCase()}</div>
                  )}
                  <ImageUpload
                    type="avatar"
                    label="เปลี่ยนรูปโปรไฟล์"
                    onUpload={async (url) => {
                      setAvatarUrl(url);
                      await api.put('/auth/profile', { avatar_url: url });
                    }}
                  />
                </div>
              </div>

              <div style={styles.userFields}>
                <label style={styles.label}>ชื่อ / ชื่อเล่น</label>
                <input style={styles.input} value={userEdit.name} onChange={e => setUserEdit({...userEdit, name: e.target.value})} placeholder="ชื่อของคุณ" />

                <label style={styles.label}>เบอร์โทรศัพท์</label>
                <input style={styles.input} value={userEdit.phone} onChange={e => setUserEdit({...userEdit, phone: e.target.value})} placeholder="0xx-xxx-xxxx" />

                <label style={styles.label}>อีเมล</label>
                <input style={{...styles.input, backgroundColor:'#f5f5f5', color:'#888'}} value={user.email} disabled />

                {personalSaveMsg && <div style={styles.successBox}>{personalSaveMsg}</div>}

                <button style={styles.saveBtn} onClick={saveUserInfo}>💾 บันทึกข้อมูล</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: รายละเอียดการจอง (ดึงหมวดหมู่ Category จริง ไม่ฮาร์ดโค้ด) ===== */}
      {selectedBooking && (
        <div style={styles.overlay} onClick={() => setSelectedBooking(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>รายละเอียดการจอง</h3>
              <button style={styles.modalClose} onClick={() => setSelectedBooking(null)}>✕</button>
            </div>
            {[
              { k: 'MARKET', v: selectedBooking.market_name },
              { k: 'LOCK NUMBER', v: selectedBooking.lock_number },
              { k: 'ZONE', v: selectedBooking.zone || '-' },
              { k: 'วันที่', v: selectedBooking.book_date },
              { k: 'PRICE', v: `฿${selectedBooking.total_price}` },
              { k: 'CATEGORY', v: getCategoryName(profile.category) },
              { k: 'PAYMENT', v: selectedBooking.payment_status || 'รอชำระเงิน' },
            ].map((row, i) => (
              <div key={i} style={styles.modalRow}>
                <span style={styles.modalKey}>{row.k}</span>
                <span style={{...styles.modalVal, color: row.k === 'PAYMENT' ? '#1a7a4a' : '#222'}}>
                  {row.v}
                </span>
              </div>
            ))}
            <button style={styles.modalCloseBtn} onClick={() => setSelectedBooking(null)}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}

      {/* ===== MODAL: ยืนยันการยกเลิกการจอง ===== */}
      {cancelModalBooking && (
        <div style={styles.overlay} onClick={() => setCancelModalBooking(null)}>
          <div style={{...styles.modal, maxWidth:'420px', padding:'0', overflow:'hidden'}} onClick={e => e.stopPropagation()}>
            <div style={{backgroundColor:'#fff0f0', padding:'20px 24px', borderBottom:'1px solid #ffd0d0'}}>
              <h3 style={{fontSize:'18px', fontWeight:'800', color:'#e74c3c', margin:'0 0 4px'}}>⚠️ ยืนยันการยกเลิกการจอง?</h3>
              <p style={{fontSize:'12px', color:'#e74c3c', margin:0}}>กรุณาตรวจสอบรายละเอียดให้แน่ใจก่อนกดยืนยัน</p>
            </div>
            
            <div style={{padding:'24px'}}>
              <div style={{backgroundColor:'#f8f9fa', borderRadius:'10px', padding:'16px', marginBottom:'16px'}}>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                  <span style={{fontSize:'13px', color:'#888'}}>ตลาด:</span>
                  <span style={{fontSize:'14px', fontWeight:'700', color:'#222'}}>{cancelModalBooking.market_name}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                  <span style={{fontSize:'13px', color:'#888'}}>ล็อค:</span>
                  <span style={{fontSize:'14px', fontWeight:'700', color:'#1a7a4a'}}>LOCK {cancelModalBooking.lock_number} {cancelModalBooking.zone && `(Zone ${cancelModalBooking.zone})`}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                  <span style={{fontSize:'13px', color:'#888'}}>วันที่จอง:</span>
                  <span style={{fontSize:'13px', fontWeight:'600', color:'#222'}}>{cancelModalBooking.book_date}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', borderTop:'1px dashed #ddd', paddingTop:'8px', marginTop:'4px'}}>
                  <span style={{fontSize:'13px', color:'#888'}}>ยอดชำระ:</span>
                  <span style={{fontSize:'15px', fontWeight:'800', color:'#e74c3c'}}>฿{cancelModalBooking.total_price}</span>
                </div>
              </div>

              <div style={{display:'flex', gap:'10px'}}>
                <button 
                  style={{...styles.cancelBtn, backgroundColor:'#e74c3c', color:'#fff', fontWeight:'700'}}
                  onClick={async () => {
                    try {
                      await api.delete(`/bookings/${cancelModalBooking.id.replace('book-', '')}`);
                      alert('ยกเลิกการจองสำเร็จ ✅');
                      fetchBookings();
                      setCancelModalBooking(null);
                    } catch (err) {
                      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการยกเลิก');
                    }
                  }}
                >
                  ยืนยันการยกเลิก
                </button>
                <button style={{...styles.cancelBtn, backgroundColor:'#f0f0f0'}} onClick={() => setCancelModalBooking(null)}>
                  กลับไปหน้าเดิม
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: แจ้งปัญหา ===== */}
      {showReportModal && (
        <div style={styles.overlay}>
          <div style={{...styles.modal, maxWidth:'440px'}}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🆘 แจ้งปัญหา / ขอความช่วยเหลือ</h3>
              <button style={styles.modalClose} onClick={() => setShowReportModal(false)}>✕</button>
            </div>

            <label style={styles.label}>หัวข้อปัญหา *</label>
            <input style={styles.input} placeholder="เช่น: ชำระเงินแล้วแต่ยังไม่ได้รับการยืนยัน" value={reportForm.title} onChange={e => setReportForm({...reportForm, title: e.target.value})} />

            <label style={styles.label}>รายละเอียด</label>
            <textarea style={{...styles.input, height:'80px', resize:'vertical'}} placeholder="อธิบายปัญหาเพิ่มเติม..." value={reportForm.description} onChange={e => setReportForm({...reportForm, description: e.target.value})} />

            <div style={styles.modalBtnRow}>
              <button style={styles.saveBtn} onClick={submitReport}>📨 ส่งเรื่อง</button>
              <button style={styles.cancelBtn} onClick={() => setShowReportModal(false)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: แสดงรูปภาพขนาดเต็ม (Lightbox) ===== */}
      {fullImage && (
        <div style={styles.overlay} onClick={() => setFullImage(null)}>
          <div style={{ ...styles.modal, maxWidth: '800px', width: '100%', textAlign: 'center', backgroundColor: 'transparent', boxShadow: 'none' }} onClick={e => e.stopPropagation()}>
            <img src={fullImage} alt="Full Size" style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }} />
            <button style={{ ...styles.cancelBtn, marginTop: '12px', maxWidth: '120px', marginLeft: 'auto', marginRight: 'auto', display: 'block', backgroundColor: '#222', color: '#fff' }} onClick={() => setFullImage(null)}>
              ปิดรูปภาพ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// 💬 Inline Chat Box Component
function InlineChatBox({ receiverId, receiverName, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/messages/${receiverId}`);
      setMessages(res.data);
    } catch (err) { console.log(err); }
  };

  const sendMessage = async (imageUrl = null) => {
    if (!text.trim() && !imageUrl) return;
    try {
      await api.post('/messages', {
        receiver_id: receiverId,
        message: text,
        image_url: imageUrl,
      });
      setText('');
      fetchMessages();
      if (onMessageSent) onMessageSent();
    } catch (err) { alert('ส่งข้อความไม่สำเร็จ'); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.url) await sendMessage(res.data.url);
    } catch (err) { alert('อัปโหลดรูปภาพไม่สำเร็จ'); }
    setUploading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fff' }}>
      <div style={{ padding: '14px 20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', fontWeight: '700', fontSize: '14px', color: '#222' }}>
        กำลังสนทนากับ: <span style={{ color: '#1a7a4a' }}>{receiverName}</span>
      </div>

      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#fafbfc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.map((m, idx) => {
          const isMe = m.sender_id !== receiverId;
          return (
            <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '65%', padding: '10px 14px', borderRadius: '12px',
                backgroundColor: isMe ? '#1a7a4a' : '#fff',
                color: isMe ? '#fff' : '#212529',
                fontSize: '13px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                border: isMe ? 'none' : '1px solid #eee'
              }}>
                {m.image_url && (
                  <img src={m.image_url} alt="chat-img" style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', marginBottom: m.message ? '8px' : '0' }} />
                )}
                {m.message && <span>{m.message}</span>}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '14px 20px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fff' }}>
        <label style={{ fontSize: '20px', cursor: 'pointer', padding: '4px' }} title="แนบรูปภาพ">
          📷
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </label>
        
        <input 
          type="text" 
          style={{ flex: 1, padding: '10px 16px', border: '1px solid #ced4da', borderRadius: '20px', outline: 'none', fontSize: '13px', backgroundColor: '#f8f9fa' }} 
          placeholder={uploading ? "กำลังอัปโหลดรูป..." : "พิมพ์ข้อความตอบกลับ..."}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          disabled={uploading}
        />
        
        <button 
          style={{ backgroundColor: '#1a7a4a', color: '#fff', border: 'none', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', boxShadow: '0 2px 5px rgba(26,122,74,0.3)' }} 
          onClick={() => sendMessage()} 
          disabled={uploading}
        >
          ➤
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'Sarabun', sans-serif", backgroundColor: '#f4f6f9' },
  sidebar: { width: '230px', backgroundColor: '#fff', boxShadow: '2px 0 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 },
  sidebarTop: { flex: 1, overflow: 'hidden' },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px', padding: '22px 20px', borderBottom: '1px solid #f0f0f0' },
  logoEmoji: { fontSize: '26px' },
  logoName: { fontSize: '16px', fontWeight: '800', color: '#1a7a4a' },
  logoRole: { fontSize: '9px', color: '#aaa', letterSpacing: '2px', fontWeight: '600' },
  nav: { padding: '12px 0' },
  navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', cursor: 'pointer', fontSize: '14px', color: '#666', position: 'relative', transition: 'all 0.15s', margin: '2px 8px', borderRadius: '8px' },
  navItemActive: { backgroundColor: '#e8f5e9', color: '#1a7a4a', fontWeight: '700' },
  navIcon: { fontSize: '16px', width: '20px', textAlign: 'center' },
  navIndicator: { position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '20px', backgroundColor: '#1a7a4a', borderRadius: '2px 0 0 2px' },
  sidebarBottom: { padding: '16px', borderTop: '1px solid #f0f0f0' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#e74c3c', backgroundColor: '#fff5f5' },
  main: { marginLeft: '230px', flex: 1, padding: '24px', minHeight: '100vh' },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', backgroundColor: '#fff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  topbarLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  topbarTitle: { fontSize: '20px', fontWeight: '800', margin: '0 0 2px', color: '#222' },
  topbarSub: { fontSize: '13px', color: '#888', margin: 0 },
  homeBtn: { fontSize: '12px', color: '#1a7a4a', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  userChip: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '6px 10px', borderRadius: '10px', transition: 'background-color 0.15s' },
  userAvatar: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', overflow: 'hidden', flexShrink: 0 },
  userAvatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  userName: { fontSize: '14px', fontWeight: '700', color: '#222' },
  userBadge: { fontSize: '10px', color: '#1a7a4a', fontWeight: '600' },
  content: {},
  card: { backgroundColor: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  cardTitle: { fontSize: '17px', fontWeight: '800', margin: '0 0 4px', color: '#222' },
  cardSub: { fontSize: '13px', color: '#888', margin: 0 },
  editBtn: { padding: '8px 16px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  userEditGrid: { display: 'grid', gridTemplateColumns: '160px 1fr', gap: '24px', alignItems: 'start' },
  avatarSection: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  avatarImg: { width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #e8f5e9' },
  avatarPlaceholder: { width: '110px', height: '110px', borderRadius: '50%', backgroundColor: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '42px', fontWeight: '800' },
  userFields: { display: 'flex', flexDirection: 'column' },
  successBox: { backgroundColor: '#e8f5e9', color: '#1a7a4a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '12px', fontWeight: '600' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '10px', marginBottom: '20px' },
  statBox: {},
  statLabel: { fontSize: '11px', color: '#aaa', marginBottom: '4px' },
  statVal: { fontSize: '13px', fontWeight: '700' },
  profileRow: { display: 'flex', gap: '20px', alignItems: 'flex-start' },
  shopAvatarBox: { width: '100px', height: '100px', borderRadius: '12px', backgroundColor: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: '800', flexShrink: 0 },
  shopInfo: { flex: 1 },
  shopName: { fontSize: '20px', fontWeight: '800', margin: '0 0 8px', color: '#222' },
  tagRow: { display: 'flex', gap: '8px', marginBottom: '10px' },
  tag: { fontSize: '11px', padding: '4px 12px', backgroundColor: '#e8f5e9', color: '#1a7a4a', borderRadius: '20px', fontWeight: '700' },
  shopDesc: { fontSize: '14px', color: '#666', lineHeight: 1.6, margin: 0 },
  editForm: { marginTop: '4px' },
  editGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fafafa', marginBottom: '12px' },
  editBtnRow: { display: 'flex', gap: '10px' },
  saveBtn: { padding: '10px 20px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  cancelBtn: { padding: '10px 20px', backgroundColor: '#f0f0f0', color: '#555', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' },
  emptyBox: { textAlign: 'center', padding: '40px', color: '#999' },
  emptyEmoji: { fontSize: '40px', margin: '0 0 8px' },
  emptyText: { fontSize: '14px', margin: '0 0 16px' },
  goBookBtn: { padding: '10px 20px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' },
  searchInput: { padding: '9px 16px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '13px', outline: 'none', width: '200px' },
  marketList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  marketItem: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '1px solid #eee' },
  marketThumb: { width: '56px', height: '56px', backgroundColor: '#e8f5e9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 },
  marketInfo: { flex: 1 },
  marketName: { fontSize: '15px', fontWeight: '700', margin: '0 0 4px', color: '#222' },
  marketMeta: { display: 'flex', gap: '16px', fontSize: '12px', color: '#888' },
  marketActions: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' },
  activeBadge: { fontSize: '11px', color: '#1a7a4a', fontWeight: '600' },
  bookNowBtn: { padding: '8px 16px', backgroundColor: '#1a7a4a', color: '#fff', textDecoration: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' },
  totalBadge: { fontSize: '12px', backgroundColor: '#e8f5e9', color: '#1a7a4a', padding: '4px 12px', borderRadius: '20px', fontWeight: '700' },
  bookingList: { display: 'flex', flexDirection: 'column' },
  bookingItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid #f5f5f5' },
  bookingLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  bookingIconBox: { width: '44px', height: '44px', backgroundColor: '#e8f5e9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  bookingMarket: { fontSize: '14px', fontWeight: '700', margin: '0 0 3px', color: '#222' },
  bookingDetail: { fontSize: '12px', color: '#888', margin: '0 0 3px' },
  bookingPrice: { fontSize: '13px', fontWeight: '700', color: '#1a7a4a', margin: 0 },
  bookingRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  statusChip: { fontSize: '12px', padding: '5px 12px', borderRadius: '20px', fontWeight: '700' },
  detailBtn: { padding: '7px 14px', backgroundColor: '#f0f0f0', color: '#555', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  modalRow: { display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #f5f5f5' },
  modalKey: { fontSize: '11px', color: '#aaa', fontWeight: '700', letterSpacing: '0.5px' },
  modalVal: { fontSize: '13px', fontWeight: '700' },
  modalCloseBtn: { width: '100%', marginTop: '16px', padding: '11px', backgroundColor: '#f5f5f5', color: '#555', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '380px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  modalTitle: { fontSize: '16px', fontWeight: '800', margin: 0, color: '#222' },
  modalClose: { background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#aaa' },
  modalBtnRow: { display: 'flex', gap: '10px', marginTop: '8px' },
};

const vd = {
  subSection: { marginTop:'20px' },
  subTitle: { fontSize:'16px', fontWeight:'800', color:'#222', margin:'0 0 12px' },
  subCard: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px', backgroundColor:'#f8f9fa', borderRadius:'12px', marginBottom:'10px' },
  subInfo: {},
  subName: { fontSize:'14px', fontWeight:'800', color:'#222', marginBottom:'4px' },
  subMeta: { fontSize:'12px', color:'#888', marginBottom:'2px' },
  checkinBtn: { padding:'6px 12px', backgroundColor:'#e8f5e9', color:'#1a7a4a', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'700' },
  absentBtn: { padding:'6px 12px', backgroundColor:'#fff0f0', color:'#e74c3c', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'700' },
};

export default VendorDashboard;