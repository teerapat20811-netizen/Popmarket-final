import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [market, setMarket] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [bookedStalls, setBookedStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableStalls, setAvailableStalls] = useState([]);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [activeTab, setActiveTab] = useState('stalls');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [nearbyMarkets, setNearbyMarkets] = useState([]);
  const [allMarkets, setAllMarkets] = useState([]);
  const [filterCategory, setFilterCategory] = useState('all');

  // ===== VENDOR MODAL STATE =====
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('');

  // 🟢 State สำหรับ แก้ไข และ ตอบกลับ รีวิวร้านค้า
  const [editingVendorRevId, setEditingVendorRevId] = useState(null);
  const [editVendorText, setEditVendorText] = useState('');
  const [replyingVendorRevId, setReplyingVendorRevId] = useState(null);
  const [replyVendorText, setReplyVendorText] = useState('');
  const [editingReplyRevId, setEditingReplyRevId] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');

  // ===== 🏪 MARKET REVIEWS STATE =====
  const [marketReviews, setMarketReviews] = useState([]);
  const [newMarketRating, setNewMarketRating] = useState(5);
  const [newMarketComment, setNewMarketComment] = useState('');
  const [marketReviewLoading, setMarketReviewLoading] = useState(false);
  const [marketReviewMsg, setMarketReviewMsg] = useState('');

  // 🟢 State สำหรับ แก้ไข รีวิวตลาด
  const [editingMarketRevId, setEditingMarketRevId] = useState(null);
  const [editMarketText, setEditMarketText] = useState('');

  // ===== 🔍 IMAGE MODAL STATE =====
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => { fetchMarket(); }, [id]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
    api.get('/markets').then(res => setAllMarkets(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userLocation || !market?.lat) return;
    const dist = calcDistance(userLocation.lat, userLocation.lng, market.lat, market.lng);
    setDistance(dist);

    const nearby = allMarkets
      .filter(m => m.id !== market.id && m.lat && m.lng)
      .map(m => ({ ...m, distance: calcDistance(userLocation.lat, userLocation.lng, m.lat, m.lng) }))
      .filter(m => m.distance <= 5)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
    setNearbyMarkets(nearby);
  }, [userLocation, market, allMarkets]);

  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
  };

  const fetchBookedVendors = async () => {
    try {
      const resDaily = await api.get(`/payments/market/${id}/vendors`);
      const dailyVendors = resDaily.data || [];

      let subVendors = [];
      try {
        const resSub = await api.get(`/subscriptions/market/${id}`);
        const activeSubs = resSub.data.filter(s => s.status === 'active');
        subVendors = activeSubs.map(s => ({
          ...s,
          id: `sub-${s.id}`,
          book_date: s.start_date && s.end_date 
            ? `${s.start_date.slice(0, 10)} ถึง ${s.end_date.slice(0, 10)} (ล็อคประจำ)` 
            : 'ล็อคประจำ',
          tag: 'VERIFIED',
        }));
      } catch (subErr) {}

      setBookedStalls([...dailyVendors, ...subVendors]);
    } catch (err) { console.log(err); }
  };

  const fetchMarketReviews = async () => {
    try {
      const res = await api.get(`/market_reviews/market/${id}`);
      setMarketReviews(res.data || []);
    } catch (err) { console.log('Error fetching market reviews:', err); }
  };

  useEffect(() => { 
    if (market) {
      fetchBookedVendors(); 
      fetchMarketReviews(); 
    }
  }, [market]);

  const openVendorModal = async (vendor) => {
    setSelectedVendor(vendor);
    setNewRating(5);
    setNewComment('');
    setReviewMsg('');
    setEditingVendorRevId(null);
    setReplyingVendorRevId(null);
    setEditingReplyRevId(null);

    const targetVendorId = vendor.vendor_profile_id || vendor.vendor_id || vendor.id;
    try {
      const res = await api.get(`/reviews/vendor/${targetVendorId}`);
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.avg_rating || 0);
    } catch (err) {
      setReviews([]);
      setAvgRating(0);
    }
  };

  const closeVendorModal = () => {
    setSelectedVendor(null);
    setReviews([]);
    setNewRating(5);
    setNewComment('');
    setReviewMsg('');
    setEditingVendorRevId(null);
    setReplyingVendorRevId(null);
    setEditingReplyRevId(null);
  };

  // 🟢 ส่งรีวิวร้านค้าใหม่
  const submitReview = async () => {
    if (!newRating) return setReviewMsg('กรุณาให้คะแนนก่อน');
    if (!localStorage.getItem('token')) return setReviewMsg('กรุณาเข้าสู่ระบบก่อนรีวิว');
    setReviewLoading(true);

    const targetVendorId = selectedVendor.vendor_profile_id || selectedVendor.vendor_id || selectedVendor.id;
    try {
      await api.post('/reviews', {
        vendor_profile_id: targetVendorId,
        rating: newRating,
        comment: newComment,
      });
      setReviewMsg('✅ รีวิวสำเร็จ!');
      const res = await api.get(`/reviews/vendor/${targetVendorId}`);
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.avg_rating || 0);
      setNewComment('');
    } catch (err) {
      setReviewMsg(err.response?.data?.message || '❌ เกิดข้อผิดพลาด');
    }
    setReviewLoading(false);
  };

  // 🟢 แก้ไขรีวิวร้านค้า (คนเขียนรีวิว)
  const handleEditVendorReview = async (revId) => {
    if (!editVendorText.trim()) return;
    try {
      await api.put(`/reviews/${revId}`, { comment: editVendorText });
      const targetVendorId = selectedVendor.vendor_profile_id || selectedVendor.vendor_id || selectedVendor.id;
      const res = await api.get(`/reviews/vendor/${targetVendorId}`);
      setReviews(res.data.reviews || []);
      setEditingVendorRevId(null);
    } catch (err) { alert('แก้ไขไม่สำเร็จ'); }
  };

  // 🟢 ลบรีวิวร้านค้า (คนเขียนรีวิว หรือ เจ้าของร้าน)
  const handleDeleteVendorReview = async (revId) => {
    if (!window.confirm('ต้องการลบคอมเมนต์นี้ไหม?')) return;
    try {
      await api.delete(`/reviews/${revId}`);
      const targetVendorId = selectedVendor.vendor_profile_id || selectedVendor.vendor_id || selectedVendor.id;
      const res = await api.get(`/reviews/vendor/${targetVendorId}`);
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.avg_rating || 0);
    } catch (err) { alert('ลบไม่สำเร็จ'); }
  };

  // 🟢 ตอบกลับรีวิวร้านค้า (เจ้าของร้าน)
  const handleReplyVendorReview = async (revId) => {
    if (!replyVendorText.trim()) return;
    try {
      await api.post(`/reviews/${revId}/reply`, { reply: replyVendorText });
      const targetVendorId = selectedVendor.vendor_profile_id || selectedVendor.vendor_id || selectedVendor.id;
      const res = await api.get(`/reviews/vendor/${targetVendorId}`);
      setReviews(res.data.reviews || []);
      setReplyingVendorRevId(null);
      setReplyVendorText('');
    } catch (err) { alert('ตอบกลับไม่สำเร็จ'); }
  };

  // 🟢 แก้ไขข้อความตอบกลับ (เจ้าของร้าน)
  const handleEditReply = async (revId) => {
    if (!editReplyText.trim()) return;
    try {
      await api.put(`/reviews/${revId}/reply`, { reply: editReplyText });
      const targetVendorId = selectedVendor.vendor_profile_id || selectedVendor.vendor_id || selectedVendor.id;
      const res = await api.get(`/reviews/vendor/${targetVendorId}`);
      setReviews(res.data.reviews || []);
      setEditingReplyRevId(null);
    } catch (err) { alert('แก้ไขข้อความตอบกลับไม่สำเร็จ'); }
  };

  // 🟢 ลบข้อความตอบกลับ (เจ้าของร้าน)
  const handleDeleteReply = async (revId) => {
    if (!window.confirm('ต้องการลบข้อความตอบกลับนี้ไหม?')) return;
    try {
      await api.delete(`/reviews/${revId}/reply`);
      const targetVendorId = selectedVendor.vendor_profile_id || selectedVendor.vendor_id || selectedVendor.id;
      const res = await api.get(`/reviews/vendor/${targetVendorId}`);
      setReviews(res.data.reviews || []);
    } catch (err) { alert('ลบข้อความตอบกลับไม่สำเร็จ'); }
  };

  // 🟢 ส่งรีวิวตลาดใหม่
  const submitMarketReview = async () => {
    if (!newMarketRating) return setMarketReviewMsg('กรุณาเลือกคะแนนดาวก่อน');
    if (!localStorage.getItem('token')) return setMarketReviewMsg('กรุณาเข้าสู่ระบบก่อนรีวิวตลาด');
    setMarketReviewLoading(true);
    try {
      await api.post('/market_reviews', {
        market_id: id,
        rating: newMarketRating,
        comment: newMarketComment
      });
      setMarketReviewMsg('✅ รีวิวตลาดสำเร็จ!');
      setNewMarketComment('');
      fetchMarketReviews(); 
      fetchMarket(); 
    } catch (err) {
      setMarketReviewMsg(err.response?.data?.message || '❌ เกิดข้อผิดพลาด');
    }
    setMarketReviewLoading(false);
  };

  // 🟢 แก้ไขรีวิวตลาด
  const handleEditMarketReview = async (revId) => {
    if (!editMarketText.trim()) return;
    try {
      await api.put(`/market_reviews/${revId}`, { comment: editMarketText });
      setEditingMarketRevId(null);
      fetchMarketReviews();
    } catch (err) { alert('แก้ไขไม่สำเร็จ'); }
  };

  // 🟢 ลบรีวิวตลาด
  const handleDeleteMarketReview = async (revId) => {
    if (!window.confirm('ต้องการลบคอมเมนต์นี้ไหม?')) return;
    try {
      await api.delete(`/market_reviews/${revId}`);
      fetchMarketReviews();
    } catch (err) { alert('ลบไม่สำเร็จ'); }
  };

  const checkAvailable = async () => {
    if (!selectedDate) return alert('กรุณาเลือกวันที่');
    setCheckingAvail(true);
    try {
      const res = await api.get(`/markets/${id}/stalls/available?date=${selectedDate}`);
      setAvailableStalls(res.data.available_stalls);
    } catch (err) { console.log(err); }
    setCheckingAvail(false);
  };

  const addFavorite = () => {
    if (!localStorage.getItem('token')) { navigate('/login'); return; }
    alert('เพิ่มในรายการโปรดแล้ว ❤️');
  };
  
  const getCheckinStatus = (vendor) => {
    if (vendor.checkin_is_open === null || vendor.checkin_is_open === undefined) return '⚪ ยังไม่เช็คอิน';
    return Number(vendor.checkin_is_open) === 1 ? '🟢 มาวันนี้' : '🔴 ไม่มาวันนี้';
  };

  const fetchMarket = async () => {
    try {
      const res = await api.get(`/markets/${id}`);
      setMarket(res.data);
      setStalls(res.data.stalls || []);
      if (user.role === 'shopper' || !localStorage.getItem('token')) {
        setActiveTab('vendors');
      }
      setLoading(false);
    } catch (err) { navigate('/markets'); }
  };

  const statusColor = (s) => ({
    active: '#1a7a4a', upcoming: '#3498db', pending: '#f39c12', closed: '#999'
  }[s] || '#999');

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'วันนี้';
    if (days === 1) return '1 วันที่แล้ว';
    if (days < 7) return `${days} วันที่แล้ว`;
    if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`;
    return `${Math.floor(days / 30)} เดือนที่แล้ว`;
  };

  // 🟢 Live Countdown Badge คำนวณวันเปิดตลาดจริง
  const renderCountdownBadge = () => {
    if (!market?.start_date || !market?.end_date) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const startStr = market.start_date.slice(0, 10);
    const endStr = market.end_date.slice(0, 10);

    if (todayStr < startStr) {
      const diffTime = new Date(startStr).getTime() - new Date(todayStr).getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return (
        <span style={{ backgroundColor: '#fff9e6', color: '#d35400', border: '1.5px solid #fce5a0', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
          ⏳ อีก {diffDays} วันเปิดตลาด ({startStr})
        </span>
      );
    }
    if (todayStr >= startStr && todayStr <= endStr) {
      return (
        <span style={{ backgroundColor: '#e8f5e9', color: '#1a7a4a', border: '1.5px solid #c8e6c9', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>
          🟢 กำลังเปิดขายตอนนี้ (NOW LIVE)
        </span>
      );
    }
    return (
      <span style={{ backgroundColor: '#f5f5f5', color: '#888', border: '1.5px solid #ddd', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700' }}>
        🔴 สิ้นสุดรอบจัดตลาดแล้ว
      </span>
    );
  };

  if (loading) return (
    <div style={styles.loadingPage}>
      <div style={styles.loadingSpinner}>⏳</div>
      <p>กำลังโหลด...</p>
    </div>
  );
  if (!market) return null;

  // ตรวจสอบสถานะความเป็นเจ้าของร้านค้าที่กำลังเปิด Modal
  const isVendorOwner = Boolean(
    user?.id && selectedVendor && (
      user.id === selectedVendor.vendor_user_id ||
      user.id === selectedVendor.user_id ||
      user.id === selectedVendor.vendor_id
    )
  );

  return (
    <div style={styles.page}>
      {/* ===== HERO ===== */}
      <div style={styles.hero}>
        <div style={styles.heroOverlay}>
          <div style={styles.heroContent}>
            <div style={styles.heroTop}>
              <Link to="/markets" style={styles.heroBack}>← กลับ</Link>
              {renderCountdownBadge()}
            </div>
            <h1 style={styles.heroTitle}>{market.name}</h1>
            <p style={styles.heroDesc}>{market.description}</p>
            <div style={styles.heroInfoRow}>
              <div style={styles.heroInfoBox}>
                <div style={styles.heroInfoLabel}>สถานที่</div>
                <div style={styles.heroInfoVal}>{market.address || market.province || 'ไม่ระบุ'}</div>
              </div>
              <div style={styles.heroInfoBox}>
                <div style={styles.heroInfoLabel}>วันที่จัดงาน</div>
                <div style={styles.heroInfoVal}>
                  {market.start_date?.slice(0, 10)} — {market.end_date?.slice(0, 10)}
                  {market.open_time && <div style={{ fontSize: '12px', opacity: 0.8 }}>{market.open_time} - {market.close_time}</div>}
                </div>
              </div>
              <div style={styles.heroInfoBox}>
                <div style={styles.heroInfoLabel}>จัดโดย</div>
                <div style={styles.heroInfoVal}>{market.organizer_name}</div>
              </div>
              <button style={styles.favBtn} onClick={addFavorite}>❤️ บันทึก</button>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.mainGrid}>
          <div style={styles.left}>
            {/* Tab Menu */}
            <div style={styles.tabMenu}>
              {[
                ...(user.role === 'shopper' || !localStorage.getItem('token') ? [] : [
                  { key: 'stalls', label: '🔒 ล็อคทั้งหมด', count: stalls.length },
                  { key: 'available', label: '✅ เช็คล็อคว่าง' },
                ]),
                { key: 'vendors', label: '🏪 ร้านค้าที่เข้าร่วม', count: bookedStalls.length },
                { key: 'market_reviews', label: '💬 รีวิวตลาด', count: marketReviews.length },
              ].map(t => (
                <button key={t.key}
                  style={{ ...styles.tabBtn, ...(activeTab === t.key ? styles.tabBtnActive : {}) }}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                  {t.count !== undefined && <span style={styles.tabCount}>{t.count}</span>}
                </button>
              ))}
            </div>

            {/* TAB: STALLS */}
            {activeTab === 'stalls' && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>🔒 ล็อคทั้งหมด ({stalls.length} ล็อค)</h2>
                <p style={styles.cardSub}>พื้นที่ขายในตลาดนี้</p>
                {stalls.length === 0 ? (
                  <div style={styles.emptyBox}><p style={styles.emptyEmoji}>🔒</p><p style={styles.emptyText}>ยังไม่มีล็อคในตลาดนี้</p></div>
                ) : (
                  [...new Set(stalls.map(s => s.zone || 'ทั่วไป'))].map(zone => (
                    <div key={zone} style={styles.zoneSection}>
                      <div style={styles.zoneLabel}>Zone {zone}</div>
                      <div style={styles.stallGrid}>
                        {stalls.filter(s => (s.zone || 'ทั่วไป') === zone).map(s => (
                          <div key={s.id} style={styles.stallCard}>
                            <div style={styles.stallCardTop}>
                              <span style={styles.stallLock}>🔒</span>
                              <span style={styles.stallName}>{s.lock_number}</span>
                            </div>
                            {s.size_sqm && <div style={styles.stallSize}>{s.size_sqm} ตร.ม.</div>}
                            <div style={styles.stallPrice}>฿{s.price_per_day}/วัน</div>
                            {user.role === 'vendor' && (
                              <Link to={`/book/${market.id}`} style={styles.stallBookBtn}>จอง</Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: VENDORS */}
            {activeTab === 'vendors' && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>🏪 The Vendor Collective</h2>
                <p style={styles.cardSub}>ร้านค้าที่เข้าร่วมในตลาดนี้ ({bookedStalls.length} ร้าน)</p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {['all', 'food', 'handmade', 'fashion', 'other'].map(cat => (
                    <button key={cat}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                        fontSize: '12px', fontWeight: '700',
                        backgroundColor: filterCategory === cat ? '#1a7a4a' : '#f0f0f0',
                        color: filterCategory === cat ? '#fff' : '#555',
                      }}
                      onClick={() => setFilterCategory(cat)}>
                      {cat === 'all' ? '🏪 ทั้งหมด'
                        : cat === 'food' ? '🍕 อาหาร'
                        : cat === 'handmade' ? '🎨 Handmade'
                        : cat === 'fashion' ? '👗 แฟชั่น'
                        : '🏷️ อื่นๆ'}
                    </button>
                  ))}
                </div>

                {bookedStalls.filter(v => filterCategory === 'all' || v.category === filterCategory).length === 0 ? (
                  <div style={styles.emptyBox}>
                    <p style={styles.emptyEmoji}>🏪</p>
                    <p style={styles.emptyText}>ไม่พบร้านค้าในหมวดหมู่นี้</p>
                  </div>
                ) : (
                  <div style={styles.vendorGrid}>
                    {bookedStalls
                      .filter(v => filterCategory === 'all' || v.category === filterCategory)
                      .map(v => {
                        const checkinLabel = getCheckinStatus(v);
                        return (
                          <div key={v.id} style={styles.vendorCard}>
                            <div style={styles.vendorCardImg}>
                              {v.logo_url ? (
                                <img src={v.logo_url} alt={v.vendor_name} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }} onClick={() => setSelectedImage(v.logo_url)} />
                              ) : (
                                <div style={styles.vendorAvatar}>{v.vendor_name?.charAt(0).toUpperCase()}</div>
                              )}
                              {v.avg_rating && Number(v.avg_rating) > 0 && (
                                <div style={styles.vendorRating}>⭐ {parseFloat(v.avg_rating).toFixed(1)}</div>
                              )}
                            </div>
                            <div style={styles.vendorCardBody}>
                              <h3 style={styles.vendorName}>{v.shop_name || v.vendor_name}</h3>
                              <p style={styles.vendorLock}>ล็อค {v.lock_number}{v.zone && ` • Zone ${v.zone}`}</p>
                              <p style={styles.vendorDate}>📅 {v.book_date?.slice(0, 10)}</p>
                              <div style={{
                                fontSize: '11px', fontWeight: '700', marginTop: '4px', marginBottom: '8px',
                                color: checkinLabel === '🟢 มาวันนี้' ? '#1a7a4a' : checkinLabel === '🔴 ไม่มาวันนี้' ? '#e74c3c' : '#aaa'
                              }}>
                                {checkinLabel}
                              </div>
                              <button style={styles.vendorBtn} onClick={() => openVendorModal(v)}>ดูร้านค้า</button>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                )}
              </div>
            )}

            {/* TAB: AVAILABLE */}
            {activeTab === 'available' && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>✅ เช็คล็อคว่าง</h2>
                <p style={styles.cardSub}>เลือกวันที่เพื่อดูล็อคว่าง</p>
                <div style={styles.availRow}>
                  <input type="date" style={styles.dateInput}
                    value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    min={market.start_date?.slice(0, 10)} max={market.end_date?.slice(0, 10)} />
                  <button style={styles.checkBtn} onClick={checkAvailable}>
                    {checkingAvail ? '⏳ กำลังเช็ค...' : '🔍 เช็คล็อคว่าง'}
                  </button>
                </div>
                {availableStalls.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <p style={styles.availResult}>✅ ว่าง {availableStalls.length} ล็อค วันที่ {selectedDate}</p>
                    <div style={styles.availGrid}>
                      {availableStalls.map(s => (
                        <div key={s.id} style={styles.availChip}>
                          <div style={styles.availLock}>{s.lock_number}</div>
                          <div style={styles.availPrice}>฿{s.price_per_day}</div>
                          {s.zone && <div style={styles.availZone}>Zone {s.zone}</div>}
                          {user.role === 'vendor' && <Link to={`/book/${market.id}`} style={styles.availBookBtn}>จอง</Link>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: MARKET REVIEWS (รองรับแก้ไข และลบ) */}
            {activeTab === 'market_reviews' && (
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>💬 รีวิวและคะแนนความนิยมของตลาด</h2>
                <p style={styles.cardSub}>แชร์ประสบการณ์การเยือนตลาดนัดป๊อปอัพแห่งนี้</p>

                <div style={{ ...styles.reviewList, maxHeight: 'none', overflowY: 'visible' }}>
                  {marketReviews.length === 0 ? (
                    <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '32px' }}>ยังไม่มีรีวิวสำหรับตลาดนี้ มารีวิวคนแรกกันเลย!</p>
                  ) : (
                    marketReviews.map(r => (
                      <div key={r.id} style={styles.reviewItem}>
                        <div style={styles.reviewAvatar}>{r.reviewer_name?.charAt(0).toUpperCase()}</div>
                        <div style={styles.reviewContent}>
                          <div style={styles.reviewTop}>
                            <span style={styles.reviewName}>{r.reviewer_name}</span>
                            <div style={styles.reviewStars}>
                              {'★'.repeat(r.rating).padEnd(5, '☆').split('').map((s, i) => (
                                <span key={i} style={{ color: s === '★' ? '#f39c12' : '#ddd', fontSize: '13px' }}>{s}</span>
                              ))}
                            </div>
                          </div>

                          {editingMarketRevId === r.id ? (
                            <div style={{ marginTop: '6px' }}>
                              <input 
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box' }}
                                value={editMarketText}
                                onChange={e => setEditMarketText(e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                <button style={{ padding: '4px 10px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }} onClick={() => handleEditMarketReview(r.id)}>บันทึก</button>
                                <button style={{ padding: '4px 8px', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', color: '#888' }} onClick={() => setEditingMarketRevId(null)}>ยกเลิก</button>
                              </div>
                            </div>
                          ) : (
                            r.comment && <p style={styles.reviewComment}>{r.comment}</p>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                            <span style={styles.reviewTime}>{timeAgo(r.created_at)}</span>
                            {user.id === r.reviewer_id && (
                              <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                                <span style={{ cursor: 'pointer', color: '#1a7a4a', fontWeight: '600' }} onClick={() => { setEditingMarketRevId(r.id); setEditMarketText(r.comment); }}>✏️ แก้ไข</span>
                                <span style={{ cursor: 'pointer', color: '#e74c3c', fontWeight: '600' }} onClick={() => handleDeleteMarketReview(r.id)}>🗑️ ลบ</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={styles.writeReview}>
                  <p style={styles.writeReviewLabel}>ให้คะแนนและคำนิยมตลาดนี้:</p>
                  <div style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n}
                        style={{ fontSize: '28px', cursor: 'pointer', color: n <= newMarketRating ? '#f39c12' : '#ddd' }}
                        onClick={() => setNewMarketRating(n)}
                      >★</span>
                    ))}
                  </div>
                  <div style={styles.reviewInputRow}>
                    <input
                      style={styles.reviewInput}
                      placeholder="เขียนรีวิวให้ตลาดแห่งนี้..."
                      value={newMarketComment}
                      onChange={e => setNewMarketComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitMarketReview()}
                    />
                    <button style={styles.reviewSendBtn} onClick={submitMarketReview} disabled={marketReviewLoading}>
                      {marketReviewLoading ? '⏳' : '➤'}
                    </button>
                  </div>
                  {marketReviewMsg && (
                    <p style={{ fontSize: '12px', color: marketReviewMsg.startsWith('✅') ? '#1a7a4a' : '#e74c3c', marginTop: '6px' }}>
                      {marketReviewMsg}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={styles.right}>
            <div style={styles.infoCard}>
              <h3 style={styles.infoCardTitle}>ข้อมูลตลาด</h3>
              <div style={styles.infoStats}>
                <div style={styles.infoStat}><div style={styles.infoStatNum}>{stalls.length}</div><div style={styles.infoStatLabel}>ล็อคทั้งหมด</div></div>
                <div style={styles.infoStat}><div style={styles.infoStatNum}>{bookedStalls.length}</div><div style={styles.infoStatLabel}>ร้านค้า</div></div>
                <div style={styles.infoStat}>
                  <div style={styles.infoStatNum}>{stalls.length > 0 ? `${Math.round((bookedStalls.length / stalls.length) * 100)}%` : '0%'}</div>
                  <div style={styles.infoStatLabel}>Occupancy</div>
                </div>
              </div>
              {[
                { k: 'จัดโดย', v: market.organizer_name },
                { k: 'ดาวเฉลี่ยตลาด', v: market.avg_rating && market.avg_rating > 0 ? `⭐ ${parseFloat(market.avg_rating).toFixed(1)} / 5.0` : 'ยังไม่มีรีวิว' },
                { k: 'วันเริ่ม', v: market.start_date?.slice(0, 10) || '-' },
                { k: 'วันสิ้นสุด', v: market.end_date?.slice(0, 10) || '-' },
                { k: 'เวลา', v: market.open_time ? `${market.open_time} - ${market.close_time}` : '-' },
                { k: 'จังหวัด', v: market.province || '-' },
                { k: 'สถานะ', v: market.status?.toUpperCase() },
              ].map((row, i) => (
                <div key={i} style={styles.infoRow}>
                  <span style={styles.infoKey}>{row.k}</span>
                  <span style={{ ...styles.infoVal, color: row.k === 'สถานะ' ? statusColor(market.status) : row.k === 'ดาวเฉลี่ยตลาด' ? '#f39c12' : '#222' }}>{row.v}</span>
                </div>
              ))}
              {user.role === 'vendor' && <Link to={`/book/${market.id}`} style={styles.bigBookBtn}>🔖 จองพื้นที่ขาย</Link>}
              {!localStorage.getItem('token') && <Link to="/login" style={styles.bigLoginBtn}>🔐 เข้าสู่ระบบเพื่อจอง</Link>}
            </div>

            {market.lat && market.lng && (
              <div style={styles.mapCard}>
                <h3 style={styles.infoCardTitle}>📍 ที่ตั้งตลาด</h3>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  {distance !== null && <span style={styles.distanceBadge}>📍 {distance} km จากคุณ</span>}
                  <span style={{ ...styles.distanceBadge, backgroundColor: market.has_parking ? '#e8f5e9' : '#fff0f0', color: market.has_parking ? '#1a7a4a' : '#e74c3c' }}>
                    🚗 {market.has_parking ? 'มีที่จอดรถ' : 'ไม่มีที่จอดรถ'}
                  </span>
                  <span style={{ ...styles.distanceBadge, backgroundColor: market.has_restroom ? '#e8f5e9' : '#fff0f0', color: market.has_restroom ? '#1a7a4a' : '#e74c3c' }}>
                    🚻 {market.has_restroom ? 'มีห้องน้ำ' : 'ไม่มีห้องน้ำ'}
                  </span>
                </div>

                <div style={{ height: '220px', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px' }}>
                  <MapContainer center={[Number(market.lat), Number(market.lng)]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
                    <Marker position={[Number(market.lat), Number(market.lng)]}>
                      <Popup>{market.name}</Popup>
                    </Marker>
                  </MapContainer>
                </div>
                <a href={`https://www.google.com/maps?q=${market.lat},${market.lng}`} target="_blank" rel="noreferrer" style={styles.gmapLink}>
                  🗺️ เปิดใน Google Maps
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== VENDOR MODAL (รองรับแก้ไข, ลบ, ตอบกลับ) ===== */}
      {selectedVendor && (
        <div style={styles.overlay} onClick={closeVendorModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHero}>
              {selectedVendor.logo_url ? (
                <img src={selectedVendor.logo_url} alt="shop" style={{ ...styles.modalHeroImg, cursor: 'pointer' }} onClick={() => setSelectedImage(selectedVendor.logo_url)} />
              ) : (
                <div style={styles.modalHeroAvatar}>{selectedVendor.vendor_name?.charAt(0).toUpperCase()}</div>
              )}
              <div style={styles.modalHeroInfo}>
                <h2 style={styles.modalShopName}>{selectedVendor.shop_name || selectedVendor.vendor_name}</h2>
                <p style={styles.modalShopMeta}>ล็อค {selectedVendor.lock_number}{selectedVendor.zone && ` • Zone ${selectedVendor.zone}`}</p>
                <div style={styles.modalRatingRow}>
                  {'★'.repeat(Math.round(avgRating)).padEnd(5, '☆').split('').map((s, i) => (
                    <span key={i} style={{ color: s === '★' ? '#f39c12' : '#ddd', fontSize: '18px' }}>{s}</span>
                  ))}
                  <span style={styles.modalRatingNum}>{avgRating}</span>
                  <span style={styles.modalRatingCount}>({reviews.length} รีวิว)</span>
                </div>
              </div>
              <button style={styles.modalCloseBtn} onClick={closeVendorModal}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <Link to={`/shops/${selectedVendor?.vendor_user_id || selectedVendor?.user_id || selectedVendor?.id}`} style={styles.chatStartBtn}>
                🏪 ไปที่หน้าร้านค้านี้
              </Link>

              <h3 style={styles.modalSectionTitle}>รีวิวจากลูกค้า <span style={styles.revCount}>{reviews.length} REV</span></h3>

              <div style={styles.reviewList}>
                {reviews.length === 0 ? (
                  <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', padding: '16px' }}>ยังไม่มีรีวิว</p>
                ) : (
                  reviews.map(r => {
                    const isReviewer = user?.id && user.id === r.reviewer_id;

                    return (
                      <div key={r.id} style={styles.reviewItem}>
                        <div style={styles.reviewAvatar}>{r.reviewer_name?.charAt(0).toUpperCase()}</div>
                        <div style={styles.reviewContent}>
                          <div style={styles.reviewTop}>
                            <span style={styles.reviewName}>{r.reviewer_name}</span>
                            <div style={styles.reviewStars}>
                              {'★'.repeat(r.rating).padEnd(5, '☆').split('').map((s, i) => (
                                <span key={i} style={{ color: s === '★' ? '#f39c12' : '#ddd', fontSize: '14px' }}>{s}</span>
                              ))}
                            </div>
                          </div>

                          {/* ข้อความคอมเมนต์ หรือ โหมดแก้ไขคอมเมนต์ */}
                          {editingVendorRevId === r.id ? (
                            <div style={{ marginTop: '6px' }}>
                              <input 
                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box' }}
                                value={editVendorText}
                                onChange={e => setEditVendorText(e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                <button style={{ padding: '4px 10px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }} onClick={() => handleEditVendorReview(r.id)}>บันทึก</button>
                                <button style={{ padding: '4px 8px', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', color: '#888' }} onClick={() => setEditingVendorRevId(null)}>ยกเลิก</button>
                              </div>
                            </div>
                          ) : (
                            r.comment && <p style={styles.reviewComment}>{r.comment}</p>
                          )}

                          {/* กล่องแสดงข้อความตอบกลับ พร้อมปุ่มแก้ไข/ลบตอบกลับของเจ้าของร้าน */}
                          {r.reply && (
                            <div style={{ backgroundColor: '#f0fbf0', borderLeft: '3px solid #1a7a4a', padding: '8px 12px', borderRadius: '6px', marginTop: '6px', fontSize: '12px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: '#1a7a4a' }}>💬 ตอบกลับจาก {r.reply_by || 'เจ้าของร้าน'}:</strong>
                                {isVendorOwner && (
                                  <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                                    <span style={{ cursor: 'pointer', color: '#1a7a4a', fontWeight: '700' }} onClick={() => { setEditingReplyRevId(r.id); setEditReplyText(r.reply); }}>✏️ แก้ไข</span>
                                    <span style={{ cursor: 'pointer', color: '#e74c3c', fontWeight: '700' }} onClick={() => handleDeleteReply(r.id)}>🗑️ ลบ</span>
                                  </div>
                                )}
                              </div>

                              {editingReplyRevId === r.id ? (
                                <div style={{ marginTop: '6px' }}>
                                  <input 
                                    style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', boxSizing: 'border-box' }}
                                    value={editReplyText}
                                    onChange={e => setEditReplyText(e.target.value)}
                                  />
                                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                    <button style={{ padding: '3px 8px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }} onClick={() => handleEditReply(r.id)}>บันทึก</button>
                                    <button style={{ padding: '3px 6px', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', color: '#888' }} onClick={() => setEditingReplyRevId(null)}>ยกเลิก</button>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ color: '#333', marginTop: '4px' }}>{r.reply}</div>
                              )}
                            </div>
                          )}

                          {/* แถบ Action Buttons ด้านล่าง */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                            <span style={styles.reviewTime}>{timeAgo(r.created_at)}</span>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>

                              {/* ปุ่มตอบกลับ: แสดงเฉพาะเจ้าของร้าน และยังไม่เคยตอบกลับ */}
                              {isVendorOwner && !r.reply && (
                                <span 
                                  style={{ cursor: 'pointer', color: '#1a7a4a', fontWeight: '700', backgroundColor: '#e8f5e9', padding: '2px 8px', borderRadius: '4px' }} 
                                  onClick={() => { setReplyingVendorRevId(r.id); setReplyVendorText(''); }}
                                >
                                  💬 ตอบกลับ (ในฐานะร้านค้า)
                                </span>
                              )}

                              {/* ปุ่มแก้ไข / ลบ สำหรับคนเขียนรีวิว */}
                              {isReviewer && (
                                <>
                                  <span style={{ cursor: 'pointer', color: '#555', fontWeight: '600' }} onClick={() => { setEditingVendorRevId(r.id); setEditVendorText(r.comment); }}>✏️ แก้ไข</span>
                                  <span style={{ cursor: 'pointer', color: '#e74c3c', fontWeight: '600' }} onClick={() => handleDeleteVendorReview(r.id)}>🗑️ ลบ</span>
                                </>
                              )}

                              {/* เจ้าของร้านสามารถช่วยลบคอมเมนต์ได้ถ้าไม่ใช่คนเขียนเอง */}
                              {isVendorOwner && !isReviewer && (
                                <span style={{ cursor: 'pointer', color: '#e74c3c', fontWeight: '600' }} onClick={() => handleDeleteVendorReview(r.id)}>🗑️ ลบคอมเมนต์</span>
                              )}
                            </div>
                          </div>

                          {/* ฟอร์มพิมพ์ข้อความตอบกลับ */}
                          {replyingVendorRevId === r.id && (
                            <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #ddd' }}>
                              <input 
                                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', boxSizing: 'border-box' }}
                                placeholder="พิมพ์ข้อความตอบกลับ..."
                                value={replyVendorText}
                                onChange={e => setReplyVendorText(e.target.value)}
                              />
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                <button style={{ padding: '3px 8px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }} onClick={() => handleReplyVendorReview(r.id)}>ส่ง</button>
                                <button style={{ padding: '3px 6px', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', color: '#888' }} onClick={() => setReplyingVendorRevId(null)}>ยกเลิก</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ฟอร์มเขียนรีวิวร้านค้าใหม่ (เฉพาะลูกค้าทั่วไปที่ล็อกอินแล้ว และไม่ใช่เจ้าของร้าน) */}
              {localStorage.getItem('token') && !isVendorOwner && (
                <div style={styles.writeReview}>
                  <p style={styles.writeReviewLabel}>ให้คะแนนร้านค้านี้:</p>
                  <div style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map(n => (
                      <span key={n}
                        style={{ fontSize: '28px', cursor: 'pointer', color: n <= newRating ? '#f39c12' : '#ddd' }}
                        onClick={() => setNewRating(n)}
                      >★</span>
                    ))}
                  </div>
                  <div style={styles.reviewInputRow}>
                    <input
                      style={styles.reviewInput}
                      placeholder="เขียนรีวิวร้านค้านี้..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitReview()}
                    />
                    <button style={styles.reviewSendBtn} onClick={submitReview} disabled={reviewLoading}>
                      {reviewLoading ? '⏳' : '➤'}
                    </button>
                  </div>
                  {reviewMsg && (
                    <p style={{ fontSize: '12px', color: reviewMsg.startsWith('✅') ? '#1a7a4a' : '#e74c3c', marginTop: '6px' }}>
                      {reviewMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔍 Global Lightbox Image Preview */}
      {selectedImage && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999 }} onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full Size" style={{ maxWidth: '90%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { fontFamily: "'Sarabun', sans-serif", backgroundColor: '#f8f9fa', minHeight: '100vh' },
  loadingPage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888' },
  loadingSpinner: { fontSize: '40px', marginBottom: '12px' },
  hero: { minHeight: '320px', background: 'linear-gradient(135deg, #0d5c36, #1a7a4a, #27ae60)', position: 'relative' },
  heroOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'flex-end' },
  heroContent: { padding: '32px', maxWidth: '1100px', width: '100%', margin: '0 auto' },
  heroTop: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  heroBack: { fontSize: '13px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', backgroundColor: 'rgba(255,255,255,0.15)', padding: '5px 12px', borderRadius: '20px' },
  heroTitle: { fontSize: '32px', fontWeight: '800', color: '#fff', margin: '0 0 8px', textShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  heroDesc: { fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: '0 0 20px', maxWidth: '600px' },
  heroInfoRow: { display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' },
  heroInfoBox: {},
  heroInfoLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' },
  heroInfoVal: { fontSize: '13px', color: '#fff', fontWeight: '600' },
  favBtn: { padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', marginLeft: 'auto' },
  container: { maxWidth: '1100px', margin: '0 auto', padding: '24px' },
  mainGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' },
  left: { display: 'flex', flexDirection: 'column', gap: '16px' },
  right: { display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '24px', alignSelf: 'flex-start' },
  tabMenu: { display: 'flex', gap: '8px', backgroundColor: '#fff', padding: '8px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  tabBtn: { flex: 1, padding: '10px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#666', backgroundColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '500' },
  tabBtnActive: { backgroundColor: '#1a7a4a', color: '#fff', fontWeight: '700' },
  tabCount: { backgroundColor: 'rgba(255,255,255,0.3)', padding: '1px 6px', borderRadius: '10px', fontSize: '11px', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize: '16px', fontWeight: '800', margin: '0 0 4px', color: '#222' },
  cardSub: { fontSize: '13px', color: '#888', margin: '0 0 16px' },
  zoneSection: { marginBottom: '20px' },
  zoneLabel: { fontSize: '11px', fontWeight: '800', color: '#1a7a4a', letterSpacing: '1px', marginBottom: '10px', padding: '4px 10px', backgroundColor: '#e8f5e9', borderRadius: '20px', display: 'inline-block' },
  stallGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' },
  stallCard: { padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '1px solid #eee', textAlign: 'center' },
  stallCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '4px' },
  stallLock: { fontSize: '14px' },
  stallName: { fontSize: '14px', fontWeight: '800', color: '#222' },
  stallSize: { fontSize: '11px', color: '#aaa', marginBottom: '4px' },
  stallPrice: { fontSize: '13px', fontWeight: '700', color: '#1a7a4a', marginBottom: '8px' },
  stallBookBtn: { display: 'block', padding: '5px', backgroundColor: '#1a7a4a', color: '#fff', textDecoration: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700' },
  vendorGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '14px' },
  vendorCard: { border: '1px solid #eee', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#fafafa' },
  vendorCardImg: { height: '90px', backgroundColor: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  vendorAvatar: { width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '800' },
  vendorRating: { position: 'absolute', top: '8px', right: '8px', fontSize: '11px', backgroundColor: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: '10px', fontWeight: '700', color: '#f39c12' },
  vendorCardBody: { padding: '10px' },
  vendorName: { fontSize: '13px', fontWeight: '800', margin: '0 0 3px', color: '#222' },
  vendorLock: { fontSize: '11px', color: '#888', margin: '0 0 2px' },
  vendorDate: { fontSize: '11px', color: '#888', margin: '0 0 8px' },
  vendorBtn: { display: 'block', width: '100%', padding: '5px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: '700', textAlign: 'center', cursor: 'pointer' },
  availRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
  dateInput: { flex: 1, padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '13px', outline: 'none' },
  checkBtn: { padding: '10px 20px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap' },
  availResult: { fontSize: '14px', fontWeight: '700', color: '#1a7a4a', marginBottom: '12px' },
  availGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' },
  availChip: { padding: '10px', backgroundColor: '#e8f5e9', borderRadius: '8px', textAlign: 'center', border: '1px solid #c8e6c9' },
  availLock: { fontSize: '14px', fontWeight: '800', color: '#1a7a4a' },
  availPrice: { fontSize: '11px', color: '#555', margin: '2px 0' },
  availZone: { fontSize: '10px', color: '#aaa' },
  availBookBtn: { display: 'block', marginTop: '6px', padding: '4px', backgroundColor: '#1a7a4a', color: '#fff', textDecoration: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '700' },
  emptyBox: { textAlign: 'center', padding: '32px' },
  emptyEmoji: { fontSize: '36px', margin: '0 0 8px' },
  emptyText: { fontSize: '14px', color: '#aaa', margin: '0 0 4px' },
  infoCard: { backgroundColor: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  infoCardTitle: { fontSize: '15px', fontWeight: '800', margin: '0 0 16px', color: '#222' },
  infoStats: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '10px' },
  infoStat: { textAlign: 'center' },
  infoStatNum: { fontSize: '20px', fontWeight: '800', color: '#1a7a4a' },
  infoStatLabel: { fontSize: '10px', color: '#aaa', marginTop: '2px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f5' },
  infoKey: { fontSize: '12px', color: '#aaa' },
  infoVal: { fontSize: '13px', fontWeight: '700' },
  bigBookBtn: { display: 'block', marginTop: '16px', padding: '13px', backgroundColor: '#1a7a4a', color: '#fff', textDecoration: 'none', borderRadius: '10px', textAlign: 'center', fontSize: '14px', fontWeight: '800' },
  bigLoginBtn: { display: 'block', marginTop: '16px', padding: '13px', backgroundColor: '#f0f0f0', color: '#555', textDecoration: 'none', borderRadius: '10px', textAlign: 'center', fontSize: '14px', fontWeight: '700' },
  mapCard: { backgroundColor: '#fff', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  distanceBadge: { fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', backgroundColor: '#e8f5e9', color: '#1a7a4a' },
  gmapLink: { fontSize: '12px', color: '#1a7a4a', fontWeight: '600', textDecoration: 'none', display: 'block', textAlign: 'center', padding: '8px', backgroundColor: '#e8f5e9', borderRadius: '8px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { backgroundColor: '#fff', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalHero: { display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #eee', position: 'relative' },
  modalHeroImg: { width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 },
  modalHeroAvatar: { width: '80px', height: '80px', borderRadius: '12px', backgroundColor: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: '800', flexShrink: 0 },
  modalHeroInfo: { flex: 1 },
  modalShopName: { fontSize: '18px', fontWeight: '800', margin: '0 0 4px', color: '#222' },
  modalShopMeta: { fontSize: '12px', color: '#888', margin: '0 0 8px' },
  modalRatingRow: { display: 'flex', alignItems: 'center', gap: '4px' },
  modalRatingNum: { fontSize: '14px', fontWeight: '800', color: '#f39c12', marginLeft: '4px' },
  modalRatingCount: { fontSize: '12px', color: '#aaa' },
  modalCloseBtn: { position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#aaa', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1, overflowY: 'auto', padding: '20px' },
  modalSectionTitle: { fontSize: '15px', fontWeight: '800', margin: '0 0 16px', color: '#222', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  revCount: { fontSize: '11px', color: '#aaa', fontWeight: '400' },
  reviewList: { display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '280px', overflowY: 'auto' },
  reviewItem: { display: 'flex', gap: '10px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '10px' },
  reviewAvatar: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#1a7a4a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '800', flexShrink: 0 },
  reviewContent: { flex: 1 },
  reviewTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  reviewName: { fontSize: '13px', fontWeight: '700', color: '#222' },
  reviewStars: { display: 'flex' },
  reviewComment: { fontSize: '13px', color: '#444', margin: '0 0 4px', lineHeight: 1.5 },
  reviewTime: { fontSize: '11px', color: '#aaa', margin: 0 },
  writeReview: { borderTop: '1px solid #f0f0f0', paddingTop: '16px' },
  writeReviewLabel: { fontSize: '12px', color: '#888', margin: '0 0 6px' },
  starRow: { display: 'flex', gap: '4px', marginBottom: '12px' },
  reviewInputRow: { display: 'flex', gap: '8px' },
  reviewInput: { flex: 1, padding: '10px 14px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '13px', outline: 'none', backgroundColor: '#f8f9fa' },
  reviewSendBtn: { width: '44px', height: '44px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  chatStartBtn: { display: 'block', width: '100%', padding: '12px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', textAlign: 'center', textDecoration: 'none', cursor: 'pointer', marginBottom: '16px', boxSizing: 'border-box' }
};

export default MarketDetail;