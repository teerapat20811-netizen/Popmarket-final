import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import ImageUpload from '../components/ImageUpload';

function AdminDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [tab, setTab] = useState('dashboard');
  const [subTab, setSubTab] = useState('all');
  const [markets, setMarkets] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [showMarketDetail, setShowMarketDetail] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [bookingFilter, setBookingFilter] = useState('all');
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [notifSending, setNotifSending] = useState(false);
  const [ticketNote, setTicketNote] = useState('');
  const [pendingVendors, setPendingVendors] = useState([]);
  
  // ระบบคำขอสมัครผู้จัดการตลาด
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showAppModal, setShowAppModal] = useState(false);
  const [appNote, setAppNote] = useState('');
  const [selectedVendorApp, setSelectedVendorApp] = useState(null);
  const [showVendorAppModal, setShowVendorAppModal] = useState(false);

  // State สำหรับรูปภาพขนาดเต็ม และจัดการข้อมูลผู้ใช้เชิงลึก
  const [fullImage, setFullImage] = useState(null);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login');
    if (user.role !== 'admin') navigate('/');
    fetchMarkets();
    fetchUsers();
    fetchBookings();
    fetchStats();
    fetchTickets();
    fetchApplications();
    fetchSettings();
    fetchFeePayments();
    fetchPendingVendors();
  }, []);

  const fetchMarkets = async () => {
    try {
      const res = await api.get('/markets');
      setMarkets(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchBookings = async () => {
    try {
      const res = await api.get('/admin/bookings');
      setBookings(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) { console.log(err); }
  };

  const approveMarket = async (id) => {
    try {
      const market = markets.find(m => m.id === id);
      await api.put(`/markets/${id}`, {
        name: market.name,
        description: market.description || '',
        start_date: market.start_date,
        end_date: market.end_date,
        open_time: market.open_time || null,
        close_time: market.close_time || null,
        address: market.address || null,
        province: market.province || null,
        lat: market.lat || null,
        lng: market.lng || null,
        status: 'active',
      });
      alert('อนุมัติตลาดสำเร็จ ✅');
      fetchMarkets();
      setShowMarketDetail(false);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    }
  };

  const rejectMarket = async (id) => {
    if (!window.confirm('ต้องการปฏิเสธตลาดนี้ไหม?')) return;
    try {
      const market = markets.find(m => m.id === id);
      await api.put(`/markets/${id}`, {
        name: market.name,
        description: market.description || '',
        start_date: market.start_date,
        end_date: market.end_date,
        open_time: market.open_time || null,
        close_time: market.close_time || null,
        address: market.address || null,
        province: market.province || null,
        lat: market.lat || null,
        lng: market.lng || null,
        status: 'suspended',
      });
      alert('ปฏิเสธตลาดแล้ว');
      fetchMarkets();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    }
  };

  const toggleFeatured = async (market) => {
    try {
      await api.put(`/markets/${market.id}`, {
        ...market,
        is_featured: !market.is_featured,
      });
      fetchMarkets();
    } catch (err) { console.log(err); }
  };

  const reactivateMarket = async (id) => {
    try {
      const market = markets.find(m => m.id === id);
      await api.put(`/markets/${id}`, {
        ...market,
        status: 'active',
      });
      alert('เปิดใช้งานตลาดอีกครั้งแล้ว ✅');
      fetchMarkets();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    }
  };

  const deleteMarketAdmin = async (id) => {
    if (!window.confirm('ต้องการลบตลาดนี้ออกจากระบบไหม? การลบไม่สามารถย้อนกลับได้')) return;
    try {
      await api.delete(`/markets/${id}`);
      alert('ลบตลาดสำเร็จ ✅');
      fetchMarkets();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await api.get('/admin/tickets');
      setTickets(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchApplications = async () => {
    try {
      const res = await api.get('/admin/applications');
      setApplications(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchPendingVendors = async () => {
    try {
      const res = await api.get('/admin/pending-vendors');
      setPendingVendors(res.data);
    } catch (err) { console.log(err); }
  };

  // อนุมัติ / ปฏิเสธ คำขอ Organizer พร้อมส่ง Note
  const handleApplication = async (id, action, note) => {
    try {
      const res = await api.put(`/admin/applications/${id}`, { action, admin_note: note });
      alert(res.data?.message || (action === 'approve' ? 'อนุมัติสำเร็จ ✅' : 'ปฏิเสธคำขอแล้ว'));
      setShowAppModal(false);
      setAppNote('');
      fetchApplications();
      fetchUsers(); 
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    }
  };

  const updateTicket = async (id, status, adminNote) => {
    try {
      await api.put(`/tickets/${id}`, { 
        status: status, 
        admin_note: adminNote 
      });
      alert('อัปเดตสถานะและส่งแจ้งเตือนสำเร็จ ✅');
      fetchTickets();
      setShowTicketModal(false);
      setTicketNote('');
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    }
  };

  // ฟังก์ชันดูข้อมูลผู้ใช้เชิงลึกตามบทบาท
  const handleViewUser = async (userSummary) => {
    setUserLoading(true);
    setSelectedUser(userSummary);
    setShowUserDetail(true);
    setResetPasswordMode(false);
    setNewPasswordInput('');

    try {
      const res = await api.get(`/admin/users/${userSummary.id}/details`);
      setSelectedUser(res.data);
    } catch (err) {
      console.error('Failed to load full user details:', err);
    } finally {
      setUserLoading(false);
    }
  };

  // ฟังก์ชันรีเซ็ตรหัสผ่านใหม่ให้ผู้ใช้
  const handleResetPassword = async () => {
    if (!newPasswordInput || newPasswordInput.length < 6) {
      alert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    try {
      const res = await api.put(`/admin/users/${selectedUser.id}/reset-password`, {
        new_password: newPasswordInput
      });
      alert(res.data.message);
      setResetPasswordMode(false);
      setNewPasswordInput('');
    } catch (err) {
      alert(err.response?.data?.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const [settings, setSettings] = useState({
    platform_fee_percent: 10,
    bank_name: '', bank_account: '', bank_account_name: '', promptpay_qr: '',
  });
  const [feePayments, setFeePayments] = useState([]);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      if (res.data) setSettings(res.data);
    } catch (err) { console.log(err); }
  };

  const fetchFeePayments = async () => {
    try {
      const res = await api.get('/admin/fee-payments');
      setFeePayments(res.data);
    } catch (err) { console.log(err); }
  };

  const saveSettings = async () => {
    try {
      await api.put('/admin/settings', settings);
      alert('บันทึกสำเร็จ ✅');
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    }
  };
  
  const sendFeeNotifications = async () => {
    if (!window.confirm('ส่งแจ้งเตือนค่าธรรมเนียมไปหา organizer ทุกคนไหม?')) return;
    setNotifSending(true);
    try {
      const res = await api.post('/admin/fees/notify');
      alert(res.data.message);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    }
    setNotifSending(false);
  };

  const deleteTicket = async (id) => {
    if (!window.confirm('ต้องการลบ ticket นี้ไหม? การลบไม่สามารถย้อนกลับได้')) return;
    try {
      await api.delete(`/admin/tickets/${id}`);
      alert('ลบ ticket สำเร็จ ✅');
      setShowTicketModal(false);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const deleteUser = async (id, name) => {
    if (!window.confirm(`ต้องการลบผู้ใช้ "${name}" ออกจากระบบไหม? การกระทำนี้ไม่สามารถย้อนกลับได้`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      alert('ลบผู้ใช้สำเร็จ ✅');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการลบผู้ใช้');
    }
  };

  const pendingApplications = applications.filter(a => a.status === 'pending');
  const activeMarkets = markets.filter(m => m.status === 'active');
  const openTickets = tickets.filter(t => t.status === 'open');

  const statusColor = (s) => ({
    active: '#1a7a4a', pending: '#f39c12',
    upcoming: '#3498db', closed: '#999', suspended: '#e74c3c'
  }[s] || '#999');

  const roleColor = (r) => ({
    admin: '#e74c3c', organizer: '#3498db',
    vendor: '#1a7a4a', shopper: '#888'
  }[r] || '#888');

  const navItems = [
    { key: 'dashboard', icon: '📊', label: 'ภาพรวมของทั้งหมด' },
    { key: 'approvals', icon: '✅', label: 'คำขอสมัครผู้จัดการ', badge: pendingApplications.length },
    { key: 'markets', icon: '🏪', label: 'ตลาดทั้งหมด' },
    { key: 'users', icon: '👥', label: 'จัดการผู้ใช้งาน' },
    { key: 'bookings', icon: '📋', label: 'ธุรกรรมการจอง' },
    { key: 'support', icon: '🆘', label: 'แจ้งปัญหา/ช่วยเหลือ', badge: openTickets.length },
    { key: 'fees', icon: '💰', label: 'ค่าธรรมเนียม' },
    { key: 'reports', icon: '📈', label: 'รายงานสถิติ' },
    { key: 'settings', icon: '⚙️', label: 'ตั้งค่าระบบกลาง' },
  ];

  return (
    <div style={styles.page}>

      {/* ===== SIDEBAR ===== */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.sidebarLogo}>
            <span style={styles.logoEmoji}>🛒</span>
            <div>
              <div style={styles.logoName}>PopMarket</div>
              <div style={styles.logoRole}>SUPER ADMIN HUB</div>
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
                <span style={{flex:1}}>{item.label}</span>
                {item.badge > 0 && (
                  <span style={styles.navBadge}>{item.badge}</span>
                )}
                {tab === item.key && <div style={styles.navIndicator} />}
              </div>
            ))}
          </nav>
        </div>

        <div style={styles.sidebarBottom}>
          <Link to="/" style={styles.homeBtn}>← กลับหน้าหลัก</Link>
          <div style={styles.logoutBtn} onClick={logout}>
            <span>🚪</span><span>ออกจากระบบ</span>
          </div>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <main style={styles.main}>

        {/* Topbar */}
        <div style={styles.topbar}>
          <h1 style={styles.topbarTitle}>
            {navItems.find(n => n.key === tab)?.label || 'Dashboard'}
          </h1>
          <div style={styles.userChip}>
            <div style={styles.adminBadge}>⚙️</div>
            <div>
              <div style={styles.userName}>Platform Admin</div>
              <div style={styles.userRole}>AUTHORIZED ACCESS ONLY</div>
            </div>
          </div>
        </div>

        {/* ========== DASHBOARD ========== */}
        {tab === 'dashboard' && (
          <>
            <div style={styles.statsGrid}>
              {[
                { icon:'📈', val: activeMarkets.length, label:'ACTIVE ORGANIZERS', color:'#1a7a4a' },
                { icon:'🏪', val: markets.length, label:'PUBLIC MARKETS', color:'#3498db' },
                { icon:'⏳', val: pendingApplications.length, label:'NEW REQUESTS', color:'#e67e22', pending: true },
                { icon:'💰', val: `฿${Number(stats?.platform_cut || 0).toLocaleString()}`, label:'PLATFORM CUT (10%)', color:'#2c3e50' },
              ].map((s, i) => (
                <div key={i} style={{...styles.statCard, backgroundColor: s.color}}>
                  <div style={styles.statTop}>
                    {s.pending
                      ? <span style={styles.pendingTag}>PENDING</span>
                      : <span style={styles.statIcon}>{s.icon}</span>
                    }
                  </div>
                  <div style={styles.statNum}>{s.val}</div>
                  <div style={styles.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={styles.dashGrid}>
              <div style={styles.dashCard}>
                <h3 style={styles.dashTitle}>USER GROWTH ANALYTICS</h3>
                <div style={styles.chartArea}>
                  {['JAN','FEB','MAR','APR','MAY','JUN'].map((m, i) => (
                    <div key={m} style={styles.chartBarWrap}>
                      <div style={{
                        ...styles.chartBar,
                        height: `${[40,55,35,70,50,90][i]}%`,
                      }} />
                      <span style={styles.chartLabel}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.dashCard}>
                <h3 style={styles.dashTitle}>SUPPORT TICKETS</h3>
                {tickets.slice(0,2).map((t) => (
                  <div key={t.id} style={styles.ticketItem}>
                    <div style={{
                      ...styles.ticketPriority,
                      backgroundColor: t.priority === 'urgent' ? '#e74c3c' : '#3498db',
                    }}>
                      {t.priority.toUpperCase()}
                    </div>
                    <div style={{flex:1}}>
                      <div style={styles.ticketTitle}>{t.title}</div>
                      <div style={styles.ticketSub}>Reported by: {t.reporter}</div>
                    </div>
                    {t.status === 'resolved' && (
                      <span style={styles.resolvedBadge}>✅</span>
                    )}
                  </div>
                ))}
                <button style={styles.supportHubBtn}
                  onClick={() => setTab('support')}>
                  GO TO SUPPORT HUB →
                </button>
              </div>
            </div>
          </>
        )}

      {/* ── TAB: APPROVALS (เฉพาะคำขอเจ้าของตลาด / ขยายสาขา) ── */}
      {tab === 'approvals' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Verification Center</h2>
              <p style={styles.sectionSub}>คำขอสมัครเปิดบัญชีเจ้าของตลาด และคำขอเพิ่มสาขาตลาดใหม่</p>
            </div>
            <span style={styles.countBadge}>
              {pendingApplications?.length || 0} รอพิจารณา
            </span>
          </div>

          <div style={{ marginTop: '20px' }}>
            {pendingApplications?.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={styles.emptyEmoji}>🎉</p>
                <p style={styles.emptyText}>ไม่มีคำขอเปิดตลาดที่รอพิจารณาในขณะนี้</p>
              </div>
            ) : (
              pendingApplications.map(a => {
                let mCount = 1;
                try {
                  const parsed = typeof a.markets_data === 'string' ? JSON.parse(a.markets_data) : a.markets_data;
                  if (Array.isArray(parsed) && parsed.length > 0) mCount = parsed.length;
                } catch(e) { mCount = 1; }

                return (
                  <div key={a.id} style={styles.approvalRow}>
                    <div style={styles.approvalAvatar}>
                      {a.business_name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={styles.approvalName}>{a.business_name}</span>
                        <span style={{ fontSize: '11px', backgroundColor: '#e8f5e9', color: '#1a7a4a', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                          {mCount} ตลาด
                        </span>
                        {a.app_type === 'add_market' && (
                          <span style={{ fontSize: '11px', backgroundColor: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '12px', fontWeight: '700' }}>
                            ขอเพิ่มตลาดใหม่
                          </span>
                        )}
                      </div>
                      <div style={styles.approvalSub}>ผู้สมัคร: {a.user_name} ({a.user_email})</div>
                      <div style={styles.approvalDate}>
                        ประเภท: {a.business_type || 'ไม่ระบุ'} • โทร: {a.phone || '-'} {a.backup_phone ? `(สำรอง: ${a.backup_phone})` : ''}
                      </div>
                    </div>
                    <div style={styles.approvalBtns}>
                      <button style={styles.viewBtn} onClick={() => { setSelectedApp(a); setAppNote(''); setShowAppModal(true); }}>
                        👁 ดูรายละเอียด
                      </button>
                      <button style={styles.approveBtn} onClick={() => handleApplication(a.id, 'approve', '')}>
                        ✅ อนุมัติ
                      </button>
                      <button style={styles.rejectBtn} onClick={() => {
                        const reason = prompt('กรุณาระบุเหตุผลการปฏิเสธคำขอนี้:');
                        if (reason !== null && reason.trim()) {
                          handleApplication(a.id, 'reject', reason);
                        }
                      }}>
                        ❌ ปฏิเสธ
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

        {/* ========== MARKETS ========== */}
        {tab === 'markets' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Market Oversight</h2>
                <p style={styles.sectionSub}>ตลาดทั้งหมดในแพลตฟอร์ม</p>
              </div>
              <span style={styles.countBadge}>{markets.length} ตลาด</span>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  {['MARKET & ORGANIZER','LOCATION','FEATURED','STATUS','ACTIONS'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {markets.map(m => (
                  <tr key={m.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        {m.cover_url ? (
                          <img src={m.cover_url} alt={m.name} style={styles.marketThumb} />
                        ) : (
                          <div style={styles.marketThumbPlaceholder}>🏪</div>
                        )}
                        <div>
                          <div style={styles.marketName}>{m.name}</div>
                          <div style={styles.marketOrg}>{m.organizer_name?.toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>{m.province || '-'}</td>
                    <td style={styles.td}>
                      <button style={{
                        ...styles.viewBtn,
                        backgroundColor: m.is_featured ? '#e8f5e9' : '#f5f5f5',
                        color: m.is_featured ? '#1a7a4a' : '#666'
                      }} onClick={() => toggleFeatured(m)}>
                        {m.is_featured ? '⭐ Featured' : 'Normal'}
                      </button>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        fontSize:'11px', padding:'3px 10px', borderRadius:'20px', fontWeight:'700',
                        backgroundColor: statusColor(m.status)+'20', color: statusColor(m.status)
                      }}>{m.status?.toUpperCase()}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', gap:'6px'}}>
                        <button style={styles.viewBtn}
                          onClick={() => {
                            setSelectedMarket(m);
                            setShowMarketDetail(true);
                          }}>
                          👁 ดู
                        </button>
                        {m.status === 'pending' && (
                          <button style={styles.approveSmBtn} onClick={() => approveMarket(m.id)}>✅</button>
                        )}
                        {m.status === 'active' && (
                          <button style={styles.rejectSmBtn} onClick={() => rejectMarket(m.id)}>🚫 ระงับ</button>
                        )}
                        {m.status === 'suspended' && (
                          <button style={styles.approveSmBtn} onClick={() => reactivateMarket(m.id)}>🔄 เปิดใหม่</button>
                        )}
                        <button style={{...styles.rejectSmBtn, color:'#e74c3c'}} onClick={() => deleteMarketAdmin(m.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

       {/* ========== USERS ========== */}
        {tab === 'users' && (
          <div style={styles.card}>
            <div style={{display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap'}}>
                {['all','admin','organizer','vendor','shopper'].map(r => (
                  <button key={r}
                    style={{
                      padding:'6px 14px', borderRadius:'20px',
                      border:'none', cursor:'pointer', fontSize:'12px',
                      fontWeight:'600',
                      backgroundColor: userRoleFilter === r ? (r === 'all' ? '#222' : roleColor(r)) : '#f0f0f0',
                      color: userRoleFilter === r ? '#fff' : '#555',
                    }}
                    onClick={() => setUserRoleFilter(r)}>
                    {r === 'all' ? 'ทั้งหมด' : r.toUpperCase()}
                  </button>
                ))}
              </div>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Users</h2>
                <p style={styles.sectionSub}>จัดการผู้ใช้งานในแพลตฟอร์ม</p>
              </div>
              <span style={styles.countBadge}>{users.length} คน</span>
            </div>

            <table style={styles.table}>
              <thead>
                <tr>
                  {['ชื่อ/อีเมล','ROLE','เบอร์โทร','สถานะ','ACTIONS'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users
                .filter(u => u.role !== 'pending_vendor' && u.role !== 'pending_organizer') 
                .filter(u => userRoleFilter === 'all' || u.role === userRoleFilter)
                .map(u => (
                    <tr key={u.id} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.marketName}>{u.name}</div>
                      <div style={styles.marketOrg}>{u.email}</div>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        fontSize:'11px', padding:'3px 10px',
                        borderRadius:'20px', fontWeight:'700',
                        backgroundColor: roleColor(u.role)+'20',
                        color: roleColor(u.role),
                      }}>
                        {u.role?.toUpperCase()}
                      </span>
                    </td>
                    <td style={styles.td}>{u.phone || '-'}</td>
                    <td style={styles.td}>
                    <span style={{
                      fontSize:'11px', padding:'3px 10px', borderRadius:'20px', fontWeight:'700',
                      backgroundColor: u.is_suspended ? '#fff0f0' : '#e8f5e9',
                      color: u.is_suspended ? '#e74c3c' : '#1a7a4a',
                    }}>
                      {u.is_suspended ? '🚫 SUSPENDED' : '✅ ACTIVE'}
                    </span>
                  </td>
                    <td style={styles.td}>
                      <div style={{display:'flex', gap:'6px'}}>
                        {/* 🟢 กดเพื่อดึงข้อมูลเชิงลึกตามบทบาท */}
                        <button style={styles.viewBtn} onClick={() => handleViewUser(u)}>
                          👤 ดู
                        </button>
                        <button
                        style={{ ...styles.viewBtn, color: u.is_suspended ? '#1a7a4a' : '#e74c3c' }}
                        onClick={async () => {
                          const confirmMsg = u.is_suspended
                            ? `ต้องการเปิดใช้งาน ${u.name} อีกครั้งไหม?`
                            : `ต้องการระงับ ${u.name} ไหม?`;
                          if (!window.confirm(confirmMsg)) return;
                          try {
                            await api.put(`/admin/users/${u.id}/toggle-suspend`);
                            fetchUsers();
                          } catch (err) {
                            alert(err.response?.data?.message || 'เกิดข้อผิดพลาด');
                          }
                        }}>
                        {u.is_suspended ? '🔓' : '🚫'}
                      </button>

                      {u.role !== 'admin' && (
                        <button
                          style={{ ...styles.viewBtn, color: '#e74c3c', backgroundColor: '#fff0f0' }}
                          onClick={() => deleteUser(u.id, u.name)}
                          title="ลบผู้ใช้"
                        >
                          🗑️
                        </button>
                      )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========== BOOKINGS ========== */}
        {tab === 'bookings' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Global Transactions</h2>
                <p style={styles.sectionSub}>REAL-TIME PLATFORM BOOKING LOGS</p>
              </div>
              <span style={styles.countBadge}>{bookings.length} รายการ</span>
            </div>

            <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
              {['all','paid','pending','cancelled'].map(f => (
                <button key={f}
                  style={{
                    padding:'6px 14px', borderRadius:'20px',
                    border:'none', cursor:'pointer', fontSize:'12px',
                    fontWeight:'600',
                    backgroundColor: bookingFilter === f ? '#1a7a4a' : '#f0f0f0',
                    color: bookingFilter === f ? '#fff' : '#555',
                  }}
                  onClick={() => setBookingFilter(f)}>
                  {f === 'all' ? 'ทั้งหมด' : f.toUpperCase()}
                </button>
              ))}
            </div>

            {bookings.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={styles.emptyEmoji}>📋</p>
                <p style={styles.emptyText}>ยังไม่มีรายการจอง</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['#','ผู้จอง','ตลาด / ล็อค','วันที่จอง','ยอด','สถานะจอง','สถานะชำระ'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bookings
                    .filter(b => bookingFilter === 'all' || b.payment_status === bookingFilter || b.booking_status === bookingFilter)
                    .map(b => (
                    <tr key={b.id} style={styles.tr}>
                      <td style={styles.td}>#{b.id}</td>
                      <td style={styles.td}>
                        <div style={styles.marketName}>{b.vendor_name}</div>
                        <div style={styles.marketOrg}>{b.vendor_email}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.marketName}>{b.market_name}</div>
                        <div style={styles.marketOrg}>LOCK {b.lock_number}{b.zone ? ` · Zone ${b.zone}` : ''}</div>
                      </td>
                      <td style={styles.td}>{b.book_date?.split('T')[0] || b.book_date || '-'}</td>
                      <td style={styles.td}>
                        <span style={{fontWeight:'700', color:'#1a7a4a'}}>
                          ฿{b.amount ? Number(b.amount).toLocaleString() : '-'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          fontSize:'11px', padding:'3px 8px',
                          borderRadius:'20px', fontWeight:'700',
                          backgroundColor: b.booking_status === 'confirmed' ? '#e8f5e9'
                            : b.booking_status === 'cancelled' ? '#fff0f0' : '#fff9e6',
                          color: b.booking_status === 'confirmed' ? '#1a7a4a'
                            : b.booking_status === 'cancelled' ? '#e74c3c' : '#f39c12',
                        }}>
                          {b.booking_status?.toUpperCase()}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          fontSize:'11px', padding:'3px 8px',
                          borderRadius:'20px', fontWeight:'700',
                          backgroundColor: b.payment_status === 'paid' ? '#e8f5e9'
                            : b.payment_status === 'pending' ? '#fff9e6' : '#f5f5f5',
                          color: b.payment_status === 'paid' ? '#1a7a4a'
                            : b.payment_status === 'pending' ? '#f39c12' : '#999',
                        }}>
                          {b.payment_status?.toUpperCase() || 'NO PAYMENT'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ========== SUPPORT ========== */}
        {tab === 'support' && (
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h2 style={styles.sectionTitle}>Support Hub</h2>
                <p style={styles.sectionSub}>MANAGE PLATFORM ISSUES & INQUIRIES</p>
              </div>
              <span style={{...styles.countBadge, backgroundColor:'#fff0f0', color:'#e74c3c'}}>
                {openTickets.length} รายการเปิด
              </span>
            </div>

            {tickets.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={styles.emptyEmoji}>🎉</p>
                <p style={styles.emptyText}>ไม่มีปัญหาที่รอแก้ไข</p>
              </div>
            ) : (
              <div style={styles.ticketGrid}>
                {tickets.map(t => (
                  <div key={t.id} style={{
                    ...styles.ticketCard,
                    opacity: t.status === 'resolved' ? 0.6 : 1,
                    borderLeft: `4px solid ${
                      t.priority === 'urgent' ? '#e74c3c'
                      : t.priority === 'normal' ? '#3498db' : '#aaa'
                    }`,
                  }}>
                    <div style={styles.ticketCardTop}>
                      <div style={{
                        ...styles.ticketCardPriority,
                        backgroundColor: t.priority === 'urgent' ? '#e74c3c'
                          : t.priority === 'normal' ? '#3498db' : '#aaa',
                      }}>
                        {t.priority?.toUpperCase()}
                      </div>
                      <span style={{
                        fontSize:'10px', fontWeight:'700',
                        color: t.status === 'resolved' ? '#1a7a4a'
                          : t.status === 'in_progress' ? '#3498db' : '#f39c12',
                      }}>
                        {t.status === 'resolved' ? '✅ RESOLVED'
                          : t.status === 'in_progress' ? '🔄 IN PROGRESS' : '🔴 OPEN'}
                      </span>
                    </div>

                    <h4 style={styles.ticketCardTitle}>{t.title}</h4>
                    <p style={styles.ticketCardSub}>By: {t.user_name} ({t.user_role?.toUpperCase()})</p>
                    <p style={styles.ticketCategory}>
                      {t.category === 'payment' ? '💳 PAYMENT' : t.category === 'technical' ? '🔧 TECHNICAL' : '📌 OTHER'}
                    </p>
                    {t.description && <p style={{fontSize:'12px', color:'#666', marginBottom:'10px'}}>{t.description}</p>}
                    <button style={styles.resolveBtn} onClick={() => { setSelectedTicket(t); setTicketNote(t.admin_note || ''); setShowTicketModal(true); }}>✏️ จัดการ</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========== REPORTS ========== */}
        {tab === 'reports' && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>PLATFORM ANALYTICS</h2>
            {stats && (
              <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', marginBottom:'24px'}}>
                {[
                  { label:'รายได้รวม (paid)', val:`฿${Number(stats.total_revenue).toLocaleString()}`, color:'#1a7a4a' },
                  { label:'Platform Cut (10%)', val:`฿${Number(stats.platform_cut).toLocaleString()}`, color:'#2c3e50' },
                  { label:'การจองทั้งหมด', val: stats.total_bookings, color:'#3498db' },
                  { label:'ผู้ใช้งานทั้งหมด', val: stats.total_users, color:'#e67e22' },
                ].map((s,i) => (
                  <div key={i} style={{ backgroundColor: s.color, color:'#fff', borderRadius:'12px', padding:'16px' }}>
                    <div style={{fontSize:'22px', fontWeight:'800'}}>{s.val}</div>
                    <div style={{fontSize:'10px', opacity:0.8, marginTop:'4px'}}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.reportGrid}>
              <div>
                <h4 style={styles.reportSubTitle}>REVENUE PER MARKET</h4>
                {stats?.revenueByMarket.map(m => {
                  const maxRev = Math.max(...stats.revenueByMarket.map(x => Number(x.revenue)), 1);
                  return (
                    <div key={m.id} style={styles.reportBar}>
                      <div style={styles.reportLabel}>{m.name.toUpperCase().slice(0,18)}</div>
                      <div style={styles.barWrap}>
                        <div style={{ ...styles.barFill, width: `${(Number(m.revenue) / maxRev) * 100}%` }} />
                      </div>
                      <div style={styles.reportVal}>฿{Number(m.revenue).toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.diversityBox}>
                <div style={styles.diversityTitle}>Breakdown</div>
                {stats?.usersByRole.map((r, i) => (
                  <div key={r.role} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
                    <span>● {r.role?.toUpperCase()}</span>
                    <span style={{fontWeight:'700'}}>{r.count} คน</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      {/* ========== Platform Fee ========== */}
      {tab === 'fees' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Platform Fee Report</h2>
              <p style={styles.sectionSub}>ค่าธรรมเนียม 10% ที่ต้องเรียกเก็บจาก Organizer</p>
            </div>
          </div>
          
          <table style={styles.table}>
            <thead>
              <tr>
                {['ORGANIZER', 'ตลาดทั้งหมด', 'ยอดชำระรวม', 'Platform Fee 10%', 'สถานะ'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.values(
                markets
                  .filter(m => m.status === 'active' || m.status === 'closed')
                  .reduce((acc, m) => {
                    const key = m.organizer_id || m.organizer_name;
                    const mBookings = bookings.filter(b => b.market_name === m.name && b.payment_status === 'paid');
                    const totalPaid = mBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
                    if (!acc[key]) {
                      acc[key] = {
                        organizer_name: m.organizer_name,
                        organizer_id: m.organizer_id,
                        markets: [],
                        totalPaid: 0,
                      };
                    }
                    acc[key].markets.push(m.name);
                    acc[key].totalPaid += totalPaid;
                    return acc;
                  }, {})
              ).map((org, i) => {
                const fee = org.totalPaid * 0.1;
                const paid = feePayments.filter(fp => fp.organizer_id === org.organizer_id);
                const allPaid = paid.length > 0 && paid.every(fp => fp.status === 'paid');
                const hasPending = paid.some(fp => fp.status !== 'paid');

                return (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}>
                      <div style={styles.marketName}>{org.organizer_name}</div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '12px', color: '#888' }}>{org.markets.join(', ')}</div>
                      <div style={{ fontSize: '11px', color: '#aaa' }}>{org.markets.length} ตลาด</div>
                    </td>
                    <td style={styles.td}>฿{org.totalPaid.toLocaleString()}</td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: '800', color: '#1a7a4a', fontSize: '14px' }}>
                        ฿{fee.toLocaleString()}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '700',
                        backgroundColor: allPaid ? '#e8f5e9' : hasPending ? '#fff9e6' : '#fff9e6',
                        color: allPaid ? '#1a7a4a' : '#f39c12',
                      }}>
                        {allPaid ? '✅ ชำระแล้ว' : hasPending ? '⏳ รอตรวจสอบ' : 'รอเรียกเก็บ'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#2c3e50', borderRadius: '12px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', opacity: 0.8 }}>ยอด Platform Fee รวมทั้งหมด</span>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#1a7a4a' }}>
              ฿{markets.reduce((total, m) => {
                const mBookings = bookings.filter(b => b.market_name === m.name && b.payment_status === 'paid');
                return total + mBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0) * 0.1;
              }, 0).toLocaleString()}
            </span>
          </div>

          <button
            style={{
              marginTop: '12px', width: '100%', padding: '14px',
              backgroundColor: notifSending ? '#aaa' : '#1a7a4a',
              color: '#fff', border: 'none', borderRadius: '10px',
              cursor: notifSending ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: '700',
            }}
            onClick={sendFeeNotifications}
            disabled={notifSending}
          >
            {notifSending ? '⏳ กำลังส่ง...' : '📨 แจ้งเตือนค่าธรรมเนียมทุก Organizer'}
          </button>

          {feePayments.length > 0 && (
            <div style={{ marginTop: '28px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#222', marginBottom: '12px' }}>
                📎 หลักฐานการชำระที่รอตรวจสอบ
              </h3>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['ORGANIZER', 'จำนวนตลาด', 'ยอด Fee รวม', 'งวด', 'สลิป', 'สถานะ', 'ACTION'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(
                    feePayments.reduce((acc, fp) => {
                      const key = fp.organizer_id || fp.organizer_name;
                      if (!acc[key]) {
                        acc[key] = {
                          organizer_name: fp.organizer_name,
                          organizer_id: fp.organizer_id,
                          markets: [],
                          total_amount: 0,
                          period: fp.period,
                          slip_url: fp.slip_url,
                          all_paid: true,
                          ids: [],
                        };
                      }
                      acc[key].markets.push(fp.market_name);
                      acc[key].total_amount += Number(fp.amount);
                      acc[key].ids.push(fp.id);
                      if (fp.status !== 'paid') acc[key].all_paid = false;
                      if (fp.slip_url) acc[key].slip_url = fp.slip_url;
                      return acc;
                    }, {})
                  ).map((org, i) => (
                    <tr key={i} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={styles.marketName}>{org.organizer_name}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontSize: '12px', color: '#888' }}>
                          {org.markets.join(', ')}
                        </div>
                        <div style={{ fontSize: '11px', color: '#aaa', marginTop: '2px' }}>
                          {org.markets.length} ตลาด
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ fontWeight: '800', color: '#1a7a4a', fontSize: '15px' }}>
                          ฿{org.total_amount.toLocaleString()}
                        </span>
                      </td>
                      <td style={styles.td}>{org.period || '-'}</td>
                      <td style={styles.td}>
                        {org.slip_url ? (
                          <a href={org.slip_url} target="_blank" rel="noreferrer"
                            style={{ fontSize: '12px', color: '#3498db', fontWeight: '600' }}>
                            👁 ดูสลิป
                          </a>
                        ) : '-'}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '700',
                          backgroundColor: org.all_paid ? '#e8f5e9' : '#fff9e6',
                          color: org.all_paid ? '#1a7a4a' : '#f39c12',
                        }}>
                          {org.all_paid ? '✅ ยืนยันแล้ว' : '⏳ รอตรวจสอบ'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {!org.all_paid && (
                          <button style={styles.approveSmBtn}
                            onClick={async () => {
                              if (!window.confirm(`ยืนยันการชำระของ ${org.organizer_name} ยอดรวม ฿${org.total_amount.toLocaleString()} ?`)) return;
                              try {
                                await Promise.all(
                                  org.ids.map(id => api.put(`/admin/fee-payments/${id}/verify`))
                                );
                                alert('ยืนยันสำเร็จ ✅');
                                fetchFeePayments();
                              } catch (err) {
                                alert('เกิดข้อผิดพลาด');
                              }
                            }}>
                            ✅ ยืนยันทั้งหมด
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== SETTINGS ========== */}
      {tab === 'settings' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.sectionTitle}>ตั้งค่าระบบกลาง</h2>
              <p style={styles.sectionSub}>PLATFORM CONFIGURATION</p>
            </div>
          </div>

          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>Platform Fee (%)</label>
            <input
              type="number"
              style={styles.settingInput}
              value={settings.platform_fee_percent}
              onChange={e => setSettings({ ...settings, platform_fee_percent: e.target.value })}
            />
          </div>

          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>ชื่อธนาคาร</label>
            <input
              style={styles.settingInput}
              value={settings.bank_name}
              onChange={e => setSettings({ ...settings, bank_name: e.target.value })}
            />
          </div>

          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>เลขบัญชีธนาคาร</label>
            <input
              style={styles.settingInput}
              value={settings.bank_account}
              onChange={e => setSettings({ ...settings, bank_account: e.target.value })}
            />
          </div>

          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>ชื่อบัญชี</label>
            <input
              style={styles.settingInput}
              value={settings.bank_account_name}
              onChange={e => setSettings({ ...settings, bank_account_name: e.target.value })}
            />
          </div>

          <div style={styles.settingRow}>
            <label style={styles.settingLabel}>PromptPay QR</label>
            {settings.promptpay_qr && (
              <img
                src={settings.promptpay_qr}
                alt="QR"
                style={{ width: '120px', height: '120px', objectFit: 'contain',
                  border: '1px solid #eee', borderRadius: '8px', marginBottom: '8px', display: 'block' }}
              />
            )}
            <ImageUpload
              type="qr"
              label="อัปโหลด QR Code"
              onUpload={(url) => setSettings({ ...settings, promptpay_qr: url })}
            />
          </div>

          <button style={styles.saveChangesBtn} onClick={saveSettings}>
            💾 บันทึกการตั้งค่า
          </button>
        </div>
      )}
      </main>

      {/* ===== MODAL: ดูรายละเอียดตลาด ===== */}
      {showMarketDetail && selectedMarket && (
        <div style={styles.overlay} onClick={() => setShowMarketDetail(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>รายละเอียดตลาด</h3>
              <button style={styles.modalClose} onClick={() => setShowMarketDetail(false)}>✕</button>
            </div>
            {selectedMarket.cover_url && (
              <img src={selectedMarket.cover_url} alt="cover" style={styles.detailImg} onClick={() => setFullImage(selectedMarket.cover_url)} />
            )}
            {selectedMarket.layout_url && (
              <img src={selectedMarket.layout_url} alt="layout" style={styles.detailImg} onClick={() => setFullImage(selectedMarket.layout_url)} />
            )}
            <div style={styles.modalRow}><span style={styles.modalKey}>ชื่อตลาด</span><span style={styles.modalVal}>{selectedMarket.name}</span></div>
            <div style={styles.modalRow}><span style={styles.modalKey}>จัดโดย</span><span style={styles.modalVal}>{selectedMarket.organizer_name}</span></div>
            <div style={styles.modalRow}><span style={styles.modalKey}>จังหวัด</span><span style={styles.modalVal}>{selectedMarket.province || '-'}</span></div>
            <div style={styles.modalBtnRow}>
              <button style={styles.cancelBtn} onClick={() => setShowMarketDetail(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: ดูรายละเอียด User (แยกแสดงผลตามบทบาท + รีเซ็ตรหัสผ่าน) ===== */}
      {showUserDetail && selectedUser && (
        <div style={styles.overlay} onClick={() => setShowUserDetail(false)}>
          <div style={{ ...styles.modal, maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>รายละเอียดผู้ใช้งาน</h3>
              <button style={styles.modalClose} onClick={() => setShowUserDetail(false)}>✕</button>
            </div>

            {userLoading && (
              <div style={{ textAlign: 'center', padding: '10px', color: '#888', fontSize: '12px' }}>
                ⏳ กำลังดึงข้อมูลเชิงลึก...
              </div>
            )}

            {/* ส่วนหัวแสดงชื่อและบทบาท */}
            <div style={styles.userDetailHeader}>
              <div style={{ ...styles.approvalAvatar, backgroundColor: roleColor(selectedUser.role) }}>
                {selectedUser.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '800' }}>{selectedUser.name}</div>
                <div style={{ color: roleColor(selectedUser.role), fontSize: '12px', fontWeight: '700' }}>
                  ● {selectedUser.role?.toUpperCase()}
                </div>
              </div>
            </div>

            {/* ข้อมูลพื้นฐาน */}
            <div style={styles.modalRow}><span style={styles.modalKey}>อีเมล</span><span style={styles.modalVal}>{selectedUser.email}</span></div>
            <div style={styles.modalRow}><span style={styles.modalKey}>เบอร์โทรศัพท์</span><span style={styles.modalVal}>{selectedUser.phone || '-'}</span></div>
            <div style={styles.modalRow}>
              <span style={styles.modalKey}>วันที่สมัคร</span>
              <span style={styles.modalVal}>
                {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('th-TH') : '-'}
              </span>
            </div>

            {/* 🛍️ 1. ข้อมูลเฉพาะสำหรับ พ่อค้าแม่ค้า (VENDOR) */}
            {selectedUser.role === 'vendor' && selectedUser.extra?.vendor && (
              <div style={{ marginTop: '14px', backgroundColor: '#f0faf4', padding: '14px', borderRadius: '10px', border: '1px solid #d4edda' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#1a7a4a', marginBottom: '8px' }}>
                  🛍️ ข้อมูลร้านค้า
                </div>
                {selectedUser.extra.vendor.logo_url && (
                  <img 
                    src={selectedUser.extra.vendor.logo_url} 
                    alt="shop logo" 
                    style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', marginBottom: '10px', display: 'block' }} 
                  />
                )}
                <div style={styles.modalRow}><span style={styles.modalKey}>ชื่อร้านค้า</span><span style={styles.modalVal}>{selectedUser.extra.vendor.shop_name || '-'}</span></div>
                <div style={styles.modalRow}><span style={styles.modalKey}>ชื่อเจ้าของร้าน</span><span style={styles.modalVal}>{selectedUser.extra.vendor.owner_name || '-'}</span></div>
                <div style={styles.modalRow}><span style={styles.modalKey}>หมวดหมู่สินค้า</span><span style={styles.modalVal}>{selectedUser.extra.vendor.category || '-'}</span></div>
                <div style={styles.modalRow}><span style={styles.modalKey}>LINE ID</span><span style={styles.modalVal}>{selectedUser.extra.vendor.line_id || '-'}</span></div>
                <div style={styles.modalRow}><span style={styles.modalKey}>Instagram</span><span style={styles.modalVal}>{selectedUser.extra.vendor.instagram || '-'}</span></div>
                {selectedUser.extra.vendor.description && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#555' }}>
                    <strong>รายละเอียด:</strong> {selectedUser.extra.vendor.description}
                  </div>
                )}
              </div>
            )}

            {/* 🏪 2. ข้อมูลเฉพาะสำหรับ เจ้าของตลาด (ORGANIZER) */}
            {selectedUser.role === 'organizer' && (
              <div style={{ marginTop: '14px', backgroundColor: '#fcfcfc', padding: '14px', borderRadius: '10px', border: '1px solid #eee' }}>
                <div style={{ fontWeight: '800', fontSize: '13px', color: '#1a7a4a', marginBottom: '8px' }}>
                  🏪 ข้อมูลธุรกิจและตลาด
                </div>
                
                <div style={styles.modalRow}>
                  <span style={styles.modalKey}>โควตาตลาด</span>
                  <span style={{ ...styles.modalVal, color: '#1a7a4a', fontWeight: '800' }}>
                    สร้างแล้ว {selectedUser.extra?.organizer?.markets?.length || 0} / ได้สิทธิ์ {selectedUser.market_quota || 0} ตลาด
                  </span>
                </div>

                {selectedUser.extra?.organizer?.application && (
                  <>
                    <div style={styles.modalRow}><span style={styles.modalKey}>เลขบัตรประชาชน</span><span style={styles.modalVal}>{selectedUser.extra.organizer.application.idCard || '-'}</span></div>
                    <div style={styles.modalRow}><span style={styles.modalKey}>บริษัท / นิติบุคคล</span><span style={styles.modalVal}>{selectedUser.extra.organizer.application.company_name || '-'}</span></div>
                    <div style={styles.modalRow}><span style={styles.modalKey}>เลขนิติบุคคล</span><span style={styles.modalVal}>{selectedUser.extra.organizer.application.corporate_id || '-'}</span></div>
                    <div style={styles.modalRow}><span style={styles.modalKey}>เบอร์ติดต่อสำรอง</span><span style={styles.modalVal}>{selectedUser.extra.organizer.application.backup_phone || '-'}</span></div>
                    <div style={styles.modalRow}><span style={styles.modalKey}>LINE ID</span><span style={styles.modalVal}>{selectedUser.extra.organizer.application.line_id || '-'}</span></div>
                  </>
                )}

                {/* รายการตลาดที่ดูแล */}
                {selectedUser.extra?.organizer?.markets?.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <span style={styles.modalKey}>ตลาดที่กำลังดูแล:</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {selectedUser.extra.organizer.markets.map(m => (
                        <span key={m.id} style={{ fontSize: '11px', backgroundColor: '#e8f5e9', color: '#1a7a4a', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
                          🏪 {m.name} ({m.province || 'ไม่ระบุจังหวัด'})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 🔑 3. ส่วนรีเซ็ตรหัสผ่านผู้ใช้ */}
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fff9e6', borderRadius: '8px', border: '1px solid #ffeeba' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#856404' }}>🔑 จัดการรหัสผ่านผู้ใช้</span>
                {!resetPasswordMode && (
                  <button 
                    type="button"
                    style={{ fontSize: '11px', padding: '4px 10px', backgroundColor: '#f39c12', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}
                    onClick={() => setResetPasswordMode(true)}
                  >
                    รีเซ็ตรหัสผ่าน
                  </button>
                )}
              </div>

              {resetPasswordMode && (
                <div style={{ marginTop: '10px' }}>
                  <input 
                    type="text" 
                    style={{ ...styles.settingInput, marginBottom: '8px', fontSize: '13px' }}
                    placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                    value={newPasswordInput}
                    onChange={e => setNewPasswordInput(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      style={{ padding: '6px 12px', backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                      onClick={() => setResetPasswordMode(false)}
                    >
                      ยกเลิก
                    </button>
                    <button 
                      type="button" 
                      style={{ padding: '6px 14px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                      onClick={handleResetPassword}
                    >
                      บันทึกรหัสใหม่
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalBtnRow}>
              <button style={styles.cancelBtn} onClick={() => setShowUserDetail(false)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 ===== MODAL: รายละเอียดคำขอสมัคร Organizer (ปรับขนาดตัวอักษรใหญ่ขึ้น + กำกับจำนวนล็อกชัดเจน) ===== */}
      {showAppModal && selectedApp && (() => {
        let marketsList = [];
        try {
          const parsed = typeof selectedApp.markets_data === 'string' ? JSON.parse(selectedApp.markets_data) : selectedApp.markets_data;
          if (Array.isArray(parsed) && parsed.length > 0) marketsList = parsed;
        } catch(e) { marketsList = []; }

        return (
          <div style={styles.overlay} onClick={() => setShowAppModal(false)}>
            <div style={{ ...styles.modal, maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <div>
                  <h3 style={styles.modalTitle}>
                    {selectedApp.app_type === 'add_market' ? '➕ คำขอเพิ่มสาขาตลาดใหม่' : '🏪 คำขอสมัครเปิดบัญชีผู้จัดตลาด'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#1a7a4a', fontWeight: '700', marginTop: '2px' }}>
                    ยื่นขอเปิดทั้งหมด: {marketsList.length > 0 ? marketsList.length : 1} ตลาด
                  </div>
                </div>
                <button style={styles.modalClose} onClick={() => setShowAppModal(false)}>✕</button>
              </div>

              {/* ข้อมูลส่วนตัวและบริษัท */}
              <div style={styles.modalRow}><span style={styles.modalKey}>ผู้สมัคร</span><span style={styles.modalVal}>{selectedApp.user_name} ({selectedApp.user_email})</span></div>
              <div style={styles.modalRow}><span style={styles.modalKey}>เบอร์โทรศัพท์</span><span style={styles.modalVal}>{selectedApp.phone || '-'}</span></div>
              <div style={styles.modalRow}><span style={styles.modalKey}>เบอร์สำรอง / ผู้จัดการ</span><span style={styles.modalVal}>{selectedApp.backup_phone || '-'}</span></div>
              <div style={styles.modalRow}><span style={styles.modalKey}>LINE ID</span><span style={styles.modalVal}>{selectedApp.line_id || '-'}</span></div>
              <div style={styles.modalRow}><span style={styles.modalKey}>เลขบัตรประชาชน</span><span style={styles.modalVal}>{selectedApp.idCard || '-'}</span></div>
              <div style={styles.modalRow}><span style={styles.modalKey}>ชื่อบริษัท / นิติบุคคล</span><span style={styles.modalVal}>{selectedApp.company_name || '-'}</span></div>
              <div style={styles.modalRow}><span style={styles.modalKey}>เลขนิติบุคคล</span><span style={styles.modalVal}>{selectedApp.corporate_id || '-'}</span></div>

              {/* รายการตลาดทั้งหมดที่ยื่นขอ (ตัวหนังสือใหญ่ อ่านง่าย ชัดเจน) */}
              <div style={{ marginTop: '18px' }}>
                <div style={{ fontSize: '15px', fontWeight: '800', color: '#1a7a4a', marginBottom: '10px' }}>
                  🏪 รายการตลาดที่ต้องการเปิด ({marketsList.length > 0 ? marketsList.length : 1} ตลาด)
                </div>

                {marketsList.length > 0 ? (
                  marketsList.map((m, idx) => (
                    <div key={idx} style={{ backgroundColor: '#f8f9fa', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                      <div style={{ fontWeight: '800', fontSize: '15px', color: '#1a7a4a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px' }}>
                        <span>#{idx + 1} {m.market_name}</span>
                        {m.estimated_stalls && (
                          <span style={{ fontSize: '12px', color: '#1a7a4a', backgroundColor: '#e8f5e9', padding: '4px 10px', borderRadius: '12px', fontWeight: '700' }}>
                            จำนวนล็อก : {m.estimated_stalls}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '14px', color: '#222', marginTop: '6px', lineHeight: '1.6' }}>
                        📍 <strong>ที่ตั้ง :</strong> {m.location}
                      </div>
                      <div style={{ fontSize: '14px', color: '#222', marginTop: '4px', lineHeight: '1.6' }}>
                        🏷️ <strong>ประเภท :</strong> {m.business_type || 'ทั่วไป'}
                      </div>
                      {m.description && (
                        <div style={{ fontSize: '14px', color: '#444', marginTop: '4px', lineHeight: '1.6' }}>
                          📝 <strong>รายละเอียด :</strong> {m.description}
                        </div>
                      )}
                      <div style={{ fontSize: '14px', color: '#1a7a4a', fontWeight: '700', marginTop: '6px', lineHeight: '1.6' }}>
                        🎪 <strong>จำนวนล็อก :</strong> {m.estimated_stalls || '-'} ล็อค
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ backgroundColor: '#f8f9fa', border: '1.5px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                    <div style={{ fontWeight: '800', fontSize: '15px', color: '#1a7a4a', marginBottom: '8px' }}>{selectedApp.business_name}</div>
                    <div style={{ fontSize: '14px', color: '#222', marginTop: '6px' }}>📍 <strong>ที่ตั้ง :</strong> {selectedApp.location || '-'}</div>
                    {selectedApp.description && <div style={{ fontSize: '14px', color: '#444', marginTop: '4px' }}>📝 <strong>รายละเอียด :</strong> {selectedApp.description}</div>}
                  </div>
                )}
              </div>

              {selectedApp.experience && (
                <div style={{ margin: '14px 0' }}>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#555' }}>ประสบการณ์จัดตลาด</div>
                  <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.6', backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: '4px', border: '1px solid #eee' }}>
                    {selectedApp.experience}
                  </div>
                </div>
              )}

              {/* ช่องบันทึก / เหตุผลการปฏิเสธ */}
              <div style={{ marginTop: '14px' }}>
                <label style={styles.settingLabel}>บันทึกจาก Admin / เหตุผลการปฏิเสธ (ถ้ามี)</label>
                <textarea 
                  style={{ ...styles.settingInput, height: '70px', resize: 'vertical', fontSize: '13px' }}
                  value={appNote}
                  onChange={e => setAppNote(e.target.value)}
                  placeholder="พิมพ์ข้อความตอบกลับหรือเหตุผลหากต้องการปฏิเสธ..."
                />
              </div>

              <div style={styles.modalBtnRow}>
                <button 
                  style={styles.approveBtn} 
                  onClick={() => handleApplication(selectedApp.id, 'approve', appNote)}
                >
                  ✅ อนุมัติ (+ โควตา {marketsList.length > 0 ? marketsList.length : 1} ตลาด)
                </button>
                <button 
                  style={styles.rejectBtn} 
                  onClick={() => {
                    if (!appNote.trim()) {
                      const reason = prompt('กรุณาระบุเหตุผลการปฏิเสธ:');
                      if (reason !== null && reason.trim()) {
                        handleApplication(selectedApp.id, 'reject', reason);
                      }
                    } else {
                      handleApplication(selectedApp.id, 'reject', appNote);
                    }
                  }}
                >
                  ❌ ปฏิเสธ
                </button>
                <button style={styles.cancelBtn} onClick={() => setShowAppModal(false)}>ปิด</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ===== MODAL: จัดการ Ticket ===== */}
      {showTicketModal && selectedTicket && (
        <div style={styles.overlay} onClick={() => setShowTicketModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🎫 จัดการ Ticket #{selectedTicket.id}</h3>
              <button style={styles.modalClose} onClick={() => setShowTicketModal(false)}>✕</button>
            </div>
            <div style={{ padding:'12px', backgroundColor:'#f8f9fa', borderRadius:'8px', marginBottom:'16px' }}>
              <div style={{fontWeight:'700', color:'#222', marginBottom:'4px'}}>{selectedTicket.title}</div>
              <div style={{fontSize:'12px', color:'#888'}}>{selectedTicket.description}</div>
            </div>
            
            <label style={styles.settingLabel}>ปรับสถานะ</label>
            <select style={styles.settingInput} value={selectedTicket.status} onChange={e => setSelectedTicket({...selectedTicket, status: e.target.value})}>
              <option value="open">🔴 Open (เปิดรับเรื่อง)</option>
              <option value="in_progress">⏳ In Progress (กำลังดำเนินการ)</option>
              <option value="resolved">✅ Resolved (แก้ไขแล้ว)</option>
            </select>
            
            <label style={styles.settingLabel}>ข้อความตอบกลับจาก Admin (จะส่งแจ้งเตือนไปให้ผู้ใช้)</label>
            <textarea 
              style={{...styles.settingInput, height: '80px', resize: 'vertical'}} 
              value={ticketNote} 
              onChange={e => setTicketNote(e.target.value)} 
              placeholder="เช่น: ทีมงานกำลังประสานงานให้ครับ..." 
            />
            
           <div style={styles.modalBtnRow}>
            <button
              style={styles.approveBtn}
              onClick={() => updateTicket(selectedTicket.id, selectedTicket.status, ticketNote)}
            >
              💾 อัปเดตสถานะและตอบกลับ
            </button>
            <button
              style={{ ...styles.rejectBtn, flex: 1, padding: '12px' }}
              onClick={() => deleteTicket(selectedTicket.id)}
            >
              🗑️ ลบ Ticket
            </button>
          </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: แสดงรูปภาพขนาดเต็ม (Lightbox) ===== */}
      {fullImage && (
        <div style={styles.overlay} onClick={() => setFullImage(null)}>
          <div style={{ ...styles.modal, maxWidth: '800px', textAlign: 'center', backgroundColor: 'transparent', boxShadow: 'none' }} onClick={e => e.stopPropagation()}>
            <img 
              src={fullImage} 
              alt="Full Size" 
              style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }} 
            />
            <button 
              style={{ ...styles.cancelBtn, marginTop: '12px', maxWidth: '120px', marginLeft: 'auto', marginRight: 'auto', display: 'block' }} 
              onClick={() => setFullImage(null)}
            >
              ปิดรูปภาพ
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'Sarabun', sans-serif", backgroundColor: '#f4f6f9' },
  sidebar: { width: '230px', backgroundColor: '#fff', boxShadow: '2px 0 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100 },
  sidebarTop: { flex: 1, overflowY: 'auto' },
  sidebarLogo: { display: 'flex', alignItems: 'center', gap: '10px', padding: '22px 20px', borderBottom: '1px solid #f0f0f0' },
  logoEmoji: { fontSize: '26px' },
  logoName: { fontSize: '16px', fontWeight: '800', color: '#1a7a4a' },
  logoRole: { fontSize: '9px', color: '#e74c3c', letterSpacing: '1.5px', fontWeight: '700' },
  nav: { padding: '12px 0' },
  navItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '12px', color: '#666', position: 'relative', margin: '2px 8px', borderRadius: '8px', transition: 'all 0.15s' },
  navItemActive: { backgroundColor: '#e8f5e9', color: '#1a7a4a', fontWeight: '700' },
  navIcon: { fontSize: '14px', width: '18px', textAlign: 'center', flexShrink: 0 },
  navBadge: { backgroundColor: '#e74c3c', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '10px', fontWeight: '700', flexShrink: 0 },
  navIndicator: { position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: '3px', height: '18px', backgroundColor: '#1a7a4a', borderRadius: '2px 0 0 2px' },
  sidebarBottom: { padding: '16px', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: '8px' },
  homeBtn: { fontSize: '12px', color: '#1a7a4a', textDecoration: 'none', fontWeight: '600', padding: '8px 12px', backgroundColor: '#e8f5e9', borderRadius: '8px', textAlign: 'center' },
  logoutBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#e74c3c', backgroundColor: '#fff5f5' },
  main: { marginLeft: '230px', flex: 1, padding: '24px' },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '20px' },
  topbarTitle: { fontSize: '20px', fontWeight: '800', margin: 0, color: '#222' },
  userChip: { display: 'flex', alignItems: 'center', gap: '10px' },
  adminBadge: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#2c3e50', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' },
  userName: { fontSize: '13px', fontWeight: '700', color: '#222' },
  userRole: { fontSize: '9px', color: '#e74c3c', fontWeight: '700', letterSpacing: '1px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' },
  statCard: { borderRadius: '14px', padding: '20px', color: '#fff' },
  statTop: { marginBottom: '8px' },
  statIcon: { fontSize: '22px' },
  pendingTag: { fontSize: '10px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '3px 10px', borderRadius: '10px', fontWeight: '700' },
  statNum: { fontSize: '28px', fontWeight: '800', margin: '4px 0' },
  statLabel: { fontSize: '10px', opacity: 0.8, letterSpacing: '1px', fontWeight: '600' },
  dashGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  dashCard: { backgroundColor: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  dashTitle: { fontSize: '11px', color: '#aaa', letterSpacing: '1px', fontWeight: '700', margin: '0 0 16px' },
  chartArea: { display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px', padding: '0 4px' },
  chartBarWrap: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '4px' },
  chartBar: { width: '100%', backgroundColor: '#1a7a4a', borderRadius: '4px 4px 0 0', opacity: 0.8 },
  chartLabel: { fontSize: '10px', color: '#aaa' },
  ticketItem: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f5f5f5' },
  ticketPriority: { fontSize: '9px', padding: '3px 8px', borderRadius: '4px', color: '#fff', fontWeight: '700', flexShrink: 0, marginTop: '2px' },
  ticketTitle: { fontSize: '13px', fontWeight: '700', color: '#222' },
  ticketSub: { fontSize: '11px', color: '#888' },
  resolvedBadge: { fontSize: '11px', color: '#1a7a4a', fontWeight: '700', flexShrink: 0 },
  supportHubBtn: { width: '100%', marginTop: '14px', padding: '10px', backgroundColor: '#f0f0f0', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' },
  card: { backgroundColor: '#fff', borderRadius: '14px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  sectionTitle: { fontSize: '18px', fontWeight: '800', margin: '0 0 4px', color: '#222' },
  sectionSub: { fontSize: '11px', color: '#aaa', letterSpacing: '1px', margin: 0 },
  countBadge: { fontSize: '12px', backgroundColor: '#e8f5e9', color: '#1a7a4a', padding: '5px 14px', borderRadius: '20px', fontWeight: '700' },
  emptyBox: { textAlign: 'center', padding: '40px' },
  emptyEmoji: { fontSize: '40px', margin: '0 0 8px' },
  emptyText: { fontSize: '14px', color: '#aaa' },
  approvalRow: { display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '10px', marginBottom: '10px', border: '1px solid #eee' },
  approvalAvatar: { width: '46px', height: '46px', borderRadius: '50%', backgroundColor: '#3498db', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '18px', flexShrink: 0 },
  approvalName: { fontSize: '15px', fontWeight: '800', color: '#222' },
  approvalSub: { fontSize: '12px', color: '#888', marginTop: '2px' },
  approvalDate: { fontSize: '11px', color: '#1a7a4a', fontWeight: '600', marginTop: '3px' },
  approvalBtns: { display: 'flex', gap: '8px', flexShrink: 0 },
  approveBtn: { padding: '8px 16px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  rejectBtn: { padding: '8px 14px', backgroundColor: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: '10px', color: '#aaa', letterSpacing: '1px', fontWeight: '700', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee' },
  tr: { borderBottom: '1px solid #f8f8f8' },
  td: { padding: '14px 16px', fontSize: '13px', color: '#333' },
  marketName: { fontWeight: '700', color: '#222', marginBottom: '2px' },
  marketOrg: { fontSize: '11px', color: '#aaa' },
  viewBtn: { padding: '6px 12px', backgroundColor: '#f0f0f0', color: '#555', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' },
  approveSmBtn: { padding: '6px 10px', backgroundColor: '#e8f5e9', color: '#1a7a4a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  rejectSmBtn: { padding: '6px 10px', backgroundColor: '#fff0f0', color: '#e74c3c', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' },
  ticketGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' },
  ticketCard: { padding: '20px', border: '1px solid #eee', borderRadius: '12px', backgroundColor: '#fafafa' },
  ticketCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  ticketCardPriority: { fontSize: '9px', padding: '3px 10px', borderRadius: '4px', color: '#fff', fontWeight: '700', display: 'inline-block' },
  ticketCardTitle: { fontSize: '14px', fontWeight: '800', color: '#222', margin: '0 0 4px' },
  ticketCardSub: { fontSize: '12px', color: '#888', margin: '0 0 8px' },
  ticketCategory: { fontSize: '11px', color: '#aaa', margin: '0 0 12px' },
  resolveBtn: { padding: '8px 16px', backgroundColor: '#222', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' },
  reportGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' },
  reportSubTitle: { fontSize: '12px', color: '#888', marginBottom: '16px', fontWeight: '700' },
  reportBar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' },
  reportLabel: { fontSize: '11px', color: '#555', width: '180px', fontWeight: '600' },
  barWrap: { flex: 1, height: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' },
  barFill: { height: '8px', backgroundColor: '#1a7a4a', borderRadius: '4px' },
  reportVal: { fontSize: '12px', fontWeight: '800', color: '#222', width: '36px', textAlign: 'right' },
  diversityBox: { backgroundColor: '#1e2a38', borderRadius: '14px', padding: '28px', textAlign: 'center', color: '#fff' },
  diversityTitle: { fontSize: '24px', fontWeight: '800', marginBottom: '20px' },
  settingRow: { marginBottom: '16px' },
  settingLabel: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#444', marginBottom: '6px' },
  settingInput: { width: '100%', padding: '11px 14px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fafafa' },
  saveChangesBtn: { marginTop: '8px', padding: '12px 28px', backgroundColor: '#222', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '480px', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  modalTitle: { fontSize: '17px', fontWeight: '800', margin: 0, color: '#222' },
  modalClose: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#aaa' },
  userDetailHeader: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '10px' },
  modalRow: { display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid #f5f5f5' },
  modalKey: { fontSize: '11px', color: '#aaa', fontWeight: '700', letterSpacing: '0.5px' },
  modalVal: { fontSize: '13px', fontWeight: '700', color: '#222' },
  modalBtnRow: { display: 'flex', gap: '10px', marginTop: '16px' },
  cancelBtn: { flex: 1, padding: '11px', backgroundColor: '#f0f0f0', color: '#555', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  marketThumb: { width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 },
  marketThumbPlaceholder: { width: '44px', height: '44px', borderRadius: '8px', backgroundColor: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  detailImg: { width: '100%', maxHeight: '220px', objectFit: 'cover', borderRadius: '8px', marginBottom: '12px', backgroundColor: 'transparent', cursor: 'pointer' },
};

export default AdminDashboard;