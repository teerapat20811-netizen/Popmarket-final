
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ChatBox from '../components/ChatBox';
import React, { useState, useEffect } from 'react';

function ShopDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviewMsg, setReviewMsg] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // 🟢 State สำหรับ แก้ไข และ ลบ คอมเมนต์ของผู้รีวิว
  const [editingRevId, setEditingRevId] = useState(null);
  const [editText, setEditText] = useState('');

  // 🟢 State สำหรับ ตอบกลับ, แก้ไขตอบกลับ, และ ลบตอบกลับ ของเจ้าของร้าน
  const [replyingRevId, setReplyingRevId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingReplyRevId, setEditingReplyRevId] = useState(null);
  const [editReplyText, setEditReplyText] = useState('');

  // 💬 CHAT STATE & LIGHTBOX
  const [showChat, setShowChat] = useState(false);
  const [fullImage, setFullImage] = useState(null);

  useEffect(() => {
    fetchShop();
    fetchReviews();
  }, [id]);

  const fetchShop = async () => {
    setLoading(true);
    try {
      const [shopRes, postsRes] = await Promise.all([
        api.get(`/admin/vendors/public/${id}`),
        api.get(`/admin/vendors/public/${id}/posts`)
      ]);
      setShop({
        ...shopRes.data,
        posts: postsRes.data
      });
    } catch (err) {
      console.error("Error fetching shop data:", err);
      navigate('/shops');
    }
    setLoading(false);
  };

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/vendor/${id}`);
      setReviews(res.data.reviews || []);
      setAvgRating(parseFloat(res.data.avg_rating || 0));
    } catch (err) {
      console.error("Error fetching reviews:", err);
    }
  };

  const startChat = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('กรุณาเข้าสู่ระบบก่อนใช้งานแชท');
      navigate('/login');
      return;
    }
    setShowChat(true);
  };

  // ส่งรีวิวใหม่
  const submitReview = async () => {
    if (!newRating) return setReviewMsg('กรุณาให้คะแนนก่อน');
    if (!localStorage.getItem('token')) return setReviewMsg('กรุณาเข้าสู่ระบบก่อนรีวิว');
    setReviewLoading(true);
    try {
      await api.post('/reviews', {
        vendor_profile_id: id,
        rating: newRating,
        comment: newComment,
      });
      setReviewMsg('✅ รีวิวสำเร็จ!');
      setNewComment('');
      fetchReviews();
      fetchShop();
    } catch (err) {
      setReviewMsg(err.response?.data?.message || '❌ เกิดข้อผิดพลาด');
    }
    setReviewLoading(false);
  };

  // แก้ไขคอมเมนต์ (คนรีวิว)
  const handleEditReview = async (revId) => {
    if (!editText.trim()) return;
    try {
      await api.put(`/reviews/${revId}`, { comment: editText });
      setEditingRevId(null);
      fetchReviews();
    } catch (err) { alert('แก้ไขคอมเมนต์ไม่สำเร็จ'); }
  };

  // ลบคอมเมนต์ (คนรีวิว หรือ เจ้าของร้าน)
  const handleDeleteReview = async (revId) => {
    if (!window.confirm('ต้องการลบคอมเมนต์นี้หรือไม่?')) return;
    try {
      await api.delete(`/reviews/${revId}`);
      fetchReviews();
      fetchShop();
    } catch (err) { alert('ลบคอมเมนต์ไม่สำเร็จ'); }
  };

  // ส่งการตอบกลับ (เจ้าของร้าน)
  const handleSendReply = async (revId) => {
    if (!replyText.trim()) return;
    try {
      await api.post(`/reviews/${revId}/reply`, { reply: replyText });
      setReplyingRevId(null);
      setReplyText('');
      fetchReviews();
    } catch (err) { alert('ตอบกลับไม่สำเร็จ'); }
  };

  // แก้ไขการตอบกลับ (เจ้าของร้าน)
  const handleEditReply = async (revId) => {
    if (!editReplyText.trim()) return;
    try {
      await api.put(`/reviews/${revId}/reply`, { reply: editReplyText });
      setEditingReplyRevId(null);
      fetchReviews();
    } catch (err) { alert('แก้ไขข้อความตอบกลับไม่สำเร็จ'); }
  };

  // ลบการตอบกลับ (เจ้าของร้าน)
  const handleDeleteReply = async (revId) => {
    if (!window.confirm('ต้องการลบข้อความตอบกลับนี้หรือไม่?')) return;
    try {
      await api.delete(`/reviews/${revId}/reply`);
      fetchReviews();
    } catch (err) { alert('ลบข้อความตอบกลับไม่สำเร็จ'); }
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'วันนี้';
    if (days === 1) return '1 วันที่แล้ว';
    if (days < 7) return `${days} วันที่แล้ว`;
    if (days < 30) return `${Math.floor(days / 7)} สัปดาห์ที่แล้ว`;
    return `${Math.floor(days / 30)} เดือนที่แล้ว`;
  };

  const getCleanImageUrl = (img) => {
  if (!img) return '';
  let url = img;

  if (typeof url === 'string') {
    try {
      const parsed = JSON.parse(url);
      if (Array.isArray(parsed)) url = parsed[0] || '';
      else if (typeof parsed === 'string') url = parsed;
    } catch (e) {
      url = url.replace(/^[\["']+|[\]"']+$/g, '');
    }
  } else if (Array.isArray(url)) {
    url = url[0] || '';
  }

  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://popmarket-api.onrender.com';
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
};

  const categoryLabel = (cat) => ({
    food: '🍕 Food & Drink',
    handmade: '🎨 Handmade',
    fashion: '👗 Fashion',
    other: '🌿 Other',
  }[cat] || '🏷️ Other');

  if (loading) return (
    <div style={s.loadingPage}>
      <div style={{fontSize:'40px', marginBottom:'12px'}}>⏳</div>
      <p>กำลังโหลด...</p>
    </div>
  );

  if (!shop) return null;

  const displayName = shop.shop_name || shop.name;
  const isTodayOpen = shop.is_open !== 0 && shop.checkin_status !== 'absent';
  const isOwner = user?.id && (Number(user.id) === Number(id) || Number(user.id) === Number(shop?.user_id));

  return (
    <div style={s.page}>
      {/* ===== HERO ===== */}
      <div style={s.hero}>
        <div style={s.heroInner}>
          <Link to="/shops" style={s.backBtn}>← กลับหน้าร้านค้า</Link>

          <div style={s.heroContent}>
            <div style={s.avatarWrap}>
              {shop.logo_url ? (
                <img 
                  src={shop.logo_url} 
                  alt={displayName} 
                  style={{...s.avatarImg, cursor:'pointer'}} 
                  onClick={() => setFullImage(shop.logo_url)}
                  title="คลิกเพื่อดูรูปขนาดเต็ม"
                />
              ) : (
                <div style={s.avatarPlaceholder}>
                  {displayName?.charAt(0).toUpperCase()}
                </div>
              )}
              {shop.paid_bookings > 0 && (
                <div style={{
                  ...s.verifiedBadge, 
                  backgroundColor: !isTodayOpen ? '#e74c3c' : '#27ae60'
                }}>
                  {!isTodayOpen ? '🔴 วันนี้หยุดขาย' : '✅ VERIFIED'}
                </div>
              )}
            </div>

            <div style={s.heroInfo}>
              <h1 style={s.shopName}>{displayName}</h1>
              {shop.category && (
                <span style={s.catBadge}>{categoryLabel(shop.category)}</span>
              )}
              <div style={s.ratingRow}>
                {[1,2,3,4,5].map(n => (
                  <span key={n} style={{
                    color: n <= Math.round(avgRating) ? '#f39c12' : 'rgba(255,255,255,0.3)',
                    fontSize: '18px',
                  }}>★</span>
                ))}
                <span style={s.ratingNum}>{avgRating.toFixed(1)}</span>
                <span style={s.ratingCount}>({reviews.length} รีวิว)</span>
              </div>
              <p style={s.heroDesc}>
                {shop.description || 'ยินดีต้อนรับสู่ร้านค้าของเรา พบกับสินค้าคุณภาพดีได้ในตลาดนัด'}
              </p>
              <div style={s.statsRow}>
                {[
                  { icon:'📋', val: shop.total_bookings, label:'การจองทั้งหมด' },
                  { icon:'✅', val: shop.paid_bookings, label:'เข้าร่วมตลาด' },
                  { icon:'⭐', val: avgRating.toFixed(1), label:'คะแนนเฉลี่ย' },
                ].map((stat, i) => (
                  <div key={i} style={s.statBox}>
                    <div style={s.statVal}>{stat.icon} {stat.val}</div>
                    <div style={s.statLabel}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN ===== */}
      <div style={s.container}>
        <div style={s.mainGrid}>

          {/* ===== LEFT ===== */}
          <div style={s.left}>
            {/* ตลาดที่เคยเข้าร่วม */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>🏪 ตลาดที่เคยเข้าร่วม</h2>
              <p style={s.cardSub}>ประวัติการขายในตลาดนัดต่างๆ</p>

              {(!shop.market_history || shop.market_history.length === 0) ? (
                <div style={s.emptyBox}>
                  <p style={{fontSize:'32px', margin:'0 0 8px'}}>🏪</p>
                  <p style={{color:'#aaa', fontSize:'13px'}}>ยังไม่มีประวัติการเข้าร่วมตลาด</p>
                </div>
              ) : (
                <div style={s.marketList}>
                  {shop.market_history.map((m, i) => (
                    <div key={i} style={s.marketItem}>
                      <div style={s.marketIcon}>🏪</div>
                      <div style={s.marketInfo}>
                        <div style={s.marketName}>{m.name}</div>
                        <div style={s.marketMeta}>
                          📍 {m.province || 'ไม่ระบุ'} &nbsp;•&nbsp;
                          🔒 ล็อค {m.lock_number}{m.zone && ` Zone ${m.zone}`}
                        </div>
                        <div style={s.marketDate}>
                          📅 {m.book_date?.slice(0, 10) || m.start_date}
                        </div>
                      </div>
                      <span style={s.paidBadge}>✅ PAID</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* โพสต์จากร้านค้า */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>📸 โพสต์จากร้านค้า</h2>
              <p style={s.cardSub}>อัปเดตล่าสุดจากร้าน</p>

              {(!shop.posts || shop.posts.length === 0) ? (
                <div style={s.emptyBox}>
                  <p style={{fontSize:'28px', margin:'0 0 8px'}}>📭</p>
                  <p style={{color:'#aaa', fontSize:'13px'}}>ยังไม่มีโพสต์</p>
                </div>
              ) : (
                <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
                  {shop.posts.map(p => (
                    <div key={p.id} style={{padding:'20px', border:'1px solid #eaeaea', borderRadius:'16px', backgroundColor:'#fff', boxShadow:'0 4px 12px rgba(0,0,0,0.03)'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px'}}>
                        <div>
                          <span style={{fontWeight:'700', color:'#212529', fontSize:'15px'}}>{displayName}</span>
                          <div style={{fontSize:'11px', color:'#adb5bd', marginTop:'2px'}}>
                            {new Date(p.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}
                            {' เวลา '}
                            {new Date(p.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                          </div>
                        </div>
                        {p.feeling && (
                          <span style={{backgroundColor:'#e8f5e9', color:'#1a7a4a', padding:'4px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'600', border:'1px solid #c8e6c9'}}>
                            {p.feeling}
                          </span>
                        )}
                      </div>
                      {p.caption && <p style={{fontSize:'14px', color:'#343a40', margin:'0 0 14px', lineHeight:'1.6', whiteSpace:'pre-wrap'}}>{p.caption}</p>}
                      {p.image_url && (
                        <div style={{width: '100%', backgroundColor: '#111', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px', border: '1px solid #e4e6eb', display: 'flex', justifyContent: 'center'}}>
                          <img
                             src={getCleanImageUrl(p.image_url)}
                             alt="post"
                             style={{width: '100%', maxHeight: '450px', objectFit: 'contain', display: 'block', cursor: 'pointer'}}
                             onClick={() => setFullImage(getCleanImageUrl(p.image_url))}
                             title="คลิกเพื่อดูรูปขนาดเต็ม"
                              />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ⭐ รีวิวจากลูกค้า (รองรับแก้ไข, ลบ, ตอบกลับ) */}
            <div style={s.card}>
              <h2 style={s.cardTitle}>⭐ รีวิวจากลูกค้า</h2>
              <p style={s.cardSub}>{reviews.length} รีวิว • เฉลี่ย {avgRating.toFixed(1)} ดาว</p>

              <div style={s.ratingSummary}>
                <div style={s.ratingBig}>{avgRating.toFixed(1)}</div>
                <div style={s.starsLarge}>
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{
                      color: n <= Math.round(avgRating) ? '#f39c12' : '#ddd',
                      fontSize: '24px',
                    }}>★</span>
                  ))}
                </div>
                <div style={{fontSize:'12px', color:'#aaa'}}>จาก {reviews.length} รีวิว</div>
              </div>

              <div style={s.reviewList}>
                {reviews.length === 0 ? (
                  <p style={{color:'#aaa', fontSize:'13px', textAlign:'center', padding:'16px'}}>ยังไม่มีรีวิว</p>
                ) : reviews.map(r => {
                  const isReviewer = user?.id && Number(user.id) === Number(r.reviewer_id);

                  return (
                    <div key={r.id} style={s.reviewItem}>
                      <div style={s.reviewAvatar}>
                        {r.reviewer_name?.charAt(0).toUpperCase()}
                      </div>
                      <div style={s.reviewBody}>
                        <div style={s.reviewTop}>
                          <span style={s.reviewName}>{r.reviewer_name}</span>
                          <div>
                            {[1,2,3,4,5].map(n => (
                              <span key={n} style={{
                                color: n <= r.rating ? '#f39c12' : '#ddd',
                                fontSize: '13px',
                              }}>★</span>
                            ))}
                          </div>
                        </div>

                        {/* กล่องข้อความ หรือ ฟอร์มแก้ไขคอมเมนต์ */}
                        {editingRevId === r.id ? (
                          <div style={{ marginTop: '6px' }}>
                            <input 
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px', boxSizing: 'border-box' }}
                              value={editText}
                              onChange={e => setEditText(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <button style={{ padding: '3px 8px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }} onClick={() => handleEditReview(r.id)}>บันทึก</button>
                              <button style={{ padding: '3px 6px', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', color: '#888' }} onClick={() => setEditingRevId(null)}>ยกเลิก</button>
                            </div>
                          </div>
                        ) : (
                          r.comment && <p style={s.reviewComment}>{r.comment}</p>
                        )}

                        {/* 💬 กล่องแสดงข้อความตอบกลับ พร้อมปุ่มแก้ไข/ลบของเจ้าของร้าน */}
                        {r.reply && (
                          <div style={{ backgroundColor: '#f0fbf0', borderLeft: '3px solid #1a7a4a', padding: '8px 12px', borderRadius: '6px', marginTop: '8px', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: '#1a7a4a' }}>💬 ตอบกลับจาก {r.reply_by || 'เจ้าของร้าน'}:</strong>
                              {isOwner && (
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                          <span style={s.reviewTime}>{timeAgo(r.created_at)}</span>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                            {isOwner && !r.reply && (
                              <span style={{ cursor: 'pointer', color: '#1a7a4a', fontWeight: '700', backgroundColor: '#e8f5e9', padding: '2px 8px', borderRadius: '4px' }} onClick={() => { setReplyingRevId(r.id); setReplyText(''); }}>
                                💬 ตอบกลับ (ในฐานะร้านค้า)
                              </span>
                            )}
                            {isReviewer && (
                              <>
                                <span style={{ cursor: 'pointer', color: '#555', fontWeight: '600' }} onClick={() => { setEditingRevId(r.id); setEditText(r.comment); }}>✏️ แก้ไข</span>
                                <span style={{ cursor: 'pointer', color: '#e74c3c', fontWeight: '600' }} onClick={() => handleDeleteReview(r.id)}>🗑️ ลบ</span>
                              </>
                            )}
                            {isOwner && !isReviewer && (
                              <span style={{ cursor: 'pointer', color: '#e74c3c', fontWeight: '600' }} onClick={() => handleDeleteReview(r.id)}>🗑️ ลบคอมเมนต์</span>
                            )}
                          </div>
                        </div>

                        {/* ฟอร์มตอบกลับของเจ้าของร้าน */}
                        {replyingRevId === r.id && (
                          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #ddd' }}>
                            <input 
                              style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', boxSizing: 'border-box' }}
                              placeholder="พิมพ์ข้อความตอบกลับ..."
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                            />
                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                              <button style={{ padding: '3px 8px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }} onClick={() => handleSendReply(r.id)}>ส่ง</button>
                              <button style={{ padding: '3px 6px', background: 'none', border: 'none', fontSize: '11px', cursor: 'pointer', color: '#888' }} onClick={() => setReplyingRevId(null)}>ยกเลิก</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ฟอร์มเขียนรีวิวใหม่ */}
              {localStorage.getItem('token') && !isOwner && (
                <div style={s.writeReview}>
                  <h4 style={{margin:'0 0 10px', fontSize:'14px', color:'#222'}}>เขียนรีวิว</h4>
                  <div style={s.starRow}>
                    {[1,2,3,4,5].map(n => (
                      <span key={n}
                        style={{fontSize:'28px', cursor:'pointer', color: n <= newRating ? '#f39c12' : '#ddd'}}
                        onClick={() => setNewRating(n)}
                      >★</span>
                    ))}
                  </div>
                  <div style={{display:'flex', gap:'8px'}}>
                    <input
                      style={s.reviewInput}
                      placeholder="เขียนรีวิวของคุณ..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitReview()}
                    />
                    <button style={s.reviewSendBtn} onClick={submitReview} disabled={reviewLoading}>
                      {reviewLoading ? '⏳' : '➤'}
                    </button>
                  </div>
                  {reviewMsg && (
                    <p style={{fontSize:'12px', color: reviewMsg.startsWith('✅') ? '#1a7a4a' : '#e74c3c', marginTop:'6px'}}>
                      {reviewMsg}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ===== RIGHT ===== */}
          <div style={s.right}>
            <div style={s.infoCard}>
              <h3 style={{fontSize:'15px', fontWeight:'800', margin:'0 0 16px', color:'#222'}}>
                ข้อมูลร้านค้า
              </h3>

              <button style={s.chatBtn} onClick={startChat}>
                💬 แชทกับร้านค้านี้
              </button>

              {[
                { k:'ชื่อร้าน', v: displayName },
                { k:'หมวดหมู่', v: categoryLabel(shop.category) },
                { k:'เบอร์โทร', v: shop.phone || 'ไม่ระบุ' },
                { k:'ตลาดที่เข้าร่วม', v: shop.markets_joined || 'ยังไม่มี' },
                { 
                  k:'สถานะ', 
                  v: shop.today_is_open === 0 
                    ? '🔴 วันนี้แจ้งไม่มา' 
                    : (shop.paid_bookings > 0 ? '✅ Verified Vendor' : '🆕 New Vendor') 
                },
              ].map((row, i) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f5f5f5'}}>
                  <span style={{fontSize:'12px', color:'#aaa'}}>{row.k}</span>
                  <span style={{fontSize:'13px', fontWeight:'700', color: row.k === 'สถานะ' && shop.today_is_open === 0 ? '#e74c3c' : '#222', textAlign:'right', maxWidth:'60%'}}>
                    {row.v}
                  </span>
                </div>
              ))}

              <div style={{display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid #f5f5f5'}}>
                <span style={{fontSize:'12px', color:'#aaa'}}>เข้าร่วมตั้งแต่</span>
                <span style={{fontSize:'13px', fontWeight:'700', color:'#222'}}>
                  {new Date(shop.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {showChat && (
        <ChatBox 
          receiverId={Number(id)} 
          receiverName={displayName} 
          onClose={() => setShowChat(false)} 
        />
      )}

      {fullImage && (
        <div style={s.overlay} onClick={() => setFullImage(null)}>
          <div style={{ ...s.modal, maxWidth: '800px', width: '100%', textAlign: 'center', backgroundColor: 'transparent', boxShadow: 'none' }} onClick={e => e.stopPropagation()}>
            <img src={fullImage} alt="Full Size" style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }} />
            <button style={{ ...s.cancelBtn, marginTop: '12px', maxWidth: '120px', marginLeft: 'auto', marginRight: 'auto', display: 'block', backgroundColor: '#222', color: '#fff' }} onClick={() => setFullImage(null)}>
              ปิดรูปภาพ
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

const s = {
  page: { fontFamily:"'Sarabun', sans-serif", backgroundColor:'#f8f9fa', minHeight:'100vh' },
  loadingPage: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', color:'#888' },
  hero: { background:'linear-gradient(135deg, #0d5c36, #1a7a4a, #27ae60)', padding:'32px 0' },
  heroInner: { maxWidth:'1100px', margin:'0 auto', padding:'0 24px' },
  backBtn: { display:'inline-block', fontSize:'13px', color:'rgba(255,255,255,0.8)', textDecoration:'none', backgroundColor:'rgba(255,255,255,0.15)', padding:'5px 14px', borderRadius:'20px', marginBottom:'20px' },
  heroContent: { display:'flex', gap:'24px', alignItems:'flex-start' },
  avatarWrap: { flexShrink:0, position:'relative' },
  avatarImg: { width:'100px', height:'100px', borderRadius:'16px', objectFit:'cover', border:'3px solid rgba(255,255,255,0.3)' },
  avatarPlaceholder: { width:'100px', height:'100px', borderRadius:'16px', backgroundColor:'rgba(255,255,255,0.2)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'40px', fontWeight:'800', border:'3px solid rgba(255,255,255,0.3)' },
  verifiedBadge: { position:'absolute', bottom:'-8px', left:'50%', transform:'translateX(-50%)', fontSize:'9px', color:'#fff', padding:'2px 8px', borderRadius:'10px', fontWeight:'700', whiteSpace:'nowrap' },
  heroInfo: { flex:1 },
  shopName: { fontSize:'28px', fontWeight:'800', color:'#fff', margin:'0 0 8px', textShadow:'0 2px 8px rgba(0,0,0,0.2)' },
  catBadge: { fontSize:'12px', backgroundColor:'rgba(255,255,255,0.2)', color:'#fff', padding:'3px 12px', borderRadius:'20px', fontWeight:'600' },
  ratingRow: { display:'flex', alignItems:'center', gap:'4px', margin:'8px 0' },
  ratingNum: { fontSize:'16px', fontWeight:'800', color:'#f39c12', marginLeft:'4px' },
  ratingCount: { fontSize:'12px', color:'rgba(255,255,255,0.7)' },
  heroDesc: { fontSize:'13px', color:'rgba(255,255,255,0.8)', margin:'8px 0 16px', lineHeight:1.6, maxWidth:'600px' },
  statsRow: { display:'flex', gap:'20px' },
  statBox: {},
  statVal: { fontSize:'16px', fontWeight:'800', color:'#fff' },
  statLabel: { fontSize:'11px', color:'rgba(255,255,255,0.7)', marginTop:'2px' },
  container: { maxWidth:'1100px', margin:'0 auto', padding:'24px' },
  mainGrid: { display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' },
  left: { display:'flex', flexDirection:'column', gap:'16px' },
  right: {},
  card: { backgroundColor:'#fff', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardTitle: { fontSize:'16px', fontWeight:'800', margin:'0 0 4px', color:'#222' },
  cardSub: { fontSize:'13px', color:'#888', margin:'0 0 16px' },
  emptyBox: { textAlign:'center', padding:'32px' },
  marketList: { display:'flex', flexDirection:'column', gap:'10px' },
  marketItem: { display:'flex', alignItems:'center', gap:'12px', padding:'12px', backgroundColor:'#f8f9fa', borderRadius:'10px' },
  marketIcon: { width:'40px', height:'40px', backgroundColor:'#e8f5e9', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 },
  marketInfo: { flex:1 },
  marketName: { fontSize:'14px', fontWeight:'700', color:'#222', marginBottom:'2px' },
  marketMeta: { fontSize:'11px', color:'#888', marginBottom:'2px' },
  marketDate: { fontSize:'11px', color:'#1a7a4a', fontWeight:'600' },
  paidBadge: { fontSize:'11px', backgroundColor:'#e8f5e9', color:'#1a7a4a', padding:'3px 10px', borderRadius:'20px', fontWeight:'700', flexShrink:0 },
  ratingSummary: { display:'flex', alignItems:'center', gap:'16px', padding:'16px', backgroundColor:'#f8f9fa', borderRadius:'10px', marginBottom:'16px' },
  ratingBig: { fontSize:'40px', fontWeight:'800', color:'#f39c12' },
  starsLarge: { display:'flex' },
  reviewList: { display:'flex', flexDirection:'column', gap:'12px', marginBottom:'16px' },
  reviewItem: { display:'flex', gap:'10px', padding:'12px', backgroundColor:'#f8f9fa', borderRadius:'10px' },
  reviewAvatar: { width:'36px', height:'36px', borderRadius:'50%', backgroundColor:'#1a7a4a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:'800', flexShrink:0 },
  reviewBody: { flex:1 },
  reviewTop: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' },
  reviewName: { fontSize:'13px', fontWeight:'700', color:'#222' },
  reviewComment: { fontSize:'13px', color:'#444', margin:'0 0 4px', lineHeight:1.5 },
  reviewTime: { fontSize:'11px', color:'#aaa', margin:0 },
  writeReview: { borderTop:'1px solid #f0f0f0', paddingTop:'16px' },
  starRow: { display:'flex', gap:'4px', marginBottom:'10px' },
  reviewInput: { flex:1, padding:'10px 14px', border:'1.5px solid #e8e8e8', borderRadius:'10px', fontSize:'13px', outline:'none', backgroundColor:'#f8f9fa' },
  reviewSendBtn: { width:'44px', height:'44px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'10px', cursor:'pointer', fontSize:'18px', display:'flex', alignItems:'center', justifyContent:'center' },
  infoCard: { backgroundColor:'#fff', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', position:'sticky', top:'80px' },
  chatBtn: { width: '100%', padding: '10px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginBottom: '16px' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' },
  modal: { backgroundColor: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto' },
  cancelBtn: { padding: '8px 16px', backgroundColor: '#ddd', color: '#333', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }
};

export default ShopDetail;