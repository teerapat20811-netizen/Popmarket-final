import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ImageUpload from '../components/ImageUpload';
import NotificationBell from '../components/NotificationBell';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat.toFixed(7), lng: e.latlng.lng.toFixed(7) });
    },
  });
  return position && position.lat && position.lng ? (
    <Marker position={[Number(position.lat), Number(position.lng)]} />
  ) : null;
}

function OrganizerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [tab, setTab] = useState('dashboard');

  const [showCreateMarket, setShowCreateMarket] = useState(false);
  const [showEditMarket,   setShowEditMarket]   = useState(false);
  const [showAddStall,     setShowAddStall]     = useState(false);
  const [showEditStall,    setShowEditStall]    = useState(false);
  const [showReportModal,  setShowReportModal]  = useState(false);
  const [showPersonalModal, setShowPersonalModal] = useState(false);
  const [showRequestModal, setShowRequestModal]   = useState(false);

  // Modal สำหรับปฏิเสธพร้อมระบุเหตุผล
  const [rejectModalPayment, setRejectModalPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const [selectedVerification, setSelectedVerification] = useState(null); 
  const [selectedVendorProfile, setSelectedVendorProfile] = useState(null); 
  const [vendorModalTab, setVendorModalTab] = useState('profile');

  const [selectedImage, setSelectedImage] = useState(null);

  const [markets,     setMarkets]     = useState([]);
  const [stalls,      setStalls]      = useState([]);
  const [payments,    setPayments]    = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [userQuota,   setUserQuota]   = useState(user.market_quota || 0);

  const [approvedMarketsList, setApprovedMarketsList] = useState([]);

  const [selectedMarket, setSelectedMarket] = useState(null);
  const [editStall,      setEditStall]      = useState(null);
  const [markerPos,      setMarkerPos]      = useState(null); 

  const [loadingVendors, setLoadingVendors] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const [requestForm, setRequestForm] = useState({
    business_name: '', location: '', business_type: 'ตลาดนัดทั่วไป / ตลาดชุมชน', estimated_stalls: '', description: '',
  });

  const [marketForm, setMarketForm] = useState({
    name: '', description: '', open_time: '10:00', close_time: '20:00', address: '', province: '',
    lat: '13.7563000', lng: '100.5018000', cover_url: '', layout_url: '',
    has_parking: 0, parking_info: '', parking_url: '', has_restroom: 0,
    parking_slots: '', restrooms: '', area_size: '', selected_dates: [] 
  });

  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [editCalendarDate, setEditCalendarDate] = useState(new Date());

  const [editMarketForm, setEditMarketForm] = useState({
    id: '', name: '', description: '', open_time: '', close_time: '', address: '', province: '',
    lat: '', lng: '', cover_url: '', layout_url: '', parking_info: '', parking_url: '', has_parking: 0,
    has_restroom: 0, parking_slots: '', restrooms: '', area_size: '', selected_dates: []
  });

  const [stallForm, setStallForm] = useState({
    lock_number: '', zone: '', size_sqm: '', price_per_day: '',
  });

  const [stallMode, setStallMode] = useState('single');
  const [batchForm, setBatchForm] = useState({
    zone: 'A', startNum: 1, count: 10, padZero: true, size_sqm: '10', price_per_day: '350',
  });

  const [reportForm, setReportForm] = useState({
    title: '', description: '', category: 'other', priority: 'normal',
  });

  const [avatarUrl, setAvatarUrl] = useState('');
  const [personalForm, setPersonalForm] = useState({
    name: user.name || '', phone: user.phone || '',
  });

  const [paymentForm, setPaymentForm] = useState({
    bank_name: '', bank_account: '', bank_account_name: '', promptpay_number: '',
  });
  const [personalSaveMsg, setPersonalSaveMsg] = useState('');

  const navItems = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'markets',   icon: '🏪', label: 'ตลาดของฉัน' },
    { key: 'stalls',    icon: '⊞', label: 'จัดการล็อค' },
    { key: 'bookings',  icon: '📋', label: 'รายการจอง' },
    { key: 'subscriptions', icon: '🔒', label: 'ผูกล็อค' },
    { key: 'payments',  icon: '💳', label: 'การชำระเงิน' },
    { key: 'vendors',   icon: '👥', label: 'ผู้ขายทั้งหมด' },
    { key: 'reports',   icon: '📈', label: 'รายงานสถิติ' },
  ];

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login');
    fetchMarkets();
    fetchProfile();
    fetchSubscriptions();
    fetchApprovedApplications();
  }, []);

  useEffect(() => {
    if (markets.length > 0) {
      fetchAllPayments();
      Promise.all(markets.map(m => api.get(`/markets/${m.id}`)))
        .then(results => {
          const allStalls = results.flatMap(res => res.data.stalls || []);
          setStalls(allStalls);
        })
        .catch(err => console.log(err));
    }
  }, [markets]);

  const fetchApprovedApplications = async () => {
    try {
      const res = await api.get('/applications/my');
      const approvedApps = res.data.filter(a => a.status === 'approved');
      const list = [];
      approvedApps.forEach(a => {
        if (a.markets_data) {
          try {
            const parsed = typeof a.markets_data === 'string' ? JSON.parse(a.markets_data) : a.markets_data;
            if (Array.isArray(parsed)) {
              parsed.forEach(m => list.push({
                name: m.market_name || a.business_name,
                address: m.location || a.location,
                description: m.description || a.description
              }));
            }
          } catch(e) {}
        } else {
          list.push({
            name: a.business_name, address: a.location, description: a.description
          });
        }
      });
      setApprovedMarketsList(list);
    } catch (err) { console.log(err); }
  };

  const fetchMarkets = async () => {
    try {
      const res = await api.get('/markets');
      const myMkts = res.data.filter(m => m.organizer_id === user.id);
      setMarkets(myMkts);
    } catch (err) { console.log(err); }
  };

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
      if (res.data.market_quota !== undefined) setUserQuota(res.data.market_quota);
      
      setPersonalForm(prev => ({
        ...prev,
        name: res.data.name || prev.name,
        phone: res.data.phone || prev.phone,
      }));
      setPaymentForm({
        bank_name: res.data.bank_name || '',
        bank_account: res.data.bank_account || '',
        bank_account_name: res.data.bank_account_name || '',
        promptpay_number: res.data.promptpay_number || '',
      });
    } catch (err) { console.log(err); }
  };

  const savePersonalInfo = async () => {
    try {
      await api.put('/auth/profile', {
        name: personalForm.name,
        phone: personalForm.phone,
        avatar_url: avatarUrl || null,
        bank_name: paymentForm.bank_name || null,
        bank_account: paymentForm.bank_account || null,
        bank_account_name: paymentForm.bank_account_name || null,
        promptpay_number: paymentForm.promptpay_number || null,
      });
      const updatedUser = { ...user, name: personalForm.name, phone: personalForm.phone };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setPersonalSaveMsg('✅ บันทึกสำเร็จ!');
      setTimeout(() => setPersonalSaveMsg(''), 3000);
    } catch (err) {
      setPersonalSaveMsg('❌ เกิดข้อผิดพลาด');
    }
  };

  const fetchAllPayments = async () => {
    if (markets.length === 0) return;
    setLoadingVendors(true);
    try {
      const resPayments = await Promise.all(
        markets.map(m => 
          api.get(`/payments/market/${m.id}`)
            .then(res => res.data.map(p => ({ ...p, market_id: m.id })))
            .catch(() => [])
        )
      );
      
      const resSubs = await Promise.all(
        markets.map(m => 
          api.get(`/subscriptions/market/${m.id}`)
            .then(res => res.data.map(s => ({ ...s, market_id: m.id })))
            .catch(() => [])
        )
      );

      const daily = resPayments.flat();
      const subs = resSubs.flat().filter(s => s.status === 'active');

      setAllPayments([...daily, ...subs]);
    } catch (err) { console.log(err); }
    setLoadingVendors(false);
  };

  const fetchStalls = async (marketId) => {
    try {
      const res = await api.get(`/markets/${marketId}`);
      setStalls(res.data.stalls || []);
    } catch (err) { console.log(err); }
  };

  const fetchPayments = async (marketId) => {
    try {
      const res = await api.get(`/payments/market/${marketId}`);
      setPayments(res.data.map(p => ({ ...p, market_id: marketId })));
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 403) setPayments([]);
      console.log('Error fetching payments:', err);
    }
  };

  const createMarket = async () => {
    if (!marketForm.name || marketForm.selected_dates.length === 0) {
      alert('กรุณากรอกชื่อตลาด และเลือกวันเปิดขายในปฏิทินอย่างน้อย 1 วัน'); return;
    }
    try {
      const sortedDates = [...marketForm.selected_dates].sort();
      const payload = {
        ...marketForm,
        start_date: sortedDates[0],
        end_date: sortedDates[sortedDates.length - 1],
      };

      await api.post('/markets', payload);
      alert('สร้างตลาดสำเร็จ ✅');
      setShowCreateMarket(false);
      setMarketForm({ 
        name:'', description:'', open_time:'10:00', close_time:'20:00', address:'', province:'', 
        lat:'13.7563000', lng:'100.5018000', cover_url:'', layout_url:'', has_parking:0, 
        parking_info:'', parking_url:'', has_restroom:0, parking_slots:'', restrooms:'', area_size:'', selected_dates:[] 
      });
      setMarkerPos(null);
      fetchMarkets();
    } catch (err) { alert(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
  };

  const updateMarket = async () => {
    if (!editMarketForm.name || editMarketForm.selected_dates.length === 0) {
      alert('กรุณากรอกชื่อตลาด และเลือกวันเปิดขายในปฏิทินอย่างน้อย 1 วัน'); return;
    }
    try {
      const sortedDates = [...editMarketForm.selected_dates].sort();
      const payload = {
        ...editMarketForm,
        start_date: sortedDates[0],
        end_date: sortedDates[sortedDates.length - 1],
      };

      await api.put(`/markets/${editMarketForm.id}`, payload);
      await api.post(`/markets/${editMarketForm.id}/schedule`, {
        dates: editMarketForm.selected_dates,
        open_time: editMarketForm.open_time,
        close_time: editMarketForm.close_time,
      });

      alert('แก้ไขตลาดสำเร็จ ✅');
      setShowEditMarket(false);
      fetchMarkets();
    } catch (err) { alert(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
  };

  const submitRequestNewMarket = async () => {
    if (!requestForm.business_name.trim()) {
      alert('กรุณาระบุชื่อตลาดที่ต้องการขอเปิด');
      return;
    }
    setSubmittingRequest(true);
    try {
      await api.post('/applications', {
        app_type: 'add_market',
        business_name: requestForm.business_name,
        location: requestForm.location,
        business_type: requestForm.business_type,
        description: requestForm.description,
        markets: [{
          market_name: requestForm.business_name,
          location: requestForm.location,
          business_type: requestForm.business_type,
          estimated_stalls: requestForm.estimated_stalls,
          description: requestForm.description
        }]
      });
      alert('ส่งคำขอเพิ่มสาขาตลาดสำเร็จ! ✅ รอ Admin พิจารณาอนุมัติโควตา');
      setShowRequestModal(false);
      setRequestForm({
        business_name: '', location: '', business_type: 'ตลาดนัดทั่วไป / ตลาดชุมชน', estimated_stalls: '', description: '',
      });
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const toggleMarketStatus = async (m) => {
    const newStatus = m.status === 'closed' ? 'active' : 'closed';
    const confirmMsg = newStatus === 'closed'
      ? `ต้องการปิดตลาด "${m.name}" ไหม?`
      : `ต้องการเปิดตลาด "${m.name}" อีกครั้งไหม?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.put(`/markets/${m.id}`, { status: newStatus });
      alert(newStatus === 'closed' ? 'ปิดตลาดแล้ว ✅' : 'เปิดตลาดแล้ว ✅');
      fetchMarkets();
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
  };

  const [subscriptions, setSubscriptions] = useState([]);
  const fetchSubscriptions = async () => {
    try {
      const all = await Promise.all(
        markets.map(m => 
          api.get(`/subscriptions/market/${m.id}`)
            .then(r => r.data.map(s => ({...s, market_name: m.name, market_id: m.id})))
            .catch(() => [])
        )
      );
      setSubscriptions(all.flat());
    } catch (err) { console.log(err); }
  };

  const formatLocalDate = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput.toString().split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openEditMarket = async (m) => {
    let existingDates = [];
    try {
      const schRes = await api.get(`/markets/${m.id}/schedule`);
      if (Array.isArray(schRes.data)) {
        existingDates = schRes.data.map(s => formatLocalDate(s.market_date)).filter(Boolean);
      }
    } catch (err) {
      console.log('Error fetching market schedule for edit:', err);
    }

    setEditMarketForm({
      id: m.id, name: m.name, description: m.description || '', open_time: m.open_time || '',
      close_time: m.close_time || '', address: m.address || '', province: m.province || '',
      lat: m.lat || '13.7563000', lng: m.lng || '100.5018000', cover_url: m.cover_url || '',
      layout_url: m.layout_url || '', has_parking: m.has_parking ?? 0, parking_info: m.parking_info || '',
      parking_url: m.parking_url || '', has_restroom: m.has_restroom ?? 0, parking_slots: m.parking_slots || '',
      restrooms: m.restrooms || '', area_size: m.area_size || '', selected_dates: existingDates,
    });
    setShowEditMarket(true);
  };

  const getCurrentLocation = (isEdit = false) => {
    if (!navigator.geolocation) { alert('เบราว์เซอร์ไม่รองรับ GPS'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(7);
        const lng = pos.coords.longitude.toFixed(7);
        if (isEdit) {
          setEditMarketForm(prev => ({ ...prev, lat, lng }));
        } else {
          setMarketForm(prev => ({ ...prev, lat, lng }));
        }
      },
      () => alert('ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาอนุญาต GPS')
    );
  };

  const addStall = async () => {
    if (!selectedMarket || !stallForm.lock_number || !stallForm.price_per_day) {
      alert('กรุณากรอกข้อมูลให้ครบ'); return;
    }
    try {
      await api.post(`/markets/${selectedMarket.id}/stalls`, stallForm);
      alert('เพิ่มล็อคสำเร็จ ✅');
      setShowAddStall(false);
      setStallForm({ lock_number:'', zone:'', size_sqm:'', price_per_day:'' });
      fetchStalls(selectedMarket.id);
    } catch (err) { alert(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
  };

  const addBatchStalls = async () => {
    if (!selectedMarket || !batchForm.count || !batchForm.price_per_day) {
      alert('กรุณากรอกจำนวนล็อคและราคาให้ครบถ้วน'); return;
    }

    const generatedStalls = [];
    const start = Number(batchForm.startNum) || 1;
    const total = Number(batchForm.count) || 1;

    for (let i = 0; i < total; i++) {
      const num = start + i;
      const formattedNum = batchForm.padZero && num < 10 ? `0${num}` : `${num}`;
      const lockNumber = `${batchForm.zone.trim().toUpperCase()}${formattedNum}`;

      generatedStalls.push({
        lock_number: lockNumber,
        zone: batchForm.zone.trim().toUpperCase(),
        size_sqm: batchForm.size_sqm || null,
        price_per_day: batchForm.price_per_day
      });
    }

    try {
      await api.post(`/markets/${selectedMarket.id}/stalls/batch`, { stalls: generatedStalls });
      alert(`เพิ่มล็อคสำเร็จรวดเดียว ${generatedStalls.length} ล็อค ✅`);
      setShowAddStall(false);
      fetchStalls(selectedMarket.id);
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการสร้างล็อคแบบกลุ่ม');
    }
  };

  const updateStall = async () => {
    if (!editStall) return;
    try {
      await api.put(`/stalls/${editStall.id}`, {
        lock_number:   editStall.lock_number,
        zone:          editStall.zone,
        size_sqm:      editStall.size_sqm,
        price_per_day: editStall.price_per_day,
      });
      alert('แก้ไขล็อคสำเร็จ ✅');
      setShowEditStall(false);
      setEditStall(null);
      if (selectedMarket) fetchStalls(selectedMarket.id);
    } catch (err) { alert(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
  };

  const deleteStall = async (stallId) => {
    if (!window.confirm('ต้องการลบล็อคนี้ไหม?')) return;
    try {
      await api.delete(`/stalls/${stallId}`);
      alert('ลบล็อคสำเร็จ ✅');
      if (selectedMarket) fetchStalls(selectedMarket.id);
    } catch (err) { alert(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
  };

  const verifyPayment = async (paymentId, action, reason = '') => {
    try {
      await api.put(`/payments/${paymentId}/verify`, { action, reason });
      alert(action === 'approve' ? 'ยืนยันการจองสำเร็จ ✅' : 'ปฏิเสธการจองเรียบร้อย ❌');
      if (selectedMarket) fetchPayments(selectedMarket.id);
      fetchAllPayments();
      setRejectModalPayment(null);
    } catch (err) { alert(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
  };

  const submitReport = async () => {
    if (!reportForm.title) { alert('กรุณากรอกหัวข้อปัญหา'); return; }
    try {
      await api.post('/tickets', reportForm);
      alert('ส่งเรื่องสำเร็จ ✅ Admin จะติดต่อกลับเร็วๆ นี้');
      setShowReportModal(false);
      setReportForm({ title:'', description:'', category:'other', priority:'normal' });
    } catch (err) { alert(err.response?.data?.message || 'เกิดข้อผิดพลาด'); }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const statusColor = (s) => ({
    active:    '#1a7a4a',
    pending:   '#f39c12',
    upcoming:  '#3498db',
    closed:    '#999',
    suspended: '#e74c3c',
  }[s] || '#999');

  const statusBadge = (status) => ({
    fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: '700',
    backgroundColor: status === 'paid' ? '#e8f5e9' : (status === 'rejected' ? '#fff0f0' : '#fff9e6'),
    color:           status === 'paid' ? '#1a7a4a' : (status === 'rejected' ? '#e74c3c' : '#f39c12'),
  });

  const renderCalendarGrid = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    const daysArray = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(<div key={`empty-${i}`} style={{ padding: '8px' }}></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const formattedDay = String(d).padStart(2, '0');
      const dateString = `${year}-${formattedMonth}-${formattedDay}`;
      const isSelected = marketForm.selected_dates.includes(dateString);

      daysArray.push(
        <div
          key={dateString}
          onClick={() => {
            let updatedDates = [...marketForm.selected_dates];
            if (isSelected) updatedDates = updatedDates.filter(item => item !== dateString);
            else updatedDates.push(dateString);
            setMarketForm({ ...marketForm, selected_dates: updatedDates });
          }}
          style={{
            padding: '10px 4px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer',
            backgroundColor: isSelected ? '#1a7a4a' : '#f8f9fa',
            color: isSelected ? '#fff' : '#333',
            fontWeight: isSelected ? 'bold' : 'normal',
            border: '1px solid #e9ecef', fontSize: '13px',
            userSelect: 'none', transition: 'all 0.15s'
          }}
        >
          {d}
        </div>
      );
    }

    return (
      <div style={{ backgroundColor: '#fff', border: '1.5px solid #e8e8e8', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <button type="button" onClick={() => setCurrentCalendarDate(new Date(year, month - 1, 1))} style={{ padding: '4px 10px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>‹</button>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#222' }}>{monthNames[month]} {year + 543}</span>
          <button type="button" onClick={() => setCurrentCalendarDate(new Date(year, month + 1, 1))} style={{ padding: '4px 10px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '11px', color: '#888', fontWeight: '700', marginBottom: '6px' }}>
          <span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {daysArray}
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#1a7a4a', fontWeight: '600', textAlign: 'right' }}>
          เลือกวันเปิดขายแล้ว: {marketForm.selected_dates.length} วัน
        </div>
      </div>
    );
  };

  const renderEditCalendarGrid = () => {
    const year = editCalendarDate.getFullYear();
    const month = editCalendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

    const daysArray = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(<div key={`edit-empty-${i}`} style={{ padding: '8px' }}></div>);
    }

    for (let d = 1; d <= totalDays; d++) {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const formattedDay = String(d).padStart(2, '0');
      const dateString = `${year}-${formattedMonth}-${formattedDay}`;
      const isSelected = editMarketForm.selected_dates.includes(dateString);

      daysArray.push(
        <div
          key={`edit-${dateString}`}
          onClick={() => {
            let updatedDates = [...editMarketForm.selected_dates];
            if (isSelected) updatedDates = updatedDates.filter(item => item !== dateString);
            else updatedDates.push(dateString);
            setEditMarketForm({ ...editMarketForm, selected_dates: updatedDates });
          }}
          style={{
            padding: '10px 4px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer',
            backgroundColor: isSelected ? '#1a7a4a' : '#f8f9fa',
            color: isSelected ? '#fff' : '#333',
            fontWeight: isSelected ? 'bold' : 'normal',
            border: '1px solid #e9ecef', fontSize: '13px',
            userSelect: 'none', transition: 'all 0.15s'
          }}
        >
          {d}
        </div>
      );
    }

    return (
      <div style={{ backgroundColor: '#fff', border: '1.5px solid #e8e8e8', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <button type="button" onClick={() => setEditCalendarDate(new Date(year, month - 1, 1))} style={{ padding: '4px 10px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>‹</button>
          <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#222' }}>{monthNames[month]} {year + 543}</span>
          <button type="button" onClick={() => setEditCalendarDate(new Date(year, month + 1, 1))} style={{ padding: '4px 10px', background: '#f0f0f0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>›</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '11px', color: '#888', fontWeight: '700', marginBottom: '6px' }}>
          <span>อา</span><span>จ</span><span>อ</span><span>พ</span><span>พฤ</span><span>ศ</span><span>ส</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {daysArray}
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#1a7a4a', fontWeight: '600', textAlign: 'right' }}>
          เลือกวันเปิดขายแล้ว: {editMarketForm.selected_dates.length} วัน
        </div>
      </div>
    );
  };

  const [appStatus, setAppStatus] = useState(null);
  useEffect(() => {
    api.get('/applications/my')
      .then(res => {
        if (res.data.length > 0) setAppStatus(res.data[0].status);
        else setAppStatus('approved');
      })
      .catch(() => setAppStatus('approved'));
  }, []);


// จัดกลุ่มล็อคตามค่า stall.zone (หรือดึงจากตัวอักษรตัวแรก เช่น A, B)
const groupedStalls = stalls.reduce((groups, stall) => {
  const zone = stall.zone || (stall.lock_number ? stall.lock_number[0] : 'ทั่วไป');
  if (!groups[zone]) {
    groups[zone] = [];
  }
  groups[zone].push(stall);
  return groups;
}, {});

  return (
    <div style={styles.page}>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarTop}>
          <div style={styles.sidebarLogo}>
            <span style={styles.logoEmoji}>🛒</span>
            <div>
              <div style={styles.logoName}>PopMarket</div>
              <div style={styles.logoRole}>ADMIN CONSOLE</div>
            </div>
          </div>

          <nav style={styles.nav}>
            {navItems.map(item => {
              const locked = appStatus === 'pending' && 
                ['markets','stalls','payments','vendors','reports','subscriptions'].includes(item.key);
              
              return (
                <div key={item.key}
                  style={{
                    ...styles.navItem,
                    ...(tab === item.key ? styles.navItemActive : {}),
                    opacity: locked ? 0.4 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    if (locked) return alert('⏳ รอ admin อนุมัติก่อน');
                    setTab(item.key);
                    if (item.key === 'subscriptions') fetchSubscriptions();
                    if (item.key === 'payments') fetchAllPayments(); 
                    if (item.key === 'vendors') fetchAllPayments();
                  }}
                >
                  <span style={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                  {locked && <span style={{fontSize:'10px', marginLeft:'auto'}}>🔒</span>}
                  {tab === item.key && !locked && <div style={styles.navIndicator} />}
                </div>
              );
            })}
          </nav>

          <div style={styles.sidebarSection}>สร้างตลาด</div>
          <button
            style={{
              ...styles.createMarketBtn, 
              width: 'calc(100% - 24px)', 
              border: 'none',
              opacity: (appStatus === 'pending' || markets.length >= userQuota) ? 0.6 : 1,
              cursor: (appStatus === 'pending' || markets.length >= userQuota) ? 'not-allowed' : 'pointer',
            }}
            onClick={() => {
              if (appStatus === 'pending') return alert('⏳ รอ admin อนุมัติก่อนจึงจะสร้างตลาดได้');
              if (markets.length >= userQuota) return alert(`คุณสร้างตลาดครบตามโควตาแล้ว (${markets.length}/${userQuota} ตลาด) กรุณากด "ยื่นเรื่องขอเพิ่มตลาดใหม่" ในหน้าตลาดของฉัน`);
              setShowCreateMarket(true);
            }}
          >
            {markets.length >= userQuota ? `🔒 ครบโควตา (${markets.length}/${userQuota})` : '＋ สร้างตลาดใหม่'}
          </button>
        </div>

        <div style={styles.sidebarBottom}>
          <div style={styles.reportIssueBtn} onClick={() => setShowReportModal(true)}>
            <span>🆘</span><span>แจ้งปัญหา</span>
          </div>
          <div style={styles.logoutBtn} onClick={logout}>
            <span>🚪</span><span>Logout</span>
          </div>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────────── */}
      <main style={styles.main}>
        <div style={styles.topbar}>
          <div style={styles.topbarLeft}>
            <Link to="/" style={styles.homeBtn}>← กลับหน้าหลัก</Link>
            <h1 style={styles.topbarTitle}>
              {navItems.find(n => n.key === tab)?.label || 'Dashboard'}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <NotificationBell />

            <div
              style={styles.userChip}
              onClick={() => { setPersonalSaveMsg(''); setShowPersonalModal(true); }}
              title="แก้ไขข้อมูลส่วนตัวและข้อมูลรับเงิน"
            >
              <div style={styles.userAvatar}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" style={styles.userAvatarImg} />
                ) : (
                  user.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div style={styles.userName}>{user.name}</div>
                <div style={styles.userRole}>ORGANIZER</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB: DASHBOARD ── */}
        {tab === 'dashboard' && (
          <>
            <div style={styles.statsGrid}>
              {[
                { icon:'🏪', val: markets.length, label:'MARKETS', color:'#1a7a4a' },
                { icon:'🔒', val: stalls.length,  label:'UNITS',   color:'#3498db' },
                { icon:'📋', val: allPayments.filter(p => p.status === 'paid').length, label:'BOOKED', color:'#e67e22' },
                {
                  icon:'💰',
                  val: `฿${allPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}`,
                  label:'REVENUE', color:'#2c3e50',
                },
              ].map((s, i) => (
                <div key={i} style={{ ...styles.statCard, backgroundColor: s.color }}>
                  <div style={styles.statIcon}>{s.icon}</div>
                  <div style={styles.statNum}>{s.val}</div>
                  <div style={styles.statLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={styles.dashGrid}>
              <div style={styles.dashCard}>
                <h3 style={styles.dashTitle}>RECENT BOOKINGS</h3>
                {allPayments.slice(0, 4).length === 0 ? (
                  <p style={styles.emptyText}>ยังไม่มีการจอง</p>
                ) : allPayments.slice(0, 4).map(p => (
                  <div key={p.id} style={styles.recentItem}>
                    <div style={styles.recentAvatar}>{p.vendor_name?.charAt(0).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.recentName}>{p.shop_name || p.vendor_name}</div>
                      <div style={styles.recentSub}>฿{Number(p.amount).toLocaleString()}</div>
                    </div>
                    <span style={statusBadge(p.status)}>{p.status}</span>
                  </div>
                ))}
              </div>

              <div style={styles.dashCard}>
                <h3 style={styles.dashTitle}>MARKET OCCUPANCY</h3>
                {markets.length === 0
                  ? <p style={styles.emptyText}>ยังไม่มีตลาด</p>
                  : markets.map(m => {
                      const totalStalls = stalls.filter(s => s.market_id === m.id).length;
                      
                      const paidPaymentsThisMarket = allPayments.filter(p => p.market_id === m.id && p.status === 'paid');
                      const bookedStallSet = new Set();
                      
                      paidPaymentsThisMarket.forEach(p => {
                        if (p.booking_items && p.booking_items.length > 0) {
                          p.booking_items.forEach(bi => bookedStallSet.add(bi.lock_number || bi.stall_id));
                        } else if (p.lock_number) {
                          bookedStallSet.add(p.lock_number);
                        }
                      });

                      const bookedCount = bookedStallSet.size;
                      const percent = totalStalls > 0 ? Math.min(Math.round((bookedCount / totalStalls) * 100), 100) : 0;

                      return (
                        <div key={m.id} style={styles.occupancyItem}>
                          <div style={styles.occupancyThumb}>🏪</div>
                          <div style={{ flex: 1 }}>
                            <div style={styles.occupancyName}>
                              {m.name} ({bookedCount}/{totalStalls} ล็อค) — {percent}%
                            </div>
                            <div style={styles.progressBar}>
                              <div style={{ ...styles.progressFill, width: `${percent}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </>
        )}

        {/* ── TAB: MARKETS ── */}
        {tab === 'markets' && (
          <div style={styles.card}>
            <div style={styles.quotaBanner}>
              <div>
                <div style={{ fontSize: '13px', color: '#666', fontWeight: '600' }}>โควตาการเปิดตลาดของคุณ</div>
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#1a7a4a', marginTop: '2px' }}>
                  🏪 สร้างแล้ว {markets.length} / ได้รับสิทธิ์ {userQuota} ตลาด
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {markets.length < userQuota ? (
                  <button style={styles.quotaCreateBtn} onClick={() => setShowCreateMarket(true)}>
                    ➕ สร้างตลาดใหม่
                  </button>
                ) : (
                  <button 
                    style={{ ...styles.quotaCreateBtn, backgroundColor: '#95a5a6', cursor: 'not-allowed' }}
                    onClick={() => alert(`คุณสร้างตลาดครบตามโควตาแล้ว (${markets.length}/${userQuota} ตลาด) หากต้องการเปิดตลาดเพิ่ม กรุณากด "ยื่นเรื่องขอเพิ่มตลาดใหม่"`)}
                  >
                    🔒 ครบโควตาแล้ว ({markets.length}/${userQuota})
                  </button>
                )}
                <button style={styles.quotaRequestBtn} onClick={() => setShowRequestModal(true)}>
                  📄 ยื่นเรื่องขอเพิ่มตลาดใหม่
                </button>
              </div>
            </div>

            {markets.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={styles.emptyEmoji}>🏪</p>
                <p style={styles.emptyText}>ยังไม่มีตลาดที่คุณสร้าง</p>
                {markets.length < userQuota && (
                  <button style={styles.createBtn} onClick={() => setShowCreateMarket(true)}>
                    + สร้างตลาดแรก
                  </button>
                )}
              </div>
            ) : (
              <div style={styles.marketGrid}>
                {markets.map(m => (
                  <div key={m.id} style={styles.marketCard}>
                    {m.cover_url
                      ? <img src={m.cover_url} alt={m.name} style={{ width:'100%', height:'110px', objectFit:'cover', cursor:'pointer' }} onClick={() => setSelectedImage(m.cover_url)} title="คลิกดูรูปใหญ่" />
                      : <div style={styles.marketCardImg}>🏪</div>
                    }
                    <div style={styles.marketCardBody}>
                      <div style={styles.marketCardTop}>
                        <h3 style={styles.marketCardName}>{m.name}</h3>
                        <span style={{ fontSize:'10px', padding:'3px 10px', borderRadius:'20px', fontWeight:'700', backgroundColor: statusColor(m.status)+'20', color: statusColor(m.status) }}>
                          {m.status?.toUpperCase()}
                        </span>
                      </div>
                      <p style={styles.marketCardDate}>
                        📅 {m.start_date?.split('T')[0]} — {m.end_date?.split('T')[0]}
                      </p>
                      <div style={styles.marketCardActions}>
                        <button style={styles.editBtn} onClick={() => openEditMarket(m)}>EDIT</button>
                        <button
                          style={m.status === 'closed' ? styles.reopenBtn : styles.closeMarketBtn}
                          onClick={() => toggleMarketStatus(m)}
                        >
                          {m.status === 'closed' ? '▶ เปิดตลาด' : '⏸ ปิดตลาด'}
                        </button>
                        <button style={styles.deleteBtn}
                          onClick={async () => {
                            if (!window.confirm(`ต้องการลบตลาด "${m.name}" ไหม?`)) return;
                            try {
                              await api.delete(`/markets/${m.id}`);
                              alert('ลบตลาดสำเร็จ ✅');
                              fetchMarkets();
                            } catch (err) {
                              alert(err.response?.data?.message || 'เกิดข้อผิดพลาด');
                            }
                          }}>
                          DELETE
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 🟢 TAB: STALLS (กู้คืน Grid ล็อคและดีไซน์สมบูรณ์) ── */}
        {/* ── 🟢 TAB: STALLS (แยกกรอบตามโซน A / B) ── */}
        {tab === 'stalls' && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>ผังพื้นที่และราคา</h2>
            <p style={styles.sectionSub}>STALL LAYOUT & PRICE MANAGEMENT</p>

            {markets.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={styles.emptyText}>ยังไม่มีตลาด กรุณาสร้างตลาดก่อน</p>
              </div>
            ) : markets.map(m => {
              const marketStalls = stalls.filter(s => s.market_id === m.id);
              // จัดกลุ่มล็อคตามโซนของตลาดนี้
              const grouped = marketStalls.reduce((groups, stall) => {
                const zone = stall.zone || (stall.lock_number ? stall.lock_number[0] : 'ทั่วไป');
                if (!groups[zone]) groups[zone] = [];
                groups[zone].push(stall);
                return groups;
              }, {});

              return (
                <div key={m.id} style={styles.stallSection}>
                  <div style={styles.stallHeader}>
                    <div style={styles.stallThumb}>🏪</div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.stallMarketName}>{m.name}</div>
                      <div style={styles.stallCount}>{marketStalls.length} UNITS</div>
                    </div>
                    <button style={styles.addStallBtn} onClick={() => { setSelectedMarket(m); setShowAddStall(true); fetchStalls(m.id); }}>
                      + เพิ่มล็อค
                    </button>
                    <button style={styles.manageBtn} onClick={() => { setSelectedMarket(m); fetchStalls(m.id); fetchPayments(m.id); }}>
                      ✏️ จัดการล็อค
                    </button>
                  </div>

                  {Object.keys(grouped).length === 0 ? (
                    <p style={{ color: '#999', fontSize: '13px' }}>ยังไม่มีล็อคในตลาดนี้</p>
                  ) : (
                    Object.entries(grouped)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([zoneName, zoneStalls]) => (
                        <div key={zoneName} style={styles.zoneBox}>
                          <div style={styles.zoneHeader}>
                            <span style={styles.zoneBadge}>Zone {zoneName}</span>
                            <span style={styles.zoneCount}>
                              ทั้งหมด {zoneStalls.length} ล็อค • ราคา ฿{zoneStalls[0]?.price_per_day} / วัน
                            </span>
                          </div>

                          <div style={styles.stallGrid}>
                            {zoneStalls.map(s => (
                              <div key={s.id} style={styles.stallChipWrap}>
                                <div style={styles.stallChip}>
                                  <div style={styles.stallChipName}>{s.lock_number}</div>
                                  <div style={styles.stallChipPrice}>฿{s.price_per_day}</div>
                                </div>
                                <div style={styles.stallChipBtns}>
                                  <button style={styles.stallEditBtn} onClick={() => { setEditStall({ ...s }); setShowEditStall(true); }}>✏️</button>
                                  <button style={styles.stallDeleteBtn} onClick={() => deleteStall(s.id)}>🗑️</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                  )}

                  <div style={{ marginTop: '12px' }}>
                    <div style={{ ...styles.stallAddChip, width: '100%', height: '42px', fontSize: '14px', gap: '6px' }} onClick={() => { setSelectedMarket(m); setShowAddStall(true); }}>
                      ＋ เพิ่มล็อคใหม่ในตลาดนี้
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: BOOKINGS ── */}
        {tab === 'bookings' && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Booking Requests</h2>
            <p style={styles.sectionSub}>REVIEW STALL APPLICATIONS (พิจารณาคำขอจองพื้นที่จากร้านค้า)</p>

            <select style={styles.select} onChange={e => {
              const m = markets.find(x => x.id === Number(e.target.value));
              setSelectedMarket(m);
              if (m) fetchPayments(m.id);
            }}>
              <option value="">เลือกตลาดเพื่อดูรายการจอง</option>
              {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            {payments.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={styles.emptyText}>ยังไม่มีรายการจอง (หรือยังไม่ได้เลือกตลาดด้านบน)</p>
              </div>
            ) : payments.map(p => (
              <div key={p.id} style={styles.bookingRow}>
                <div style={styles.bookingAvatar}>
                  {p.logo_url ? (
                    <img src={p.logo_url} alt="Logo" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />
                  ) : (
                    (p.shop_name || p.vendor_name)?.charAt(0).toUpperCase() || 'V'
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={styles.bookingName}>{p.shop_name || p.vendor_name}</span>
                    <span style={{ fontSize:'12px', color:'#777' }}>({p.vendor_name})</span>
                  </div>

                  {p.booking_items && p.booking_items.length > 1 ? (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginTop:'6px' }}>
                      {p.booking_items.map((item, idx) => (
                        <span key={idx} style={{ 
                          fontSize: '11px', backgroundColor: '#e8f5e9', color: '#1a7a4a', 
                          border: '1px solid #c8e6c9', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' 
                        }}>
                          📅 {item.book_date} : <strong>LOCK {item.lock_number}</strong>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.bookingCompany}>
                      📅 วันที่จอง: {p.book_date?.slice(0, 10) || '-'} • <strong>LOCK {p.lock_number}</strong>
                    </div>
                  )}
                </div>

                <div style={styles.bookingAmnt}>฿{Number(p.amount || 0).toLocaleString()}</div>

                <div style={styles.bookingBtns}>
                  <button 
                    style={styles.viewShopBtn} 
                    onClick={() => { setSelectedVendorProfile(p); setVendorModalTab('profile'); }}
                  >
                    🔍 ดูข้อมูลร้าน
                  </button>

                  {p.slip_url && (
                    <a href={p.slip_url} target="_blank" rel="noreferrer" style={styles.slipBtn}>📎 ดูสลิป</a>
                  )}

                  {p.status === 'pending' ? (
                    <>
                      <button style={styles.approveBtn} onClick={() => verifyPayment(p.id, 'approve')}>✅ อนุมัติ</button>
                      <button style={styles.rejectBtn} onClick={() => { setRejectModalPayment(p); setRejectReason(''); }}>❌ ปฏิเสธ</button>
                    </>
                  ) : (
                    <span style={p.status === 'paid' || p.status === 'confirmed' ? styles.paidBadge : { ...styles.paidBadge, backgroundColor:'#fff0f0', color:'#e74c3c' }}>
                      {p.status === 'paid' || p.status === 'confirmed' ? '✅ อนุมัติแล้ว' : '❌ ปฏิเสธแล้ว'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB: PAYMENTS ── */}
        {tab === 'payments' && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Verification</h2>
            <p style={styles.sectionSub}>ยืนยันการชำระเงินจากผู้ขาย (คลิกแถวเพื่อตรวจสลิป)</p>

            <select style={styles.select} onChange={e => {
              const m = markets.find(x => x.id === Number(e.target.value));
              if (m) fetchPayments(m.id);
            }}>
              <option value="">เลือกตลาด</option>
              {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>

            <table style={styles.table}>
              <thead>
                <tr>{['ID', 'VENDOR', 'AMOUNT', 'STATUS', 'ACTIONS'].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign:'center', padding:'24px', color:'#999' }}>ยังไม่มีรายการ</td></tr>
                ) : payments.map(p => (
                  <tr 
                    key={p.id} 
                    style={{ ...styles.tr, cursor:'pointer' }}
                    onClick={() => setSelectedVerification(p)}
                    title="คลิกเพื่อตรวจสลิปและอนุมัติการชำระเงิน"
                  >
                    <td style={styles.td}>#{p.id}</td>
                    <td style={styles.td}><span style={{ fontWeight:'700', color:'#1a7a4a' }}>{p.shop_name || p.vendor_name}</span></td>
                    <td style={styles.td}>฿{Number(p.amount).toLocaleString()}</td>
                    <td style={styles.td}><span style={statusBadge(p.status)}>{p.status?.toUpperCase()}</span></td>
                    <td style={styles.td} onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', gap:'6px' }}>
                        {p.slip_url && <a href={p.slip_url} target="_blank" rel="noreferrer" style={styles.viewBtn}>👁</a>}
                        {p.status === 'pending' && (
                          <button style={styles.approveSmBtn} onClick={() => verifyPayment(p.id, 'approve')}>✓</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB: VENDORS ── */}
        {tab === 'vendors' && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Vendors Registry</h2>
            <p style={styles.sectionSub}>รายชื่อผู้ขายที่จองล็อคในตลาดของคุณ (คลิกแถวเพื่อดูข้อมูล)</p>

            {loadingVendors ? (
              <div style={styles.emptyBox}><p style={styles.emptyText}>⏳ กำลังโหลดข้อมูล...</p></div>
            ) : allPayments.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={styles.emptyEmoji}>👥</p>
                <p style={styles.emptyText}>ยังไม่มีผู้ขายจองล็อคในตลาดของคุณ</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr><th>VENDOR (ผู้ขาย / ร้านค้าที่จองล็อค)</th></tr>
                </thead>
                <tbody>
                  {Array.from(new Set(allPayments.map(p => p.user_id || p.vendor_name)))
                    .map(idOrName => {
                      const v = allPayments.find(p => (p.user_id === idOrName) || (p.vendor_name === idOrName));
                      return (
                        <tr 
                          key={idOrName} 
                          style={{ ...styles.tr, cursor: 'pointer' }}
                          onClick={() => {
                            setSelectedVendorProfile(v);
                            setVendorModalTab('profile');
                          }}
                          title="คลิกเพื่อดูโปรไฟล์ร้านค้า"
                        >
                          <td style={styles.td}>
                            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                              <div style={styles.vendorRowAvatar}>{v.vendor_name?.charAt(0).toUpperCase()}</div>
                              <div>
                                <span style={{ fontWeight: '700', color: '#1a7a4a', fontSize:'14px' }}>{v.shop_name || v.vendor_name}</span>
                                <div style={{ fontSize:'11px', color:'#888' }}>หมวดหมู่: {v.category || 'ทั่วไป'}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── TAB: REPORTS ── */}
        {tab === 'reports' && (() => {
          const paidPayments    = allPayments.filter(p => p.status === 'paid');
          const pendingPayments = allPayments.filter(p => p.status === 'pending');
          const totalRevenue    = paidPayments.reduce((s, p) => s + Number(p.amount), 0);
          const revenuePerMarket = markets.map(m => ({
            ...m,
            revenue: paidPayments.filter(p => p.market_id === m.id).reduce((s, p) => s + Number(p.amount), 0),
          }));
          const maxRevenue = Math.max(...revenuePerMarket.map(m => m.revenue), 1);

          return (
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>REPORTS</h2>
              <div style={styles.reportGrid}>
                <div>
                  <h4 style={styles.reportSubTitle}>REVENUE PER MARKET (ยอดที่ชำระแล้วจริง)</h4>
                  {markets.length === 0 ? (
                    <p style={styles.emptyText}>ยังไม่มีข้อมูล</p>
                  ) : revenuePerMarket.map(m => (
                    <div key={m.id} style={styles.reportBar}>
                      <div style={styles.reportLabel}>{m.name.toUpperCase()}</div>
                      <div style={styles.barWrap}>
                        <div style={{ ...styles.barFill, width: `${(m.revenue / maxRevenue) * 100}%` }} />
                      </div>
                      <div style={styles.reportVal}>฿{m.revenue.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div style={styles.utilBox}>
                  <div style={styles.utilNum}>฿{totalRevenue.toLocaleString()}</div>
                  <div style={styles.utilLabel}>TOTAL REVENUE (PAID)</div>
                  <div style={styles.utilRow}>
                    <span style={{ color:'#1a7a4a', fontWeight:'700' }}>{paidPayments.length} PAID</span>
                    <span style={{ color:'#f39c12', fontWeight:'700' }}>{pendingPayments.length} PENDING</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── TAB: SUBSCRIPTIONS ── */}
        {tab === 'subscriptions' && (
          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>🔒 คำขอผูกล็อค</h2>
            <p style={styles.sectionSub}>vendor ที่ต้องการผูกล็อคระยะยาว</p>

            {subscriptions.length === 0 ? (
              <div style={styles.emptyBox}>
                <p style={{fontSize:'32px', margin:'0 0 8px'}}>🔒</p>
                <p style={{color:'#aaa', fontSize:'13px'}}>ยังไม่มีคำขอผูกล็อค</p>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['VENDOR','ตลาด','ล็อค','Package','ยอด','ถึงวันที่','สลิป','สถานะ','Actions'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(sub => (
                    <tr key={sub.id} style={styles.tr}>
                      <td style={styles.td}>{sub.vendor_name}</td>
                      <td style={styles.td}>{sub.market_name}</td>
                      <td style={styles.td}>{sub.lock_number} {sub.zone && `Zone ${sub.zone}`}</td>
                      <td style={styles.td}>{sub.package_months} เดือน</td>
                      <td style={styles.td}>฿{Number(sub.amount).toLocaleString()}</td>
                      <td style={styles.td}>{sub.end_date?.slice(0,10)}</td>
                      <td style={styles.td}>
                        {sub.slip_url ? (
                          <a href={sub.slip_url} target="_blank" rel="noreferrer" style={styles.viewBtn}>
                            👁 ดูสลิป
                          </a>
                        ) : '-'}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          fontSize:'11px', padding:'3px 10px', borderRadius:'20px', fontWeight:'700',
                          backgroundColor: sub.status==='active' ? '#e8f5e9' : sub.status==='expired' ? '#fff0f0' : '#fff9e6',
                          color: sub.status==='active' ? '#1a7a4a' : sub.status==='expired' ? '#e74c3c' : '#f39c12',
                        }}>
                          {sub.status==='active' ? '✅ ACTIVE' : sub.status==='expired' ? '❌ หมดอายุ' : '⏳ รอยืนยัน'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {sub.status === 'pending' && (
                          <div style={{display:'flex', gap:'6px'}}>
                            <button style={styles.approveSmBtn}
                              onClick={async () => {
                                await api.put(`/subscriptions/${sub.id}/approve`);
                                fetchSubscriptions();
                                alert('✅ ยืนยันสำเร็จ');
                              }}>
                              ✓
                            </button>
                            <button style={{...styles.approveSmBtn, backgroundColor:'#e74c3c'}}
                              onClick={async () => {
                                await api.delete(`/subscriptions/${sub.id}`);
                                fetchSubscriptions();
                              }}>
                              ✕
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>

      {/* ── MODAL: ขอเพิ่มสาขาตลาดใหม่ ── */}
      {showRequestModal && (
        <div style={styles.overlay} onClick={() => setShowRequestModal(false)}>
          <div style={{ ...styles.modal, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>📄 ยื่นเรื่องขอเพิ่มตลาดใหม่</h3>
                <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
                  ส่งคำขอขยายสาขาตลาดไปยัง Admin เพื่อขออนุมัติเพิ่มโควตา
                </p>
              </div>
              <button style={styles.modalClose} onClick={() => setShowRequestModal(false)}>✕</button>
            </div>

            <label style={styles.label}>ชื่อตลาดที่ต้องการขอเปิด *</label>
            <input 
              style={styles.input} 
              placeholder="เช่น ตลาดอินดี้ สาขา 2"
              value={requestForm.business_name}
              onChange={e => setRequestForm({ ...requestForm, business_name: e.target.value })}
            />

            <label style={styles.label}>ที่ตั้ง / พื้นที่โดยประมาณ *</label>
            <input 
              style={styles.input} 
              placeholder="เช่น ถ.รามคำแหง เขตบางกะปิ กรุงเทพฯ"
              value={requestForm.location}
              onChange={e => setRequestForm({ ...requestForm, location: e.target.value })}
            />

            <label style={styles.label}>ประเภทตลาด</label>
            <select 
              style={styles.input}
              value={requestForm.business_type}
              onChange={e => setRequestForm({ ...requestForm, business_type: e.target.value })}
            >
              <option value="ตลาดนัดทั่วไป / ตลาดชุมชน">🏪 ตลาดนัดทั่วไป / ตลาดชุมชน</option>
              <option value="ตลาดอาหารและเครื่องดื่ม (Street Food)">🍲 ตลาดอาหารและเครื่องดื่ม / Street Food</option>
              <option value="ตลาดเสื้อผ้า แฟชั่น และของใช้">👗 ตลาดเสื้อผ้า / แฟชั่น / สินค้าเบ็ดเตล็ด</option>
              <option value="ถนนคนเดิน / ตลาดกลางคืน (Night Market)">🌙 ถนนคนเดิน / ตลาดกลางคืน (Night Market)</option>
              <option value="ตลาดเปิดท้าย / คลองถม / สินค้ามือสอง">📦 ตลาดเปิดท้าย / คลองถม / สินค้ามือสอง</option>
              <option value="ตลาดสินค้าเกษตร / ผักผลไม้ออร์แกนิก">🥦 ตลาดสินค้าเกษตร / ตลาดสด / สินค้าชุมชน</option>
              <option value="ตลาดต้นไม้ และสัตว์เลี้ยง">🌿 ตลาดต้นไม้ / สัตว์เลี้ยง</option>
              <option value="ตลาดศิลปะ งานคราฟต์ & DIY">🎨 ตลาดศิลปะ / งานคราฟต์ / สินค้าทำมือ</option>
              <option value="ตลาดเทศกาล / งานอีเวนต์พิเศษ (Event & Pop-up)">🎪 ตลาดเทศกาล / งานอีเวนต์พิเศษ (Pop-up)</option>
              <option value="อื่นๆ">📌 อื่นๆ (ระบุรายละเอียดเพิ่มเติมด้านล่าง)</option>
            </select>

            <label style={styles.label}>จำนวนล็อคโดยประมาณ</label>
            <input 
              style={styles.input} 
              type="number"
              placeholder="เช่น 50"
              value={requestForm.estimated_stalls}
              onChange={e => setRequestForm({ ...requestForm, estimated_stalls: e.target.value })}
            />

            <label style={styles.label}>รายละเอียด / แผนการจัดตลาด</label>
            <textarea 
              style={{ ...styles.input, height: '70px', resize: 'vertical' }}
              placeholder="อธิบายเหตุผลหรือแผนงานสั้นๆ..."
              value={requestForm.description}
              onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
            />

            <div style={styles.modalBtnRow}>
              <button 
                style={{ ...styles.saveBtn, opacity: submittingRequest ? 0.7 : 1 }} 
                onClick={submitRequestNewMarket}
                disabled={submittingRequest}
              >
                {submittingRequest ? '⏳ กำลังส่งคำขอ...' : '📨 ส่งคำขอเปิดตลาดใหม่'}
              </button>
              <button style={styles.cancelBtn} onClick={() => setShowRequestModal(false)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ข้อมูลส่วนตัว ── */}
      {showPersonalModal && (
        <div style={styles.overlay} onClick={() => setShowPersonalModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>👤 ข้อมูลส่วนตัว</h3>
                <p style={{ fontSize:'12px', color:'#888', margin:'2px 0 0' }}>แก้ไขข้อมูลส่วนตัวและข้อมูลรับชำระเงิน</p>
              </div>
              <button style={styles.modalClose} onClick={() => setShowPersonalModal(false)}>✕</button>
            </div>

            <div style={styles.personalGrid}>
              <div>
                <div style={styles.avatarSection}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" style={{ ...styles.avatarImg, cursor:'pointer' }} onClick={() => setSelectedImage(avatarUrl)} title="คลิกดูรูปใหญ่" />
                  ) : (
                    <div style={styles.avatarPlaceholder}>
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
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
                <label style={styles.label}>ชื่อ</label>
                <input style={styles.input}
                  value={personalForm.name}
                  onChange={e => setPersonalForm({ ...personalForm, name: e.target.value })}
                  placeholder="ชื่อของคุณ" />

                <label style={styles.label}>เบอร์โทรศัพท์</label>
                <input style={styles.input}
                  value={personalForm.phone}
                  onChange={e => setPersonalForm({ ...personalForm, phone: e.target.value })}
                  placeholder="0xx-xxx-xxxx" />

                <label style={styles.label}>อีเมล</label>
                <input style={{ ...styles.input, backgroundColor:'#f5f5f5', color:'#888' }}
                  value={user.email} disabled />
                <p style={{ fontSize:'11px', color:'#aaa', margin:'-8px 0 12px' }}>ไม่สามารถเปลี่ยนอีเมลได้</p>
              </div>
            </div>

            <div style={styles.sectionDivider}>💳 ข้อมูลรับชำระเงิน</div>
            <p style={{ fontSize:'12px', color:'#aaa', margin:'-8px 0 16px' }}>ข้อมูลนี้ใช้สำหรับระบบ Dynamic QR Code อัตโนมัติ</p>

            <label style={styles.label}>🏦 ชื่อธนาคาร</label>
            <input style={styles.input} placeholder="เช่น กสิกรไทย, SCB"
              value={paymentForm.bank_name}
              onChange={e => setPaymentForm({ ...paymentForm, bank_name: e.target.value })} />

            <label style={styles.label}>เลขบัญชีธนาคาร</label>
            <input style={styles.input} placeholder="เลขบัญชีธนาคาร"
              value={paymentForm.bank_account}
              onChange={e => setPaymentForm({ ...paymentForm, bank_account: e.target.value })} />

            <label style={styles.label}>ชื่อบัญชี</label>
            <input style={styles.input} placeholder="ชื่อเจ้าของบัญชี"
              value={paymentForm.bank_account_name}
              onChange={e => setPaymentForm({ ...paymentForm, bank_account_name: e.target.value })} />

            <label style={styles.label}>📞 เบอร์พร้อมเพย์รับเงิน (PromptPay Number)</label>
            <input style={styles.input} placeholder="เช่น 0956061884"
              value={paymentForm.promptpay_number}
              onChange={e => setPaymentForm({ ...paymentForm, promptpay_number: e.target.value })} />
            <p style={{ fontSize:'11px', color:'#888', margin:'-8px 0 16px' }}>ใช้สำหรับสร้าง QR Code อัตโนมัติตามยอดเงินที่ลูกค้าต้องชำระ</p>

            {personalSaveMsg && (
              <div style={styles.successBox}>{personalSaveMsg}</div>
            )}

            <div style={styles.modalBtnRow}>
              <button style={styles.saveBtn} onClick={savePersonalInfo}>💾 บันทึกข้อมูล</button>
              <button style={styles.cancelBtn} onClick={() => setShowPersonalModal(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VERIFICATION ── */}
      {selectedVerification && (
        <div style={styles.overlay} onClick={() => setSelectedVerification(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'48px', height:'48px', borderRadius:'50%', backgroundColor:'#1a7a4a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'800' }}>
                  {selectedVerification.vendor_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={styles.modalTitle}>ตรวจสอบการชำระเงิน — #{selectedVerification.id}</h3>
                  <p style={{ fontSize:'12px', color:'#888', margin:'2px 0 0' }}>ผู้ขาย: {selectedVerification.vendor_name}</p>
                </div>
              </div>
              <button style={styles.modalClose} onClick={() => setSelectedVerification(null)}>✕</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'12px', backgroundColor:'#f8f9fa', padding:'16px', borderRadius:'12px', marginBottom:'16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color:'#888' }}>ตลาด:</span>
                <span style={{ fontWeight:'700', color:'#222' }}>{selectedVerification.market_name}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color:'#888' }}>ล็อค:</span>
                <span style={{ fontWeight:'700', color:'#1a7a4a' }}>LOCK {selectedVerification.lock_number}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color:'#888' }}>ยอดชำระ:</span>
                <span style={{ fontWeight:'700', color:'#27ae60' }}>฿{Number(selectedVerification.amount).toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
                <span style={{ color:'#888' }}>สถานะ:</span>
                <span style={statusBadge(selectedVerification.status)}>{selectedVerification.status?.toUpperCase()}</span>
              </div>
            </div>

            {selectedVerification.slip_url && (
              <div style={{ marginBottom:'16px' }}>
                <label style={styles.label}>🖼️ หลักฐานการชำระเงิน (สลิป)</label>
                <div style={{ ...styles.qrPreviewFrame, maxHeight:'220px', textAlign:'center', backgroundColor:'#000' }}>
                  <img 
                    src={selectedVerification.slip_url} 
                    alt="Slip" 
                    style={{ maxWidth:'100%', maxHeight:'220px', objectFit:'contain', cursor:'zoom-in', display:'inline-block' }} 
                    onClick={() => setSelectedImage(selectedVerification.slip_url)}
                    title="คลิกดูรูปสลิปเต็ม"
                  />
                </div>
              </div>
            )}

            <div style={styles.modalBtnRow}>
              {selectedVerification.status === 'pending' && (
                <>
                  <button style={styles.saveBtn} onClick={() => { verifyPayment(selectedVerification.id, 'approve'); setSelectedVerification(null); }}>
                    ✓ อนุมัติ (Approve)
                  </button>
                  <button style={{ ...styles.cancelBtn, backgroundColor:'#fff0f0', color:'#e74c3c' }} onClick={() => { setRejectModalPayment(selectedVerification); setSelectedVerification(null); }}>
                    ✕ ปฏิเสธ (Reject)
                  </button>
                </>
              )}
              <button style={styles.cancelBtn} onClick={() => setSelectedVerification(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: VENDOR PROFILE & BOOKINGS ── */}
      {selectedVendorProfile && (
        <div style={styles.overlay} onClick={() => setSelectedVendorProfile(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'48px', height:'48px', borderRadius:'50%', backgroundColor:'#1a7a4a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'800', overflow:'hidden' }}>
                  {selectedVendorProfile.logo_url ? (
                    <img src={selectedVendorProfile.logo_url} alt="Logo" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                  ) : (
                    (selectedVendorProfile.shop_name || selectedVendorProfile.vendor_name)?.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 style={styles.modalTitle}>{selectedVendorProfile.shop_name || selectedVendorProfile.vendor_name}</h3>
                  <p style={{ fontSize:'12px', color:'#888', margin:'2px 0 0' }}>ผู้ขาย: {selectedVendorProfile.vendor_name}</p>
                </div>
              </div>
              <button style={styles.modalClose} onClick={() => setSelectedVendorProfile(null)}>✕</button>
            </div>

            <div style={{ display:'flex', gap:'8px', marginBottom:'16px', backgroundColor:'#f0f0f0', padding:'4px', borderRadius:'8px' }}>
              <button 
                style={{ flex:1, padding:'8px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'700', fontSize:'13px', backgroundColor: vendorModalTab === 'profile' ? '#fff' : 'transparent', color: vendorModalTab === 'profile' ? '#1a7a4a' : '#666' }}
                onClick={() => setVendorModalTab('profile')}
              >
                🏪 ข้อมูลร้านค้า
              </button>
              <button 
                style={{ flex:1, padding:'8px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'700', fontSize:'13px', backgroundColor: vendorModalTab === 'bookings' ? '#fff' : 'transparent', color: vendorModalTab === 'bookings' ? '#1a7a4a' : '#666' }}
                onClick={() => setVendorModalTab('bookings')}
              >
                📦 ประวัติการจองล็อค
              </button>
            </div>

            {vendorModalTab === 'profile' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {selectedVendorProfile.logo_url ? (
                  <div style={{ textAlign:'center', backgroundColor:'#f9f9f9', padding:'12px', borderRadius:'10px', border:'1px solid #eee' }}>
                    <img 
                      src={selectedVendorProfile.logo_url} 
                      alt="Shop Logo" 
                      style={{ width:'100%', maxHeight:'180px', objectFit:'cover', borderRadius:'8px', cursor:'pointer' }} 
                      onClick={() => setSelectedImage(selectedVendorProfile.logo_url)}
                      title="คลิกดูรูปใหญ่"
                    />
                  </div>
                ) : (
                  <div style={{ textAlign:'center', padding:'24px', backgroundColor:'#f8f9fa', borderRadius:'10px', color:'#aaa', fontSize:'13px' }}>
                    ยังไม่มีรูปภาพหน้าร้าน
                  </div>
                )}

                <div style={{ display:'flex', flexDirection:'column', gap:'10px', backgroundColor:'#f8f9fa', padding:'14px', borderRadius:'10px', fontSize:'13px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'#888' }}>ชื่อร้านค้า:</span>
                    <span style={{ fontWeight:'700', color:'#222' }}>{selectedVendorProfile.shop_name || '-'}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'#888' }}>เจ้าของร้าน:</span>
                    <span style={{ fontWeight:'600', color:'#444' }}>{selectedVendorProfile.vendor_name}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'#888' }}>เบอร์โทรติดต่อ:</span>
                    <span style={{ fontWeight:'700', color:'#1a7a4a' }}>📞 {selectedVendorProfile.vendor_phone || 'ไม่ระบุ'}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'#888' }}>หมวดหมู่สินค้า:</span>
                    <span style={{ fontWeight:'700', color:'#1a7a4a' }}>🏷️ {selectedVendorProfile.category || 'ทั่วไป'}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    <span style={{ color:'#888' }}>รายละเอียดสินค้า / เมนูที่ขาย:</span>
                    <span style={{ fontWeight:'600', color:'#444', backgroundColor:'#fff', padding:'8px 10px', borderRadius:'6px', border:'1px solid #eee' }}>
                      {selectedVendorProfile.description || 'ไม่มีคำอธิบายสินค้า'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {vendorModalTab === 'bookings' && (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'260px', overflowY:'auto' }}>
                {allPayments
                  .filter(p => (p.user_id && p.user_id === selectedVendorProfile.user_id) || p.vendor_name === selectedVendorProfile.vendor_name)
                  .length === 0 ? (
                    <p style={{ textAlign:'center', color:'#aaa', padding:'20px', fontSize:'13px' }}>ยังไม่มีประวัติการจอง</p>
                  ) : (
                    allPayments
                      .filter(p => (p.user_id && p.user_id === selectedVendorProfile.user_id) || p.vendor_name === selectedVendorProfile.vendor_name)
                      .map((item, idx) => (
                        <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor:'#f8f9fa', padding:'10px 14px', borderRadius:'8px', border:'1px solid #eee', fontSize:'13px' }}>
                          <div>
                            <div style={{ fontWeight:'700', color:'#1a7a4a' }}>🏪 {item.market_name}</div>
                            <div style={{ fontSize:'12px', color:'#555' }}>ล็อค: <strong>LOCK {item.lock_number}</strong> • วันที่: {item.book_date ? item.book_date.slice(0, 10) : '-'}</div>
                          </div>
                          <span style={statusBadge(item.status)}>{item.status?.toUpperCase()}</span>
                        </div>
                      ))
                  )
                }
              </div>
            )}

            <div style={styles.modalBtnRow}>
              <button style={styles.cancelBtn} onClick={() => setSelectedVendorProfile(null)}>ปิดหน้าต่าง</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ปฏิเสธการจองพร้อมระบุเหตุผล ── */}
      {rejectModalPayment && (
        <div style={styles.overlay} onClick={() => setRejectModalPayment(null)}>
          <div style={{ ...styles.modal, maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={{ ...styles.modalTitle, color: '#e74c3c' }}>❌ ปฏิเสธการจองพื้นที่</h3>
                <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
                  ร้านค้า: <strong>{rejectModalPayment.shop_name || rejectModalPayment.vendor_name}</strong>
                </p>
              </div>
              <button style={styles.modalClose} onClick={() => setRejectModalPayment(null)}>✕</button>
            </div>

            <label style={styles.label}>เลือกเหตุผลด่วน:</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              {[
                'สลิปโอนเงินไม่ถูกต้อง / ยอดเงินไม่ตรง',
                'หลักฐานการชำระเงินไม่ชัดเจน',
                'สินค้าไม่ตรงตามหมวดหมู่ของตลาด',
                'ล็อคในวันดังกล่าวไม่พร้อมให้บริการ / ปิดปรับปรุง'
              ].map((reasonText, idx) => (
                <button
                  key={idx}
                  type="button"
                  style={{
                    padding: '8px 12px', textAlign: 'left', borderRadius: '6px', border: '1px solid #ddd',
                    backgroundColor: rejectReason === reasonText ? '#fff0f0' : '#f9f9f9',
                    color: rejectReason === reasonText ? '#e74c3c' : '#333',
                    fontSize: '12px', fontWeight: rejectReason === reasonText ? '700' : 'normal', cursor: 'pointer'
                  }}
                  onClick={() => setRejectReason(reasonText)}
                >
                  {rejectReason === reasonText ? '✓ ' : '• '} {reasonText}
                </button>
              ))}
            </div>

            <label style={styles.label}>ระบุเหตุผลเพิ่มเติม (จะส่งแจ้งเตือนไปยังผู้ค้า):</label>
            <textarea
              style={{ ...styles.input, height: '70px', resize: 'vertical' }}
              placeholder="พิมพ์เหตุผลที่ปฏิเสธให้ผู้ค้าทราบ..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
            />

            <div style={styles.modalBtnRow}>
              <button
                style={{ ...styles.saveBtn, backgroundColor: '#e74c3c' }}
                onClick={() => {
                  if (!rejectReason.trim()) return alert('กรุณาระบุเหตุผลการปฏิเสธ');
                  verifyPayment(rejectModalPayment.id, 'reject', rejectReason);
                }}
              >
                ยืนยันการปฏิเสธ
              </button>
              <button style={styles.cancelBtn} onClick={() => setRejectModalPayment(null)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: สร้างตลาด ── */}
      {showCreateMarket && (
        <div style={styles.overlay} onClick={() => setShowCreateMarket(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>สร้างตลาดใหม่</h3>
              <button style={styles.modalClose} onClick={() => setShowCreateMarket(false)}>✕</button>
            </div>

            {approvedMarketsList.length > 0 && (
              <div style={{ backgroundColor: '#e8f5e9', border: '1.5px dashed #1a7a4a', padding: '12px 14px', borderRadius: '10px', marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#1a7a4a', display: 'block', marginBottom: '6px' }}>
                  ⚡ นำเข้าข้อมูลจากตลาดที่คุณเคยยื่นขออนุมัติไว้:
                </label>
                <select 
                  style={{ ...styles.input, marginBottom: 0, backgroundColor: '#fff' }}
                  onChange={(e) => {
                    const selected = approvedMarketsList.find(m => m.name === e.target.value);
                    if (selected) {
                      setMarketForm(prev => ({
                        ...prev,
                        name: selected.name || prev.name,
                        address: selected.address || prev.address,
                        description: selected.description || prev.description
                      }));
                    }
                  }}
                >
                  <option value="">-- เลือกเพื่อกรอกชื่อและที่ตั้งอัตโนมัติ --</option>
                  {approvedMarketsList.map((m, idx) => (
                    <option key={idx} value={m.name}>🏪 {m.name} ({m.address || 'ไม่ระบุที่ตั้ง'})</option>
                  ))}
                </select>
              </div>
            )}

            <label style={styles.label}>ชื่อตลาด *</label>
            <input style={styles.input} placeholder="ชื่อตลาด"
              value={marketForm.name}
              onChange={e => setMarketForm({ ...marketForm, name: e.target.value })} />

            <label style={styles.label}>คำอธิบาย</label>
            <textarea style={{ ...styles.input, height:'60px', resize:'vertical' }}
              placeholder="บรรยายตลาด..."
              value={marketForm.description}
              onChange={e => setMarketForm({ ...marketForm, description: e.target.value })} />

            <label style={styles.label}>📅 วันเปิดขายของตลาด (คลิกเลือกวันที่ต้องการเปิดตลาดในปฏิทิน) *</label>
            {renderCalendarGrid()}

            <div style={styles.formRow}>
              <div style={styles.formCol}>
                <label style={styles.label}>เวลาเปิด (น.)</label>
                <input style={styles.input} type="time"
                  value={marketForm.open_time}
                  onChange={e => setMarketForm({ ...marketForm, open_time: e.target.value })} />
              </div>
              <div style={styles.formCol}>
                <label style={styles.label}>เวลาปิด (น.)</label>
                <input style={styles.input} type="time"
                  value={marketForm.close_time}
                  onChange={e => setMarketForm({ ...marketForm, close_time: e.target.value })} />
              </div>
            </div>

            <label style={styles.label}>ที่อยู่</label>
            <input style={styles.input} placeholder="ที่อยู่ตลาด เช่น 123 ถ.มิตรภาพ"
              value={marketForm.address}
              onChange={e => setMarketForm({ ...marketForm, address: e.target.value })} />

            <div style={styles.formRow}>
              <div style={styles.formCol}>
                <label style={styles.label}>จังหวัด</label>
                <input style={styles.input} placeholder="เช่น พิษณุโลก"
                  value={marketForm.province}
                  onChange={e => setMarketForm({ ...marketForm, province: e.target.value })} />
              </div>
              <div style={styles.formCol}>
                <label style={styles.label}>📐 ขนาดพื้นที่ตลาด</label>
                <input style={styles.input} placeholder="เช่น 3 ไร่ หรือ 2,000 ตร.ม."
                  value={marketForm.area_size}
                  onChange={e => setMarketForm({ ...marketForm, area_size: e.target.value })} />
              </div>
            </div>

            <label style={styles.label}>📍 พิกัดที่ตั้งตลาด (คลิกบนแผนที่เพื่อเปลี่ยนตำแหน่ง)</label>
            <div style={styles.formRow}>
              <div style={styles.formCol}>
                <input style={styles.input} placeholder="Latitude"
                  value={marketForm.lat}
                  onChange={e => setMarketForm({ ...marketForm, lat: e.target.value })} />
              </div>
              <div style={styles.formCol}>
                <input style={styles.input} placeholder="Longitude"
                  value={marketForm.lng}
                  onChange={e => setMarketForm({ ...marketForm, lng: e.target.value })} />
              </div>
            </div>

            <button type="button" style={styles.locationBtn} onClick={() => getCurrentLocation(false)}>
              📍 ใช้ตำแหน่งปัจจุบันของฉัน
            </button>

            <div style={{ height:'220px', borderRadius:'10px', overflow:'hidden', marginBottom:'16px', border:'1px solid #ddd' }}>
              <MapContainer
                center={[
                  marketForm.lat ? Number(marketForm.lat) : 13.7563,
                  marketForm.lng ? Number(marketForm.lng) : 100.5018
                ]}
                zoom={14}
                style={{ height:'100%', width:'100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <LocationPicker
                  position={{ lat: marketForm.lat, lng: marketForm.lng }}
                  setPosition={(pos) => setMarketForm(prev => ({ ...prev, lat: pos.lat, lng: pos.lng }))}
                />
              </MapContainer>
            </div>

            <label style={styles.label}>🖼️ รูปปกตลาด (แสดงหน้าแรก)</label>
            {marketForm.cover_url ? (
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <img src={marketForm.cover_url} alt="cover preview"
                  style={{ width:'100%', height:'140px', objectFit:'cover', borderRadius:'8px', cursor:'pointer' }} 
                  onClick={() => setSelectedImage(marketForm.cover_url)} title="คลิกดูรูปใหญ่" />
                <button type="button" style={styles.deleteImgBtn} onClick={() => setMarketForm(prev => ({ ...prev, cover_url: '' }))}>
                  🗑️ ลบรูปเพื่ออัปโหลดใหม่
                </button>
              </div>
            ) : (
              <ImageUpload label="อัปโหลดรูปปกตลาด"
                onUpload={(url) => setMarketForm(prev => ({ ...prev, cover_url: url }))} />
            )}

            <label style={styles.label}>🗺️ รูปผังตลาด (แสดงในหน้าจอง)</label>
            {marketForm.layout_url ? (
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <img src={marketForm.layout_url} alt="layout preview"
                  style={{ width:'100%', height:'140px', objectFit:'cover', borderRadius:'8px', cursor:'pointer' }} 
                  onClick={() => setSelectedImage(marketForm.layout_url)} title="คลิกดูรูปใหญ่" />
                <button type="button" style={styles.deleteImgBtn} onClick={() => setMarketForm(prev => ({ ...prev, layout_url: '' }))}>
                  🗑️ ลบรูปเพื่ออัปโหลดใหม่
                </button>
              </div>
            ) : (
              <ImageUpload label="อัปโหลดรูปผังตลาด" type="layout"
                onUpload={(url) => setMarketForm(prev => ({ ...prev, layout_url: url }))} />
            )}

            <div style={{ fontWeight: '800', fontSize: '14px', color: '#222', marginBottom: '10px' }}>
              🏪 สิ่งอำนวยความสะดวกในตลาด
            </div>

            <div style={{ backgroundColor: '#fafafa', border: '1px solid #eee', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
              <label style={{ ...styles.label, marginBottom: '8px' }}>🚻 ห้องน้ำ</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: marketForm.has_restroom == 1 ? '10px' : '0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="create_restroom" value="1"
                    checked={marketForm.has_restroom == 1}
                    onChange={() => setMarketForm({ ...marketForm, has_restroom: 1 })} />
                  ✅ มีห้องน้ำ
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="create_restroom" value="0"
                    checked={marketForm.has_restroom == 0}
                    onChange={() => setMarketForm({ ...marketForm, has_restroom: 0, restrooms: '' })} />
                  ❌ ไม่มีห้องน้ำ
                </label>
              </div>

              {marketForm.has_restroom == 1 && (
                <div style={{ marginTop: '8px' }}>
                  <label style={styles.label}>จำนวนห้องน้ำ</label>
                  <input style={{ ...styles.input, marginBottom: 0 }} placeholder="เช่น 8 ห้อง (แยกชาย-หญิง)"
                    value={marketForm.restrooms}
                    onChange={e => setMarketForm({ ...marketForm, restrooms: e.target.value })} />
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#fafafa', border: '1px solid #eee', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <label style={{ ...styles.label, marginBottom: '8px' }}>🚗 ที่จอดรถ</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: marketForm.has_parking == 1 ? '10px' : '0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="create_parking" value="1"
                    checked={marketForm.has_parking == 1}
                    onChange={() => setMarketForm({ ...marketForm, has_parking: 1 })} />
                  ✅ มีที่จอดรถ
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="create_parking" value="0"
                    checked={marketForm.has_parking == 0}
                    onChange={() => setMarketForm({ ...marketForm, has_parking: 0, parking_slots: '', parking_info: '', parking_url: '' })} />
                  ❌ ไม่มีที่จอดรถ
                </label>
              </div>

              {marketForm.has_parking == 1 && (
                <div style={{ marginTop: '10px' }}>
                  <label style={styles.label}>จำนวนที่จอดรถ</label>
                  <input style={styles.input} placeholder="เช่น 100 คัน"
                    value={marketForm.parking_slots}
                    onChange={e => setMarketForm({ ...marketForm, parking_slots: e.target.value })} />

                  <label style={styles.label}>รายละเอียดที่จอดรถ</label>
                  <textarea style={{ ...styles.input, height: '60px', resize: 'vertical' }}
                    placeholder="เช่น จอดฟรี 200 คัน มี รปภ. ดูแล 24 ชม."
                    value={marketForm.parking_info || ''}
                    onChange={e => setMarketForm({ ...marketForm, parking_info: e.target.value })} />

                  <label style={styles.label}>🖼️ รูปรายละเอียดตลาด (ที่จอดรถ)</label>
                  {marketForm.parking_url ? (
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <img src={marketForm.parking_url} alt="parking"
                        style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #eee', cursor: 'pointer' }}
                        onClick={() => setSelectedImage(marketForm.parking_url)} title="คลิกดูรูปใหญ่" />
                      <button type="button" style={styles.deleteImgBtn} onClick={() => setMarketForm(prev => ({ ...prev, parking_url: '' }))}>
                        🗑️ ลบรูปเพื่ออัปโหลดใหม่
                      </button>
                    </div>
                  ) : (
                    <ImageUpload type="market" label="อัปโหลดรูปรายละเอียดตลาด"
                      onUpload={(url) => setMarketForm({ ...marketForm, parking_url: url })} />
                  )}
                </div>
              )}
            </div>

            <div style={styles.modalBtnRow}>
              <button style={styles.saveBtn} onClick={createMarket}>✅ สร้างตลาด</button>
              <button style={styles.cancelBtn} onClick={() => setShowCreateMarket(false)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: แก้ไขตลาด ── */}
      {showEditMarket && (
        <div style={styles.overlay} onClick={() => setShowEditMarket(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>✏️ แก้ไขตลาด</h3>
              <button style={styles.modalClose} onClick={() => setShowEditMarket(false)}>✕</button>
            </div>

            <label style={styles.label}>ชื่อตลาด *</label>
            <input style={styles.input}
              value={editMarketForm.name}
              onChange={e => setEditMarketForm({ ...editMarketForm, name: e.target.value })} />

            <label style={styles.label}>คำอธิบาย</label>
            <textarea style={{ ...styles.input, height:'60px', resize:'vertical' }}
              value={editMarketForm.description}
              onChange={e => setEditMarketForm({ ...editMarketForm, description: e.target.value })} />

            <label style={styles.label}>📅 วันเปิดขายของตลาด (คลิกเลือกวันที่ต้องการเปิดตลาดในปฏิทิน) *</label>
            {renderEditCalendarGrid()}

            <div style={styles.formRow}>
              <div style={styles.formCol}>
                <label style={styles.label}>เวลาเปิด (น.)</label>
                <input style={styles.input} type="time"
                  value={editMarketForm.open_time}
                  onChange={e => setEditMarketForm({ ...editMarketForm, open_time: e.target.value })} />
              </div>
              <div style={styles.formCol}>
                <label style={styles.label}>เวลาปิด (น.)</label>
                <input style={styles.input} type="time"
                  value={editMarketForm.close_time}
                  onChange={e => setEditMarketForm({ ...editMarketForm, close_time: e.target.value })} />
              </div>
            </div>

            <label style={styles.label}>ที่อยู่</label>
            <input style={styles.input}
              value={editMarketForm.address}
              onChange={e => setEditMarketForm({ ...editMarketForm, address: e.target.value })} />

            <div style={styles.formRow}>
              <div style={styles.formCol}>
                <label style={styles.label}>จังหวัด</label>
                <input style={styles.input}
                  value={editMarketForm.province}
                  onChange={e => setEditMarketForm({ ...editMarketForm, province: e.target.value })} />
              </div>
              <div style={styles.formCol}>
                <label style={styles.label}>📐 ขนาดพื้นที่ตลาด</label>
                <input style={styles.input} placeholder="เช่น 3 ไร่ หรือ 2,000 ตร.ม."
                  value={editMarketForm.area_size}
                  onChange={e => setEditMarketForm({ ...editMarketForm, area_size: e.target.value })} />
              </div>
            </div>

            <label style={styles.label}>📍 พิกัดที่ตั้งตลาด (คลิกบนแผนที่เพื่อเปลี่ยนตำแหน่ง)</label>
            <div style={styles.formRow}>
              <div style={styles.formCol}>
                <input style={styles.input} placeholder="Latitude"
                  value={editMarketForm.lat}
                  onChange={e => setEditMarketForm({ ...editMarketForm, lat: e.target.value })} />
              </div>
              <div style={styles.formCol}>
                <input style={styles.input} placeholder="Longitude"
                  value={editMarketForm.lng}
                  onChange={e => setEditMarketForm({ ...editMarketForm, lng: e.target.value })} />
              </div>
            </div>

            <button type="button" style={styles.locationBtn} onClick={() => getCurrentLocation(true)}>
              📍 ใช้ตำแหน่งปัจจุบันของฉัน
            </button>

            <div style={{ height:'220px', borderRadius:'10px', overflow:'hidden', marginBottom:'16px', border:'1px solid #ddd' }}>
              <MapContainer
                center={[
                  editMarketForm.lat ? Number(editMarketForm.lat) : 13.7563,
                  editMarketForm.lng ? Number(editMarketForm.lng) : 100.5018
                ]}
                zoom={14}
                style={{ height:'100%', width:'100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap'
                />
                <LocationPicker
                  position={{ lat: editMarketForm.lat, lng: editMarketForm.lng }}
                  setPosition={(pos) => setEditMarketForm(prev => ({ ...prev, lat: pos.lat, lng: pos.lng }))}
                />
              </MapContainer>
            </div>

            <label style={styles.label}>🖼️ รูปปกตลาด (แสดงหน้าแรก)</label>
            {editMarketForm.cover_url ? (
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <img src={editMarketForm.cover_url} alt="cover"
                  style={{ width:'100%', height:'140px', objectFit:'cover', borderRadius:'8px', cursor:'pointer' }} 
                  onClick={() => setSelectedImage(editMarketForm.cover_url)} title="คลิกดูรูปใหญ่" />
                <button type="button" style={styles.deleteImgBtn} onClick={() => setEditMarketForm(prev => ({ ...prev, cover_url: '' }))}>
                  🗑️ ลบรูปเพื่ออัปโหลดใหม่
                </button>
              </div>
            ) : (
              <ImageUpload label="อัปโหลดรูปปกตลาดใหม่"
                onUpload={(url) => setEditMarketForm(prev => ({ ...prev, cover_url: url }))} />
            )}

            <label style={styles.label}>🗺️ รูปผังตลาด (แสดงในหน้าจอง)</label>
            {editMarketForm.layout_url ? (
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <img src={editMarketForm.layout_url} alt="layout"
                  style={{ width:'100%', aspectRatio:'2/1', objectFit:'contain', backgroundColor:'#f5f5f5', borderRadius:'8px', cursor:'pointer' }} 
                  onClick={() => setSelectedImage(editMarketForm.layout_url)} title="คลิกดูรูปใหญ่" />
                <button type="button" style={styles.deleteImgBtn} onClick={() => setEditMarketForm(prev => ({ ...prev, layout_url: '' }))}>
                  🗑️ ลบรูปเพื่ออัปโหลดใหม่
                </button>
              </div>
            ) : (
              <ImageUpload label="อัปโหลดรูปผังตลาดใหม่" type="layout"
                onUpload={(url) => setEditMarketForm(prev => ({ ...prev, layout_url: url }))} />
            )}

            <div style={{ fontWeight: '800', fontSize: '14px', color: '#222', marginBottom: '10px' }}>
              🏪 สิ่งอำนวยความสะดวกในตลาด
            </div>

            <div style={{ backgroundColor: '#fafafa', border: '1px solid #eee', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
              <label style={{ ...styles.label, marginBottom: '8px' }}>🚻 ห้องน้ำ</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: editMarketForm.has_restroom == 1 ? '10px' : '0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="restroom" value="1"
                    checked={editMarketForm.has_restroom == 1}
                    onChange={() => setEditMarketForm({ ...editMarketForm, has_restroom: 1 })} />
                  ✅ มีห้องน้ำ
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="restroom" value="0"
                    checked={editMarketForm.has_restroom == 0}
                    onChange={() => setEditMarketForm({ ...editMarketForm, has_restroom: 0, restrooms: '' })} />
                  ❌ ไม่มีห้องน้ำ
                </label>
              </div>

              {editMarketForm.has_restroom == 1 && (
                <div style={{ marginTop: '8px' }}>
                  <label style={styles.label}>จำนวนห้องน้ำ</label>
                  <input style={{ ...styles.input, marginBottom: 0 }} placeholder="เช่น 8 ห้อง (แยกชาย-หญิง)"
                    value={editMarketForm.restrooms}
                    onChange={e => setEditMarketForm({ ...editMarketForm, restrooms: e.target.value })} />
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#fafafa', border: '1px solid #eee', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
              <label style={{ ...styles.label, marginBottom: '8px' }}>🚗 ที่จอดรถ</label>
              <div style={{ display: 'flex', gap: '16px', marginBottom: editMarketForm.has_parking == 1 ? '10px' : '0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="parking" value="1"
                    checked={editMarketForm.has_parking == 1}
                    onChange={() => setEditMarketForm({ ...editMarketForm, has_parking: 1 })} />
                  ✅ มีที่จอดรถ
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input type="radio" name="parking" value="0"
                    checked={editMarketForm.has_parking == 0}
                    onChange={() => setEditMarketForm({ ...editMarketForm, has_parking: 0, parking_slots: '', parking_info: '', parking_url: '' })} />
                  ❌ ไม่มีที่จอดรถ
                </label>
              </div>

              {editMarketForm.has_parking == 1 && (
                <div style={{ marginTop: '10px' }}>
                  <label style={styles.label}>จำนวนที่จอดรถ</label>
                  <input style={styles.input} placeholder="เช่น 100 คัน"
                    value={editMarketForm.parking_slots}
                    onChange={e => setEditMarketForm({ ...editMarketForm, parking_slots: e.target.value })} />

                  <label style={styles.label}>รายละเอียดที่จอดรถ</label>
                  <textarea style={{ ...styles.input, height: '60px', resize: 'vertical' }}
                    placeholder="เช่น จอดฟรี 200 คัน มี รปภ. ดูแล 24 ชม."
                    value={editMarketForm.parking_info || ''}
                    onChange={e => setEditMarketForm({ ...editMarketForm, parking_info: e.target.value })} />

                  <label style={styles.label}>🖼️ รูปรายละเอียดตลาด (ที่จอดรถ)</label>
                  {editMarketForm.parking_url ? (
                    <div style={{ position: 'relative', marginBottom: '8px' }}>
                      <img src={editMarketForm.parking_url} alt="parking"
                        style={{ width: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #eee', cursor: 'pointer' }}
                        onClick={() => setSelectedImage(editMarketForm.parking_url)} title="คลิกดูรูปใหญ่" />
                      <button type="button" style={styles.deleteImgBtn} onClick={() => setEditMarketForm(prev => ({ ...prev, parking_url: '' }))}>
                        🗑️ ลบรูปเพื่ออัปโหลดใหม่
                      </button>
                    </div>
                  ) : (
                    <ImageUpload type="market" label="อัปโหลดรูปรายละเอียดตลาด"
                      onUpload={(url) => setEditMarketForm({ ...editMarketForm, parking_url: url })} />
                  )}
                </div>
              )}
            </div>

            <div style={styles.modalBtnRow}>
              <button style={styles.saveBtn} onClick={updateMarket}>💾 บันทึก</button>
              <button style={styles.cancelBtn} onClick={() => setShowEditMarket(false)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: เพิ่มล็อค ── */}
      {showAddStall && (
        <div style={styles.overlay} onClick={() => setShowAddStall(false)}>
          <div style={{ ...styles.modal, maxWidth:'460px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>เพิ่มล็อค — {selectedMarket?.name}</h3>
              <button style={styles.modalClose} onClick={() => setShowAddStall(false)}>✕</button>
            </div>

            <div style={{ display:'flex', gap:'8px', marginBottom:'16px', backgroundColor:'#f0f0f0', padding:'4px', borderRadius:'8px' }}>
              <button 
                type="button"
                style={{ flex:1, padding:'8px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'700', fontSize:'13px', backgroundColor: stallMode === 'single' ? '#fff' : 'transparent', color: stallMode === 'single' ? '#1a7a4a' : '#666' }}
                onClick={() => setStallMode('single')}
              >
                ➕ ทีละ 1 ล็อค
              </button>
              <button 
                type="button"
                style={{ flex:1, padding:'8px', border:'none', borderRadius:'6px', cursor:'pointer', fontWeight:'700', fontSize:'13px', backgroundColor: stallMode === 'batch' ? '#fff' : 'transparent', color: stallMode === 'batch' ? '#1a7a4a' : '#666' }}
                onClick={() => setStallMode('batch')}
              >
                ⚡ เพิ่มแบบกลุ่ม (เช่น A01-A10)
              </button>
            </div>

            {stallMode === 'single' ? (
              <>
                <label style={styles.label}>หมายเลขล็อค *</label>
                <input style={styles.input} placeholder="เช่น A1, B12"
                  value={stallForm.lock_number}
                  onChange={e => setStallForm({ ...stallForm, lock_number: e.target.value })} />

                <label style={styles.label}>โซน</label>
                <input style={styles.input} placeholder="เช่น A, B"
                  value={stallForm.zone}
                  onChange={e => setStallForm({ ...stallForm, zone: e.target.value })} />

                <label style={styles.label}>ขนาด (ตร.ม.)</label>
                <input style={styles.input} type="number" placeholder="เช่น 9"
                  value={stallForm.size_sqm}
                  onChange={e => setStallForm({ ...stallForm, size_sqm: e.target.value })} />

                <label style={styles.label}>ราคาต่อวัน (บาท) *</label>
                <input style={styles.input} type="number" placeholder="500"
                  value={stallForm.price_per_day}
                  onChange={e => setStallForm({ ...stallForm, price_per_day: e.target.value })} />

                <div style={styles.modalBtnRow}>
                  <button style={styles.saveBtn} onClick={addStall}>✅ เพิ่มล็อค</button>
                  <button style={styles.cancelBtn} onClick={() => setShowAddStall(false)}>ยกเลิก</button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.formRow}>
                  <div style={styles.formCol}>
                    <label style={styles.label}>โซน (Prefix) *</label>
                    <input style={styles.input} placeholder="เช่น A, B"
                      value={batchForm.zone}
                      onChange={e => setBatchForm({ ...batchForm, zone: e.target.value })} />
                  </div>
                  <div style={styles.formCol}>
                    <label style={styles.label}>เริ่มจากเลขที่</label>
                    <input style={styles.input} type="number" placeholder="1"
                      value={batchForm.startNum}
                      onChange={e => setBatchForm({ ...batchForm, startNum: e.target.value })} />
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formCol}>
                    <label style={styles.label}>จำนวนล็อคที่ต้องการสร้าง *</label>
                    <input style={styles.input} type="number" placeholder="เช่น 10"
                      value={batchForm.count}
                      onChange={e => setBatchForm({ ...batchForm, count: e.target.value })} />
                  </div>
                  <div style={{ ...styles.formCol, display:'flex', alignItems:'center', paddingTop:'10px' }}>
                    <label style={{ fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                      <input type="checkbox" checked={batchForm.padZero} onChange={e => setBatchForm({ ...batchForm, padZero: e.target.checked })} />
                      เติมเลข 0 (เช่น A01)
                    </label>
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formCol}>
                    <label style={styles.label}>ขนาดทุกล็อค (ตร.ม.)</label>
                    <input style={styles.input} type="number" placeholder="เช่น 10"
                      value={batchForm.size_sqm}
                      onChange={e => setBatchForm({ ...batchForm, size_sqm: e.target.value })} />
                  </div>
                  <div style={styles.formCol}>
                    <label style={styles.label}>ราคาทุกล็อคต่อวัน (บาท) *</label>
                    <input style={styles.input} type="number" placeholder="เช่น 350"
                      value={batchForm.price_per_day}
                      onChange={e => setBatchForm({ ...batchForm, price_per_day: e.target.value })} />
                  </div>
                </div>

                <div style={{ backgroundColor: '#f0faf4', padding: '10px 14px', borderRadius: '8px', border: '1px solid #c8e6c9', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#666', fontWeight: '700', marginBottom: '4px' }}>ตัวอย่างล็อคที่จะถูกสร้าง:</div>
                  <div style={{ fontSize: '13px', color: '#1a7a4a', fontWeight: 'bold' }}>
                    {(() => {
                      const s = Number(batchForm.startNum) || 1;
                      const c = Number(batchForm.count) || 1;
                      const z = (batchForm.zone || 'A').toUpperCase();
                      const first = batchForm.padZero && s < 10 ? `${z}0${s}` : `${z}${s}`;
                      const lastNum = s + c - 1;
                      const last = batchForm.padZero && lastNum < 10 ? `${z}0${lastNum}` : `${z}${lastNum}`;
                      return c <= 1 ? first : `${first} ถึง ${last} (รวมทั้งหมด ${c} ล็อค)`;
                    })()}
                  </div>
                </div>

                <div style={styles.modalBtnRow}>
                  <button style={styles.saveBtn} onClick={addBatchStalls}>⚡ สร้างทั้งหมด {batchForm.count} ล็อคทันที</button>
                  <button style={styles.cancelBtn} onClick={() => setShowAddStall(false)}>ยกเลิก</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: แก้ไขล็อค ── */}
      {showEditStall && editStall && (
        <div style={styles.overlay} onClick={() => { setShowEditStall(false); setEditStall(null); }}>
          <div style={{ ...styles.modal, maxWidth:'380px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>แก้ไขล็อค {editStall.lock_number}</h3>
              <button style={styles.modalClose} onClick={() => { setShowEditStall(false); setEditStall(null); }}>✕</button>
            </div>

            <label style={styles.label}>หมายเลขล็อค *</label>
            <input style={styles.input}
              value={editStall.lock_number}
              onChange={e => setEditStall({ ...editStall, lock_number: e.target.value })} />

            <label style={styles.label}>โซน</label>
            <input style={styles.input}
              value={editStall.zone || ''}
              onChange={e => setEditStall({ ...editStall, zone: e.target.value })} />

            <label style={styles.label}>ขนาด (ตร.ม.)</label>
            <input style={styles.input} type="number"
              value={editStall.size_sqm || ''}
              onChange={e => setEditStall({ ...editStall, size_sqm: e.target.value })} />

            <label style={styles.label}>ราคาต่อวัน (บาท) *</label>
            <input style={styles.input} type="number"
              value={editStall.price_per_day}
              onChange={e => setEditStall({ ...editStall, price_per_day: e.target.value })} />

            <div style={styles.modalBtnRow}>
              <button style={styles.saveBtn} onClick={updateStall}>💾 บันทึก</button>
              <button style={styles.cancelBtn} onClick={() => { setShowEditStall(false); setEditStall(null); }}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: แจ้งปัญหา ── */}
      {showReportModal && (
        <div style={styles.overlay} onClick={() => setShowReportModal(false)}>
          <div style={{ ...styles.modal, maxWidth:'440px' }} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>🆘 แจ้งปัญหา / ขอความช่วยเหลือ</h3>
              <button style={styles.modalClose} onClick={() => setShowReportModal(false)}>✕</button>
            </div>

            <label style={styles.label}>หัวข้อปัญหา *</label>
            <input style={styles.input}
              placeholder="เช่น: ชำระเงินแล้วแต่ยังไม่ได้รับการยืนยัน"
              value={reportForm.title}
              onChange={e => setReportForm({ ...reportForm, title: e.target.value })} />

            <label style={styles.label}>รายละเอียด</label>
            <textarea style={{ ...styles.input, height:'80px', resize:'vertical' }}
              placeholder="อธิบายปัญหาเพิ่มเติม..."
              value={reportForm.description}
              onChange={e => setReportForm({ ...reportForm, description: e.target.value })} />

            <div style={styles.formRow}>
              <div style={styles.formCol}>
                <label style={styles.label}>หมวดหมู่</label>
                <select style={styles.input}
                  value={reportForm.category}
                  onChange={e => setReportForm({ ...reportForm, category: e.target.value })}>
                  <option value="payment">💳 การชำระเงิน</option>
                  <option value="booking">📋 การจอง</option>
                  <option value="technical">🔧 เทคนิค</option>
                  <option value="other">📌 อื่นๆ</option>
                </select>
              </div>
              <div style={styles.formCol}>
                <label style={styles.label}>ความเร่งด่วน</label>
                <select style={styles.input}
                  value={reportForm.priority}
                  onChange={e => setReportForm({ ...reportForm, priority: e.target.value })}>
                  <option value="low">🟢 ต่ำ</option>
                  <option value="normal">🔵 ปกติ</option>
                  <option value="urgent">🔴 เร่งด่วน</option>
                </select>
              </div>
            </div>

            <div style={styles.modalBtnRow}>
              <button style={styles.saveBtn} onClick={submitReport}>📨 ส่งเรื่อง</button>
              <button style={styles.cancelBtn} onClick={() => setShowReportModal(false)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* 🔍 GLOBAL IMAGE PREVIEW MODAL */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 99999,
            cursor: 'zoom-out'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={e => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="Full Size" 
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

// 🟢 รวม Styles ครบถ้วน 100% ไม่ตกหล่น
const styles = {
  page:    { display:'flex', minHeight:'100vh', fontFamily:"'Sarabun', sans-serif", backgroundColor:'#f4f6f9' },
  main:    { marginLeft:'230px', flex:1, padding:'24px' },
  sidebar: { width:'230px', backgroundColor:'#fff', boxShadow:'2px 0 12px rgba(0,0,0,0.06)', display:'flex', flexDirection:'column', position:'fixed', top:0, left:0, bottom:0, zIndex:100 },
  sidebarTop: { flex:1, overflowY:'auto' },
  sidebarLogo: { display:'flex', alignItems:'center', gap:'10px', padding:'22px 20px', borderBottom:'1px solid #f0f0f0' },
  logoEmoji: { fontSize:'26px' },
  logoName: { fontSize:'16px', fontWeight:'800', color:'#1a7a4a' },
  logoRole: { fontSize:'9px', color:'#aaa', letterSpacing:'2px', fontWeight:'600' },
  sidebarSection: { fontSize:'9px', color:'#bbb', padding:'12px 20px 4px', letterSpacing:'1.5px', fontWeight:'700' },
  createMarketBtn: { margin:'4px 12px 12px', padding:'10px', backgroundColor:'#1a7a4a', color:'#fff', borderRadius:'8px', textAlign:'center', cursor:'pointer', fontSize:'13px', fontWeight:'700' },
  sidebarBottom: { padding:'16px', borderTop:'1px solid #f0f0f0' },
  reportIssueBtn: { padding:'10px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'13px', color:'#e67e22', backgroundColor:'#fff9e6', display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' },
  logoutBtn: { display:'flex', alignItems:'center', gap:'8px', padding:'10px 12px', borderRadius:'8px', cursor:'pointer', fontSize:'13px', color:'#e74c3c', backgroundColor:'#fff5f5' },
  nav: { padding:'12px 0' },
  navItem: { display:'flex', alignItems:'center', gap:'10px', padding:'11px 20px', cursor:'pointer', fontSize:'13px', color:'#666', position:'relative', margin:'2px 8px', borderRadius:'8px', transition:'all 0.15s' },
  navItemActive: { backgroundColor:'#e8f5e9', color:'#1a7a4a', fontWeight:'700' },
  navIcon: { fontSize:'15px', width:'20px', textAlign:'center' },
  navIndicator: { position:'absolute', right:0, top:'50%', transform:'translateY(-50%)', width:'3px', height:'20px', backgroundColor:'#1a7a4a', borderRadius:'2px 0 0 2px' },
  topbar: { display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor:'#fff', padding:'16px 24px', borderRadius:'12px', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', marginBottom:'20px' },
  topbarLeft: { display:'flex', flexDirection:'column', gap:'4px' },
  topbarTitle: { fontSize:'20px', fontWeight:'800', margin:0, color:'#222' },
  homeBtn: { fontSize:'12px', color:'#1a7a4a', textDecoration:'none', fontWeight:'600' },
  userChip: { display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'6px 10px', borderRadius:'10px', transition:'background-color 0.15s' },
  userAvatar: { width:'40px', height:'40px', borderRadius:'50%', backgroundColor:'#1a7a4a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'16px', overflow:'hidden', flexShrink:0 },
  userAvatarImg: { width:'100%', height:'100%', objectFit:'cover' },
  userName: { fontSize:'14px', fontWeight:'700', color:'#222' },
  userRole: { fontSize:'10px', color:'#1a7a4a', fontWeight:'600', letterSpacing:'1px' },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px', marginBottom:'20px' },
  statCard: { borderRadius:'14px', padding:'20px', color:'#fff' },
  statIcon: { fontSize:'24px', marginBottom:'8px' },
  statNum: { fontSize:'28px', fontWeight:'800', marginBottom:'4px' },
  statLabel: { fontSize:'10px', opacity:0.8, letterSpacing:'1px', fontWeight:'600' },
  dashGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' },
  dashCard: { backgroundColor:'#fff', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' },
  dashTitle: { fontSize:'11px', color:'#aaa', letterSpacing:'1px', fontWeight:'700', margin:'0 0 16px' },
  recentItem: { display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:'1px solid #f8f8f8' },
  recentAvatar: { width:'36px', height:'36px', borderRadius:'50%', backgroundColor:'#3498db', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'14px', flexShrink:0 },
  recentName: { fontSize:'13px', fontWeight:'700', color:'#222' },
  recentSub: { fontSize:'11px', color:'#888' },
  occupancyItem: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' },
  occupancyThumb: { width:'36px', height:'36px', backgroundColor:'#e8f5e9', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 },
  occupancyName: { fontSize:'12px', fontWeight:'700', color:'#333', marginBottom:'4px' },
  progressBar: { height:'6px', backgroundColor:'#f0f0f0', borderRadius:'3px' },
  progressFill: { height:'6px', backgroundColor:'#1a7a4a', borderRadius:'3px' },
  card: { backgroundColor:'#fff', borderRadius:'14px', padding:'24px', boxShadow:'0 2px 8px rgba(0,0,0,0.05)' },
  sectionTitle: { fontSize:'18px', fontWeight:'800', margin:'0 0 4px', color:'#222' },
  sectionSub: { fontSize:'11px', color:'#aaa', letterSpacing:'1px', margin:'0 0 20px' },
  emptyBox: { textAlign:'center', padding:'40px' },
  emptyEmoji: { fontSize:'40px', margin:'0 0 8px' },
  emptyText: { fontSize:'13px', color:'#999', textAlign:'center' },
  createBtn: { padding:'10px 20px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'700' },
  quotaBanner: { backgroundColor: '#f0faf4', padding: '16px 20px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1.5px solid #d4edda' },
  quotaCreateBtn: { padding: '9px 16px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  quotaRequestBtn: { padding: '9px 16px', backgroundColor: '#fff', color: '#1a7a4a', border: '1.5px solid #1a7a4a', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700' },
  deleteImgBtn: { display: 'block', width: '100%', padding: '6px', backgroundColor: '#fff0f0', color: '#e74c3c', border: '1px solid #ffd0d0', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '700', textAlign: 'center', marginTop: '4px' },
  marketGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:'16px' },
  marketCard: { border:'1px solid #eee', borderRadius:'12px', overflow:'hidden', backgroundColor:'#fafafa' },
  marketCardImg: { height:'110px', backgroundColor:'#e8f5e9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'44px' },
  marketCardBody: { padding:'14px' },
  marketCardTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' },
  marketCardName: { fontSize:'14px', fontWeight:'800', margin:0, color:'#222', flex:1 },
  marketCardDate: { fontSize:'12px', color:'#888', margin:'0 0 10px' },
  marketCardActions: { display:'flex', gap:'6px' },
  editBtn: { padding:'5px 12px', backgroundColor:'#222', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'11px', fontWeight:'700' },
  deleteBtn: { padding:'5px 12px', backgroundColor:'#fff', color:'#e74c3c', border:'1px solid #e74c3c', borderRadius:'4px', cursor:'pointer', fontSize:'11px' },
  reopenBtn: { padding:'5px 12px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'11px', fontWeight:'700' },
  closeMarketBtn: { padding:'5px 12px', backgroundColor:'#fff', color:'#f39c12', border:'1px solid #f39c12', borderRadius:'4px', cursor:'pointer', fontSize:'11px' },

  zoneBox: { backgroundColor: '#fcfdfc', border: '1.5px solid #eef2ef', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  zoneHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed #e0e8e3' },
  zoneBadge: { backgroundColor: '#1a7a4a', color: '#fff', fontSize: '12px', fontWeight: '800', padding: '3px 12px', borderRadius: '20px' },
  zoneCount: { fontSize: '12px', color: '#666', fontWeight: '600' },
  /* 🟢 สไตล์ส่วนจัดการล็อคที่ถูกกู้คืน */
  stallSection:    { marginBottom:'20px', border:'1px solid #eee', borderRadius:'12px', padding:'16px' },
  stallHeader:     { display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' },
  stallThumb:      { width:'40px', height:'40px', backgroundColor:'#e8f5e9', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', flexShrink:0 },
  stallMarketName: { fontSize:'14px', fontWeight:'800', color:'#222' },
  stallCount:      { fontSize:'11px', color:'#aaa' },
  addStallBtn:     { padding:'7px 14px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'700' },
  manageBtn:       { padding:'7px 14px', backgroundColor:'#f0f0f0', color:'#555', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px' },
  stallGrid:       { display:'flex', flexWrap:'wrap', gap:'8px' },
  stallChipWrap:   { display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' },
  stallChip:       { width:'72px', padding:'10px 6px', backgroundColor:'#e8f5e9', borderRadius:'8px', textAlign:'center', border:'1px solid #c8e6c9', cursor:'pointer' },
  stallChipName:   { fontSize:'13px', fontWeight:'800', color:'#1a7a4a' },
  stallChipPrice:  { fontSize:'10px', color:'#555', marginTop:'2px' },
  stallChipBtns:   { display:'flex', gap:'4px' },
  stallEditBtn:    { padding:'3px 8px', backgroundColor:'#e8f5e9', color:'#1a7a4a', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'11px' },
  stallDeleteBtn:  { padding:'3px 8px', backgroundColor:'#fff0f0', color:'#e74c3c', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'11px' },
  stallAddChip:    { width:'72px', height:'58px', border:'2px dashed #ddd', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', color:'#ccc', cursor:'pointer' },

  bookingRow: { display:'flex', alignItems:'center', gap:'14px', padding:'14px 0', borderBottom:'1px solid #f5f5f5' },
  bookingAvatar: { width:'40px', height:'40px', borderRadius:'50%', backgroundColor:'#3498db', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'16px', flexShrink:0, overflow:'hidden' },
  bookingName: { fontSize:'14px', fontWeight:'700', color:'#222' },
  bookingCompany: { fontSize:'11px', color:'#aaa', marginTop:'2px' },
  bookingAmnt: { fontSize:'14px', fontWeight:'800', color:'#1a7a4a', minWidth:'70px' },
  bookingBtns: { display:'flex', gap:'6px', alignItems:'center' },
  viewShopBtn: { padding:'6px 12px', backgroundColor:'#e8f5e9', color:'#1a7a4a', border:'1px solid #c8e6c9', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'700' },
  slipBtn: { padding:'6px 10px', backgroundColor:'#f0f0f0', color:'#555', textDecoration:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600' },
  approveBtn: { padding:'6px 14px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'700' },
  rejectBtn: { padding:'6px 12px', backgroundColor:'#fff', color:'#e74c3c', border:'1px solid #e74c3c', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'700' },
  paidBadge: { fontSize:'12px', color:'#1a7a4a', fontWeight:'700', backgroundColor:'#e8f5e9', padding:'4px 10px', borderRadius:'20px' },
  select: { width:'100%', padding:'10px 12px', border:'1.5px solid #e8e8e8', borderRadius:'8px', fontSize:'13px', outline:'none', marginBottom:'16px', backgroundColor:'#fafafa' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { padding:'12px 16px', textAlign:'left', fontSize:'10px', color:'#aaa', letterSpacing:'1px', fontWeight:'700', backgroundColor:'#f8f9fa' },
  tr: { borderBottom:'1px solid #f5f5f5' },
  td: { padding:'14px 16px', fontSize:'13px', color:'#333' },
  viewBtn: { padding:'5px 10px', backgroundColor:'#f0f0f0', color:'#555', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'12px', textDecoration:'none' },
  approveSmBtn: { padding:'5px 10px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'4px', cursor:'pointer', fontSize:'14px' },
  vendorRowAvatar: { width:'32px', height:'32px', borderRadius:'50%', backgroundColor:'#3498db', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'700', fontSize:'13px', flexShrink:0 },
  reportGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px' },
  reportSubTitle: { fontSize:'12px', color:'#888', marginBottom:'16px' },
  reportBar: { display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' },
  reportLabel: { fontSize:'11px', color:'#555', width:'160px', fontWeight:'600' },
  barWrap: { flex:1, height:'8px', backgroundColor:'#f0f0f0', borderRadius:'4px' },
  barFill: { height:'8px', backgroundColor:'#1a7a4a', borderRadius:'4px' },
  reportVal: { fontSize:'12px', fontWeight:'700', color:'#222', width:'60px', textAlign:'right' },
  utilBox: { backgroundColor:'#222', borderRadius:'14px', padding:'32px', textAlign:'center', color:'#fff' },
  utilNum: { fontSize:'48px', fontWeight:'800', color:'#1a7a4a' },
  utilLabel: { fontSize:'11px', color:'#888', letterSpacing:'1px', marginBottom:'16px' },
  utilRow: { display:'flex', justifyContent:'space-around', fontSize:'14px' },
  overlay: { position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'16px' },
  modal: { backgroundColor:'#fff', borderRadius:'16px', padding:'28px', width:'100%', maxWidth:'520px', boxShadow:'0 8px 40px rgba(0,0,0,0.2)', maxHeight:'90vh', overflowY:'auto' },
  modalHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px' },
  modalTitle: { fontSize:'17px', fontWeight:'800', margin:0, color:'#222' },
  modalClose: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#aaa' },
  modalBtnRow: { display:'flex', gap:'10px', marginTop:'16px' },
  saveBtn: { flex:1, padding:'12px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'700' },
  cancelBtn: { flex:1, padding:'12px', backgroundColor:'#f0f0f0', color:'#555', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px' },
  personalGrid: { display:'grid', gridTemplateColumns:'160px 1fr', gap:'24px', alignItems:'start', marginBottom:'8px' },
  avatarSection: { display:'flex', flexDirection:'column', alignItems:'center', gap:'12px' },
  avatarImg: { width:'110px', height:'110px', borderRadius:'50%', objectFit:'cover', border:'3px solid #e8f5e9' },
  avatarPlaceholder: { width:'110px', height:'110px', borderRadius:'50%', backgroundColor:'#1a7a4a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'42px', fontWeight:'800' },
  userFields: { display:'flex', flexDirection:'column' },
  sectionDivider: { fontSize:'14px', fontWeight:'800', color:'#222', margin:'20px 0 4px', paddingTop:'16px', borderTop:'1px solid #f0f0f0' },
  successBox: { backgroundColor:'#e8f5e9', color:'#1a7a4a', padding:'10px 14px', borderRadius:'8px', fontSize:'13px', marginBottom:'4px', fontWeight:'600' },
  qrPreviewFrame: { width:'100%', margin:'0 0 10px', borderRadius:'10px', overflow:'hidden', border:'1px solid #eee' },
  qrPreviewImg: { width:'100%', height:'auto', display:'block' },
  label: { display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'4px' },
  input: { width:'100%', padding:'10px 12px', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'13px', marginBottom:'12px', outline:'none', boxSizing:'border-box', backgroundColor:'#fafafa' },
  formRow: { display:'flex', gap:'12px' },
  formCol: { flex:1 },
  locationBtn: { width:'100%', padding:'10px', backgroundColor:'#e8f5e9', color:'#1a7a4a', border:'1.5px solid #c8e6c9', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'600', marginBottom:'12px' },
};

export default OrganizerDashboard;