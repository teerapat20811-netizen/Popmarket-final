import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ImageUpload from '../components/ImageUpload';

function BookStall() {
  const { marketId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [market, setMarket] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [marketSchedule, setMarketSchedule] = useState([]); 

  // 🟢 ฟังก์ชันแปลงวันที่เป็น YYYY-MM-DD
  const formatLocalDate = (dateInput) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput.toString().split('T')[0];
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 🟢 ดึงวันที่ปัจจุบันตามเวลาจริง
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();
  const currentMonthKey = todayStr.slice(0, 7); // เช่น '2026-10'

  // 🟢 กรองเฉพาะวันที่ยังไม่หมดอายุ (ตั้งแต่วันนี้เป็นต้นไปเท่านั้น)
  const upcomingSchedule = marketSchedule.filter(sch => {
    const dStr = formatLocalDate(sch.market_date);
    return dStr >= todayStr;
  });

  // 🟢 รวมกลุ่มเดือนเฉพาะเดือนปัจจุบันและเดือนข้างหน้า ที่ยังมีวันเปิดขายเหลืออยู่
  const groupedMonths = upcomingSchedule.reduce((acc, sch) => {
    const rawDate = formatLocalDate(sch.market_date);
    const monthKey = rawDate.slice(0, 7); 
    if (monthKey && monthKey >= currentMonthKey) {
      if (!acc[monthKey]) acc[monthKey] = [];
      acc[monthKey].push({ ...sch, formatted_date: rawDate });
    }
    return acc;
  }, {});

  // 🟢 วันที่ที่กำลังเปิดดูผังตลาดอยู่
  const [activeDate, setActiveDate] = useState('');
  
  // 🟢 ตะกร้าเก็บการจองแยกตามวัน: { '2026-10-04': stallObj }
  const [daySelections, setDaySelections] = useState({});

  const [bookingType, setBookingType] = useState('daily'); // 'daily' | 'subscribe'
  const [selectedMonth, setSelectedMonth] = useState(''); 
  const [subMonths, setSubMonths] = useState(1);
  const [subStall, setSubStall] = useState(null);

  const [bookedStalls, setBookedStalls] = useState([]);
  const [inspectShop, setInspectShop] = useState(null);
  
  const [vendorProfile, setVendorProfile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // คำนวณแบบผูกล็อครายเดือน (นับเฉพาะวันที่เหลือในเดือนนั้น)
  const getDaysInSelectedMonth = () => {
    if (!selectedMonth || !groupedMonths[selectedMonth]) return 0;
    return groupedMonths[selectedMonth].length;
  };
  const monthlyDaysCount = getDaysInSelectedMonth();
  const subPrice = subStall 
    ? Number(subStall.price_per_day) * (monthlyDaysCount > 0 ? monthlyDaysCount : 30) * subMonths 
    : 0;
  const subFee = subPrice * 0.1;
  const subTotal = subPrice + subFee;

  // 🟢 คำนวณราคารวมของตะกร้ารายวัน
  const selectedEntries = Object.entries(daySelections);
  const totalBasePrice = selectedEntries.reduce((sum, [, stall]) => sum + Number(stall.price_per_day), 0);
  const totalPlatformFee = totalBasePrice * 0.10;
  const totalGrandAmount = totalBasePrice + totalPlatformFee;

  const [note, setNote] = useState('');
  const [step, setStep] = useState(1);
  const [payForm, setPayForm] = useState({
    method: 'promptpay', slip_url: '',
  });
  const [loading, setLoading] = useState(false);

  const [dynamicQrUrl, setDynamicQrUrl] = useState('');
  const [qrLoading, setQrLoading]       = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login');
    if (user.role !== 'vendor') navigate('/');
    fetchMarket();
    fetchSchedule(); 
    fetchVendorProfile();
  }, []);

  useEffect(() => {
    if (marketId && (activeDate || selectedMonth)) {
      fetchBookedStalls();
    }
  }, [marketId, activeDate, selectedMonth, bookingType]);

  const fetchMarket = async () => {
    try {
      const res = await api.get(`/markets/${marketId}`);
      setMarket(res.data);
      setStalls(res.data.stalls || []);
      setShowTermsModal(true);
    } catch (err) { navigate('/markets'); }
  };

  const fetchSchedule = async () => {
    try {
      const res = await api.get(`/markets/${marketId}/schedule`);
      const schedules = Array.isArray(res.data) ? res.data : [];
      setMarketSchedule(schedules);

      const today = getTodayStr();
      const validSchedules = schedules.filter(sch => formatLocalDate(sch.market_date) >= today);
      
      if (validSchedules.length > 0) {
        const firstDate = formatLocalDate(validSchedules[0].market_date);
        setActiveDate(firstDate);
        // 🟢 เลือกเดือนเริ่มต้นอัตโนมัติจากวันแรกที่ยังไม่หมดอายุ
        setSelectedMonth(firstDate.slice(0, 7));
      } else {
        setActiveDate('');
        setSelectedMonth('');
      }
    } catch (err) {
      console.log('Error fetching schedule:', err);
      setMarketSchedule([]);
    }
  };

  const fetchBookedStalls = async () => {
    try {
      // 🟢 ถ้าเป็นรายเดือนแต่ยังไม่มี selectedMonth ให้ไม่ยิงเรียก เพื่อป้องกันบั๊ก
      if (bookingType === 'subscribe' && !selectedMonth) {
        setBookedStalls([]);
        return;
      }

      const param = bookingType === 'daily' ? `date=${activeDate}` : `month=${selectedMonth}`;
      if (!param || param.endsWith('=')) return;

      const res = await api.get(`/markets/${marketId}/booked-stalls?${param}`);
      setBookedStalls(res.data || []);
    } catch (err) {
      console.log('Error fetching booked stalls:', err);
      setBookedStalls([]);
    }
  };

  const fetchVendorProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setVendorProfile(res.data);
    } catch (err) {
      setVendorProfile(user);
    }
  };

  const generateDynamicQR = async (amount) => {
    if (!amount || amount <= 0) return;
    setQrLoading(true);
    try {
      const res = await api.post('/payments/generate-qr', { amount });
      if (res.data && res.data.qrCodeUrl) {
        setDynamicQrUrl(res.data.qrCodeUrl);
      }
    } catch (err) {
      console.error('Failed to generate dynamic QR', err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleSelectStall = (stall) => {
    if (bookingType === 'subscribe') {
      setSubStall(stall);
      return;
    }

    if (!activeDate) return alert('กรุณาเลือกวันที่ก่อน');

    setDaySelections(prev => {
      const next = { ...prev };
      if (next[activeDate]?.id === stall.id) {
        delete next[activeDate];
      } else {
        next[activeDate] = stall;
      }
      return next;
    });
  };

  const handleRemoveItem = (dateStr) => {
    setDaySelections(prev => {
      const next = { ...prev };
      delete next[dateStr];
      return next;
    });
  };

  const handleProceedToPayment = () => {
    if (bookingType === 'daily') {
      if (selectedEntries.length === 0) return alert('กรุณาเลือกล็อคอย่างน้อย 1 วัน');
      setStep(2);
      generateDynamicQR(totalGrandAmount);
    } else {
      if (!subStall) return alert('กรุณาเลือกล็อค');
      if (!selectedMonth) return alert('กรุณาเลือกเดือน');
      setStep(2);
      generateDynamicQR(subTotal);
    }
  };

  const handlePayment = async () => {
    if (!payForm.slip_url) return alert('กรุณาแนบสลิปการชำระเงิน');
    setLoading(true);
    try {
      if (bookingType === 'subscribe') {
        await api.post('/subscriptions', {
          stall_id: subStall.id,
          market_id: parseInt(marketId),
          package_months: subMonths,
          target_month: selectedMonth,
          slip_url: payForm.slip_url,
        });
        alert('✅ ส่งคำขอผูกล็อคสำเร็จ รอ organizer ยืนยัน');
      } else {
        const items = selectedEntries.map(([dateStr, stall]) => ({
          stall_id: stall.id,
          book_date: dateStr,
        }));

        const bookRes = await api.post('/bookings', { items, note });

        await api.post('/payments', {
          booking_id: bookRes.data.bookingId,
          amount: bookRes.data.totalPrice || totalGrandAmount,
          method: payForm.method,
          slip_url: payForm.slip_url,
        });

        alert('✅ ยืนยันการชำระเงินสำเร็จ! ข้อมูลถูกส่งให้ผู้จัดตลาดเรียบร้อยแล้ว');
      }
      navigate('/vendor');
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
    setLoading(false);
  };

  // จัดกลุ่มล็อคตาม stall.zone หรือตัวอักษรแรกของชื่อล็อค (A, B)
const groupedStalls = stalls.reduce((groups, stall) => {
  const zoneKey = stall.zone || (stall.lock_number ? stall.lock_number.charAt(0).toUpperCase() : 'ทั่วไป');
  if (!groups[zoneKey]) {
    groups[zoneKey] = [];
  }
  groups[zoneKey].push(stall);
  return groups;
}, {});

  if (!market) return <div style={styles.loading}>กำลังโหลด...</div>;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLogo} onClick={() => navigate('/vendor')}>🛒 กลับไปที่ Dashboard</div>
        <div style={styles.headerRight}>
          <span style={styles.systemLabel}>🔒 Lock Booking System</span>
        </div>
      </div>

      <div style={styles.container}>
        {/* ========== STEP 1: เลือกล็อค ========== */}
        {step === 1 && (
          <div style={styles.mainGrid}>
            <div style={styles.left}>
              <h2 style={styles.pageTitle}>เลือกพื้นที่ขายของคุณ</h2>

              <div style={styles.card}>
                <div style={styles.marketSelected}>
                  <span style={styles.checkIcon}>✅</span>
                  <div>
                    <div style={styles.marketName}>{market.name}</div>
                    <div style={styles.marketMeta}>
                      📅 เหลือรอบเปิดขาย {upcomingSchedule.length} วัน (จากทั้งหมด {marketSchedule.length} วัน) &nbsp;
                      📍 {market.address || market.province}
                    </div>
                  </div>
                </div>
              </div>

              {/* เลือกประเภทการจอง */}
              <div style={{marginTop:'4px', marginBottom:'12px'}}>
                <label style={styles.label}>ประเภทการจอง</label>
                <div style={{display:'flex', gap:'10px'}}>
                  <label style={{
                    flex:1, padding:'12px', border:`2px solid ${bookingType==='daily'?'#1a7a4a':'#e0e0e0'}`,
                    borderRadius:'10px', cursor:'pointer', textAlign:'center',
                    backgroundColor: bookingType==='daily' ? '#e8f5e9' : '#fff',
                  }}>
                    <input type="radio" name="bookingType" value="daily"
                      checked={bookingType==='daily'}
                      onChange={() => { setBookingType('daily'); setSelectedMonth(''); }}
                      style={{display:'none'}} />
                    <div style={{fontSize:'20px', marginBottom:'4px'}}>📅</div>
                    <div style={{fontSize:'13px', fontWeight:'700', color:'#222'}}>จองรายวัน (เลือกแยกตามวันได้)</div>
                    <div style={{fontSize:'11px', color:'#888', marginTop:'2px'}}>เลือกวันและเลือกล็อคที่ต้องการ</div>
                  </label>

                  <label style={{
                    flex:1, padding:'12px', border:`2px solid ${bookingType==='subscribe'?'#1a7a4a':'#e0e0e0'}`,
                    borderRadius:'10px', cursor:'pointer', textAlign:'center',
                    backgroundColor: bookingType==='subscribe' ? '#e8f5e9' : '#fff',
                  }}>
                    <input type="radio" name="bookingType" value="subscribe"
                      checked={bookingType==='subscribe'}
                      onChange={() => { setBookingType('subscribe'); }}
                      style={{display:'none'}} />
                    <div style={{fontSize:'20px', marginBottom:'4px'}}>🔒</div>
                    <div style={{fontSize:'13px', fontWeight:'700', color:'#222'}}>ผูกล็อค (เหมาจ่ายรายเดือน)</div>
                    <div style={{fontSize:'11px', color:'#888', marginTop:'2px'}}>เหมาจ่ายตามรอบเดือน</div>
                  </label>
                </div>
              </div>

              {/* 🟢 จองรายวัน: เลือกดูผังตามวัน (กรองเฉพาะวันที่ยังไม่หมดอายุ) */}
              {bookingType === 'daily' && (
                <div style={styles.card}>
                  <label style={styles.label}>
                    📅 คลิกเลือกวันที่เพื่อดูผังล็อคและเลือกล็อคของวันนั้น:
                  </label>
                  {(!upcomingSchedule || upcomingSchedule.length === 0) ? (
                    <p style={{ fontSize:'13px', color:'#e74c3c', padding:'8px 0' }}>
                      ⚠️ ไม่มีรอบเปิดตลาดที่เปิดรับจองในขณะนี้ (รอบตลาดที่ผ่านมาสิ้นสุดแล้ว)
                    </p>
                  ) : (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', margin:'8px 0 16px' }}>
                      {upcomingSchedule.map(sch => {
                        const dateStr = formatLocalDate(sch.market_date);
                        const isCurrent = activeDate === dateStr;
                        const hasSelectedStall = !!daySelections[dateStr];

                        return (
                          <button
                            key={sch.id}
                            type="button"
                            onClick={() => setActiveDate(dateStr)}
                            style={{
                              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
                              fontSize: '13px', fontWeight: '700',
                              backgroundColor: isCurrent ? '#1a7a4a' : (hasSelectedStall ? '#e8f5e9' : '#f8f9fa'),
                              color: isCurrent ? '#fff' : (hasSelectedStall ? '#1a7a4a' : '#333'),
                              border: isCurrent ? '2px solid #1a7a4a' : (hasSelectedStall ? '1.5px solid #1a7a4a' : '1.5px solid #e0e0e0'),
                              transition: 'all 0.15s'
                            }}
                          >
                            {hasSelectedStall && '✓ '} {dateStr}
                            {hasSelectedStall && ` (${daySelections[dateStr].lock_number})`}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <label style={styles.label}>หมายเหตุ (ไม่บังคับ)</label>
                  <input style={styles.input} placeholder="เช่น ขายเสื้อผ้า handmade"
                    value={note} onChange={e => setNote(e.target.value)} />
                </div>
              )}

              {/* จองรายเดือน (กรองเฉพาะเดือนปัจจุบันและอนาคต) */}
              {bookingType === 'subscribe' && (
                <div style={styles.card}>
                  <label style={styles.label}>🔒 เลือกเดือนที่ต้องการเหมาจ่ายผูกล็อค *</label>
                  {Object.keys(groupedMonths).length === 0 ? (
                    <p style={{ fontSize:'13px', color:'#e74c3c', padding:'8px 0' }}>
                      ⚠️ ไม่มีรอบเดือนที่เปิดให้เหมาจ่ายในขณะนี้
                    </p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px', margin:'8px 0 16px' }}>
                      {Object.entries(groupedMonths).map(([monthStr, days]) => {
                        const isSelected = selectedMonth === monthStr;
                        const [year, month] = monthStr.split('-');
                        const thaiMonths = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
                        const monthLabel = `${thaiMonths[parseInt(month, 10)]} ${parseInt(year, 10) + 543}`;

                        return (
                          <div
                            key={monthStr}
                            onClick={() => setSelectedMonth(monthStr)}
                            style={{
                              padding: '14px 16px', borderRadius: '10px', cursor: 'pointer',
                              backgroundColor: isSelected ? '#e8f5e9' : '#f8f9fa',
                              border: isSelected ? '2px solid #1a7a4a' : '1.5px solid #e0e0e0',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              transition: 'all 0.15s'
                            }}
                          >
                            <div>
                              <div style={{ fontSize:'14px', fontWeight:'800', color:'#1a7a4a' }}>📦 รอบเดือน: {monthLabel}</div>
                              <div style={{ fontSize:'12px', color:'#666', marginTop:'2px' }}>เปิดขายคงเหลือ {days.length} วันในเดือนนี้</div>
                            </div>
                            <input type="radio" checked={isSelected} readOnly />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <label style={styles.label}>เลือกจำนวนเดือนที่ต้องการเหมาต่อเนื่อง</label>
                  <div style={{display:'flex', gap:'8px', marginBottom:'12px'}}>
                    {[1, 3, 6].map(m => (
                      <button key={m}
                        type="button"
                        style={{
                          flex:1, padding:'10px', border:`2px solid ${subMonths===m?'#1a7a4a':'#e0e0e0'}`,
                          borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight:'700',
                          backgroundColor: subMonths===m ? '#1a7a4a' : '#fff',
                          color: subMonths===m ? '#fff' : '#333',
                        }}
                        onClick={() => setSubMonths(m)}>
                        {m} เดือน
                      </button>
                    ))}
                  </div>

                  <label style={styles.label}>หมายเหตุ (ไม่บังคับ)</label>
                  <input style={styles.input} placeholder="เช่น ขอเหมาโซนนี้ยาวๆ ครับ"
                    value={note} onChange={e => setNote(e.target.value)} />
                </div>
              )}

              {/* ภาพผังตลาด */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardTitle}>ภาพพื้นที่ตลาด (Market Layout Photo)</div>
                </div>
                {market.layout_url ? (
                  <img 
                    src={market.layout_url} 
                    alt="market layout" 
                    style={{...styles.marketPhotoImg, cursor:'pointer'}} 
                    onClick={() => setSelectedImage(market.layout_url)}
                    title="คลิกเพื่อดูรูปใหญ่"
                  />
                ) : (
                  <div style={styles.marketPhotoBox}>🏪 ยังไม่มีภาพผังตลาด</div>
                )}
              </div>

              {/* แผนที่ล็อค */}
              {/* แผนที่ล็อค (แยกตามโซน A / B) */}
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardTitle}>
                      แผนที่ล็อค {bookingType === 'daily' && activeDate && `(ประจำวันที่ ${activeDate})`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                      (คลิกที่ล็อคเพื่อเลือก — ล็อคสีแดงคือมีคนจองแล้วในวันนี้ คลิกดูร้านค้าได้)
                    </div>
                  </div>
                </div>

                {stalls.length === 0 ? (
                  <p style={{color:'#999'}}>ยังไม่มีล็อคในตลาดนี้</p>
                ) : (
                  Object.entries(groupedStalls)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([zoneName, zoneStalls]) => (
                      <div key={zoneName} style={styles.zoneSection}>
                        <div style={styles.zoneHeader}>
                          <span style={styles.zoneBadge}>📍 โซน {zoneName}</span>
                          <span style={styles.zonePrice}>
                            ฿{Number(zoneStalls[0]?.price_per_day || 0).toLocaleString()} / วัน ({zoneStalls.length} ล็อค)
                          </span>
                        </div>

                        <div style={styles.stallMap}>
                          {zoneStalls.map(s => {
                            const bookedInfo = bookedStalls.find(b => b.stall_id === s.id || b.lock_number === s.lock_number);
                            const isBooked = !!bookedInfo;
                            
                            const isSelected = bookingType === 'daily' 
                              ? (daySelections[activeDate]?.id === s.id)
                              : (subStall?.id === s.id);

                            return (
                              <div
                                key={s.id}
                                style={{
                                  ...styles.stallMapItem,
                                  backgroundColor: isBooked ? '#ffebee' : isSelected ? '#1a7a4a' : '#e8f5e9',
                                  color: isBooked ? '#c0392b' : isSelected ? '#fff' : '#1a7a4a',
                                  border: isBooked ? '1.5px solid #e74c3c' : isSelected ? '2px solid #1a7a4a' : '1px solid #c8e6c9',
                                  cursor: 'pointer',
                                  opacity: isBooked ? 0.95 : 1,
                                }}
                                onClick={() => {
                                  if (isBooked) {
                                    setInspectShop(bookedInfo);
                                  } else {
                                    handleSelectStall(s);
                                  }
                                }}
                                title={isBooked ? `จองแล้วโดย: ${bookedInfo.shop_name}` : `เลือกล็อค ${s.lock_number}`}
                              >
                                <div style={styles.stallMapName}>{s.lock_number}</div>
                                {isBooked ? (
                                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#c0392b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                                    🔒 {bookedInfo.shop_name || 'จองแล้ว'}
                                  </div>
                                ) : (
                                  <div style={styles.stallMapPrice}>฿{s.price_per_day}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                )}

                <div style={styles.legend}>
                  <span style={styles.legendItem}>
                    <span style={{...styles.legendDot, backgroundColor:'#e8f5e9', border:'1px solid #c8e6c9'}} />
                    ว่าง (จองได้)
                  </span>
                  <span style={styles.legendItem}>
                    <span style={{...styles.legendDot, backgroundColor:'#1a7a4a'}} />
                    เลือกแล้วในวันนี้
                  </span>
                  <span style={styles.legendItem}>
                    <span style={{...styles.legendDot, backgroundColor:'#ffebee', border:'1.5px solid #e74c3c'}} />
                    จองแล้ว (คลิกดูชื่อร้าน)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: สรุปการจอง */}
            <div style={styles.right}>
              <div style={styles.summaryCard}>
                <div style={styles.summaryHeader}>
                  <span style={styles.summaryIcon}>📋</span>
                  <span style={styles.summaryTitle}>สรุปรายการจองของคุณ</span>
                </div>

                <div style={styles.summaryMarket}>{market.name}</div>

                <div style={styles.summaryVendor}>
                  <div style={{...styles.vendorAvatar, cursor: vendorProfile?.logo_url ? 'pointer' : 'default'}} onClick={() => {
                    if (vendorProfile?.logo_url) setSelectedImage(vendorProfile.logo_url);
                  }}>
                    {vendorProfile?.logo_url ? (
                      <img src={vendorProfile.logo_url} alt="Logo" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}} />
                    ) : (
                      (vendorProfile?.shop_name || user.name || 'T').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div style={styles.vendorName}>{vendorProfile?.shop_name || user.name || 'ชื่อร้านค้า'}</div>
                    <div style={styles.vendorRole}>หมวดหมู่: {vendorProfile?.category || 'ทั่วไป'}</div>
                  </div>
                </div>

                <div style={styles.summaryDivider} />

                {bookingType === 'daily' ? (
                  <>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#555', marginBottom: '8px' }}>
                      รายการล็อคที่เลือก ({selectedEntries.length} วัน):
                    </div>

                    {selectedEntries.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', backgroundColor: '#f9f9f9', borderRadius: '8px', fontSize: '12px', color: '#999', marginBottom: '12px' }}>
                        ยังไม่ได้เลือกล็อค<br/>(คลิกวันที่และเลือกล็อคบนแผนที่ได้เลย)
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px', maxHeight: '180px', overflowY: 'auto' }}>
                        {selectedEntries.map(([dateStr, s]) => (
                          <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e8f5e9', padding: '8px 10px', borderRadius: '6px', border: '1px solid #c8e6c9' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1a7a4a' }}>
                                📅 {dateStr}
                              </div>
                              <div style={{ fontSize: '11px', color: '#555' }}>
                                LOCK {s.lock_number} — ฿{s.price_per_day}
                              </div>
                            </div>
                            <button 
                              type="button" 
                              style={{ border: 'none', background: 'none', color: '#e74c3c', fontSize: '14px', cursor: 'pointer', fontWeight: 'bold' }}
                              onClick={() => handleRemoveItem(dateStr)}
                              title="ลบรายการนี้"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>ค่าล็อครวม</span>
                      <span style={styles.priceVal}>฿{totalBasePrice.toFixed(2)}</span>
                    </div>
                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>Platform Fee (10%)</span>
                      <span style={styles.priceVal}>฿{totalPlatformFee.toFixed(2)}</span>
                    </div>
                    <div style={styles.summaryDivider} />
                    <div style={styles.priceRow}>
                      <span style={{...styles.priceLabel, fontWeight:'700', color:'#222'}}>ยอดรวมทั้งหมด</span>
                      <span style={styles.totalPrice}>฿{totalGrandAmount.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.summaryLockName}>{subStall ? `LOCK ${subStall.lock_number}` : 'ยังไม่เลือก'}</div>
                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>รอบเดือนที่เหมา</span>
                      <span style={{...styles.priceVal, fontWeight:'700', color:'#1a7a4a'}}>{selectedMonth || 'ยังไม่ได้เลือก'}</span>
                    </div>
                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>ระยะเวลา</span>
                      <span style={styles.priceVal}>{subMonths} เดือน ({monthlyDaysCount} วัน/เดือน)</span>
                    </div>
                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>ราคาเหมาจ่าย</span>
                      <span style={styles.priceVal}>฿{subPrice.toLocaleString()}</span>
                    </div>
                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>Platform Fee (10%)</span>
                      <span style={styles.priceVal}>฿{subFee.toLocaleString()}</span>
                    </div>
                    <div style={styles.summaryDivider} />
                    <div style={styles.priceRow}>
                      <span style={{...styles.priceLabel, fontWeight:'700', color:'#222'}}>ยอดรวมทั้งหมด</span>
                      <span style={styles.totalPrice}>฿{subTotal.toLocaleString()}</span>
                    </div>
                  </>
                )}

                <button
                  style={{
                    ...styles.bookBtn,
                    opacity: (bookingType === 'daily' ? selectedEntries.length === 0 : (!subStall || !selectedMonth)) ? 0.5 : 1,
                  }}
                  onClick={handleProceedToPayment}
                  disabled={bookingType === 'daily' ? selectedEntries.length === 0 : (!subStall || !selectedMonth)}
                >
                  {bookingType === 'subscribe' 
                    ? `🔒 ไปชำระเงิน — ฿${subTotal.toLocaleString()}` 
                    : `👉 ดำเนินการชำระเงิน (${selectedEntries.length} วัน) — ฿${totalGrandAmount.toFixed(2)}`}
                </button>

                <div style={styles.summaryNote}>ℹ️ ชำระเงินรวมครั้งเดียวในขั้นตอนถัดไป</div>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 2: ชำระเงิน ========== */}
        {step === 2 && (
          <div style={styles.paymentPage}>
            <div style={styles.paymentHeader}>
              <h2 style={styles.pageTitle}>ชำระเงิน (Payment)</h2>
              <p style={styles.pageSub}>สแกน QR Code หรือโอนเงิน และแนบสลิปเพื่อยืนยันการจองทั้งหมด</p>
            </div>

            <div style={styles.paymentGrid}>
              <div style={styles.paymentLeft}>
                <div style={styles.card}>
                  <div style={styles.payTabRow}>
                    <div style={{
                      ...styles.payTab,
                      ...(payForm.method === 'promptpay' ? styles.payTabActive : {})
                    }} onClick={() => setPayForm({...payForm, method:'promptpay'})}>
                      📱 Scan QR Code
                    </div>
                    <div style={{
                      ...styles.payTab,
                      ...(payForm.method === 'bank_transfer' ? styles.payTabActive : {})
                    }} onClick={() => setPayForm({...payForm, method:'bank_transfer'})}>
                      🏦 โอนผ่านธนาคาร
                    </div>
                  </div>

                  {payForm.method === 'promptpay' && (
                    <div style={styles.qrSection}>
                      <div style={styles.qrBox}>
                        {qrLoading ? (
                          <div style={{ width:'200px', height:'200px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', color:'#888', border:'1px solid #ddd', borderRadius:'8px', margin:'0 auto 8px' }}>
                            กำลังสร้าง QR Code...
                          </div>
                        ) : dynamicQrUrl ? (
                          <img src={dynamicQrUrl} alt="Dynamic PromptPay QR"
                            style={{ width:'200px', height:'200px', objectFit:'contain', borderRadius:'8px', cursor:'pointer', margin:'0 auto 8px', display:'block', border:'1px solid #eee' }} 
                            onClick={() => setSelectedImage(dynamicQrUrl)}
                            title="คลิกดูรูปใหญ่"
                          />
                        ) : market.promptpay_qr ? (
                          <img src={market.promptpay_qr} alt="Static QR Code"
                            style={{ width:'200px', height:'200px', objectFit:'contain', borderRadius:'8px', cursor:'pointer', margin:'0 auto 8px', display:'block', border:'1px solid #eee' }} 
                            onClick={() => setSelectedImage(market.promptpay_qr)}
                            title="คลิกดูรูปใหญ่"
                          />
                        ) : (
                          <div style={styles.qrPlaceholder}>📱</div>
                        )}
                        <div style={styles.qrLabel}>
                          {dynamicQrUrl 
                            ? `สแกนพร้อมเพย์ ยอดชำระ ฿${(bookingType === 'subscribe' ? subTotal : totalGrandAmount).toLocaleString()}` 
                            : 'สแกนเพื่อชำระเงิน'}
                        </div>
                      </div>
                    </div>
                  )}

                  {payForm.method === 'bank_transfer' && (
                    <div style={styles.bankSection}>
                      <div style={styles.bankRow}>
                        <span style={styles.bankLabel}>ธนาคาร</span>
                        <span style={styles.bankVal}>{market.bank_name || 'ยังไม่ระบุ'}</span>
                      </div>
                      <div style={styles.bankRow}>
                        <span style={styles.bankLabel}>เลขบัญชี</span>
                        <span style={styles.bankVal}>{market.bank_account || '-'}</span>
                      </div>
                      <div style={styles.bankRow}>
                        <span style={styles.bankLabel}>ชื่อบัญชี</span>
                        <span style={styles.bankVal}>{market.bank_account_name || '-'}</span>
                      </div>
                    </div>
                  )}

                  <div style={styles.slipSection}>
                    <label style={styles.label}>แนบหลักฐานการชำระเงิน (Slip/Screenshot) *</label>
                    <ImageUpload
                      type="slip"
                      label="แนบหลักฐานการชำระเงิน (Slip)"
                      onUpload={(url) => setPayForm({...payForm, slip_url: url})}
                    />
                    {payForm.slip_url && (
                      <div style={{margin:'8px 0'}}>
                        <p style={{fontSize:'12px', color:'#1a7a4a', margin:'4px 0'}}>✅ อัปโหลดสลิปแล้ว</p>
                        <img 
                          src={payForm.slip_url} 
                          alt="Slip preview" 
                          style={{width:'100px', height:'100px', objectFit:'cover', borderRadius:'8px', cursor:'pointer', border:'1px solid #ddd'}} 
                          onClick={() => setSelectedImage(payForm.slip_url)}
                        />
                      </div>
                    )}

                    <button
                      style={{...styles.confirmPayBtn, opacity: loading ? 0.7 : 1}}
                      onClick={handlePayment}
                      disabled={loading}
                    >
                      {loading ? 'กำลังส่งข้อมูล...' : '✅ ยืนยันการชำระเงิน'}
                    </button>

                    <button
                      type="button"
                      style={styles.backStepBtn}
                      onClick={() => setStep(1)}
                    >
                      ← ย้อนกลับไปแก้ไขรายการจอง
                    </button>
                  </div>
                </div>
              </div>

              <div style={styles.paymentRight}>
                {bookingType === 'subscribe' ? (
                  <div style={styles.summaryCard}>
                    <div style={styles.summaryHeader}>
                      <span style={styles.summaryIcon}>🔒</span>
                      <span style={styles.summaryTitle}>สรุปการผูกล็อคเหมาจ่าย</span>
                    </div>
                    <div style={styles.summaryLockName}>{subStall?.lock_number}</div>
                    <div style={{fontSize:'13px', color:'#888', marginBottom:'12px'}}>
                      {market.name} รอบเดือน {selectedMonth} ({subMonths} เดือน)
                    </div>
                    <div style={styles.summaryDivider} />
                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>ราคาเหมาจ่าย</span>
                      <span style={styles.priceVal}>฿{subPrice.toLocaleString()}</span>
                    </div>
                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>Platform Fee</span>
                      <span style={styles.priceVal}>฿{subFee.toLocaleString()}</span>
                    </div>
                    <div style={styles.summaryDivider} />
                    <div style={styles.priceRow}>
                      <span style={{fontWeight:'700'}}>รวมทั้งสิ้น</span>
                      <span style={styles.totalPrice}>฿{subTotal.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div style={styles.summaryCard}>
                    <div style={styles.summaryHeader}>
                      <span style={styles.summaryIcon}>📋</span>
                      <span style={styles.summaryTitle}>Booking Summary</span>
                    </div>
                    <div style={styles.summaryMarket}>{market.name}</div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#555', margin: '8px 0 4px' }}>
                      สรุป {selectedEntries.length} รายการ:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                      {selectedEntries.map(([dateStr, s]) => (
                        <div key={dateStr} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#444', backgroundColor: '#f9f9f9', padding: '6px 8px', borderRadius: '4px' }}>
                          <span>📅 {dateStr} (LOCK {s.lock_number})</span>
                          <span>฿{s.price_per_day}</span>
                        </div>
                      ))}
                    </div>
                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>ค่าล็อครวม</span>
                      <span style={styles.priceVal}>฿{totalBasePrice.toFixed(2)}</span>
                    </div>
                    <div style={styles.priceRow}>
                      <span style={styles.priceLabel}>Platform Fee (10%)</span>
                      <span style={styles.priceVal}>฿{totalPlatformFee.toFixed(2)}</span>
                    </div>
                    <div style={styles.summaryDivider} />
                    <div style={styles.priceRow}>
                      <span style={{fontWeight:'700'}}>Total Amount</span>
                      <span style={styles.totalPrice}>฿{totalGrandAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pop-up ข้อมูลร้านค้า */}
      {inspectShop && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 99999, padding: '16px'
        }} onClick={() => setInspectShop(null)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', width: '100%', 
            maxWidth: '420px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>🔒</span>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#c0392b' }}>
                  ล็อค {inspectShop.lock_number} ถูกจองแล้ว
                </h3>
              </div>
              <button 
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#999' }} 
                onClick={() => setInspectShop(null)}
              >✕</button>
            </div>

            <div style={{ backgroundColor: '#fff9f9', border: '1px solid #ffd5d5', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#c0392b',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '16px', overflow: 'hidden'
                }}>
                  {inspectShop.logo_url ? (
                    <img src={inspectShop.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (inspectShop.shop_name || 'V').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: '#222' }}>{inspectShop.shop_name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>ผู้ขาย: {inspectShop.vendor_name}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#777' }}>หมวดหมู่สินค้า:</span>
                  <span style={{ fontWeight: '700', color: '#1a7a4a' }}>🏷️ {inspectShop.category}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#777' }}>วันที่จอง:</span>
                  <span style={{ fontWeight: '600', color: '#333' }}>📅 {inspectShop.book_date || activeDate}</span>
                </div>
              </div>
            </div>

            <button 
              style={{
                width: '100%', padding: '10px', backgroundColor: '#f0f0f0', 
                border: 'none', borderRadius: '8px', cursor: 'pointer', 
                fontSize: '13px', fontWeight: '700', color: '#555'
              }}
              onClick={() => setInspectShop(null)}
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ข้อกำหนดตลาด */}
      {showTermsModal && market && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          zIndex: 99999, padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', width: '100%', 
            maxWidth: '550px', padding: '0', overflow: 'hidden', boxShadow: '0 10px 40px rgba(0,0,0,0.25)'
          }}>
            <div style={{backgroundColor: '#1a7a4a', padding: '20px 24px'}}>
              <h3 style={{fontSize: '18px', fontWeight: '800', color: '#fff', margin: '0 0 4px'}}>📋 ข้อกำหนดและเงื่อนไขการจองพื้นที่</h3>
              <p style={{fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0}}>ตลาด: {market.name}</p>
            </div>

            <div style={{padding: '24px', maxHeight: '60vh', overflowY: 'auto'}}>
              <div style={{
                fontSize: '13px', color: '#444', lineHeight: '1.7', marginBottom: '20px', 
                backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '10px', border: '1px solid #eee'
              }}>
                1. <strong>การชำระเงิน:</strong> ผู้จองต้องชำระเงินค่าเช่าพื้นที่ภายใน 24 ชั่วโมงหลังจากการกดจอง มิฉะนั้นระบบจะยกเลิกอัตโนมัติ<br/><br/>
                2. <strong>การรักษาความสะอาด:</strong> ผู้ค้าต้องดูแลความสะอาดพื้นที่ของตนเอง และนำขยะไปทิ้งในจุดที่ตลาดจัดเตรียมไว้ให้หลังเลิกขายทุกครั้ง<br/><br/>
                3. <strong>การยกเลิก/คืนเงิน:</strong> ไม่สามารถขอคืนเงินได้ทุกกรณี เว้นแต่เกิดจากความผิดพลาดของทางตลาดเอง หรือตลาดถูกยกเลิก<br/><br/>
                4. <strong>เวลาเข้าพื้นที่:</strong> ผู้ค้าสามารถเข้ามาจัดเตรียมร้านค้าได้ก่อนเวลาเปิดตลาด 2 ชั่วโมง และต้องเก็บของออกให้เสร็จภายใน 1 ชั่วโมงหลังตลาดปิด<br/><br/>
                5. <strong>กฎระเบียบทั่วไป:</strong> ห้ามวางสินค้าล้ำเส้นพื้นที่ล็อคที่กำหนด และต้องปฏิบัติตามคำแนะนำของเจ้าหน้าที่ผู้จัดตลาดอย่างเคร่งครัด
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', 
                padding: '12px', backgroundColor: acceptTerms ? '#e8f5e9' : '#f5f5f5', 
                borderRadius: '8px', border: acceptTerms ? '1px solid #c8e6c9' : '1px solid #ddd', 
                transition: 'all 0.2s'
              }}>
                <input 
                  type="checkbox" 
                  checked={acceptTerms} 
                  onChange={e => setAcceptTerms(e.target.checked)} 
                  style={{width: '18px', height: '18px', cursor: 'pointer'}}
                />
                <span style={{fontSize: '13px', fontWeight: '700', color: acceptTerms ? '#1a7a4a' : '#555'}}>
                  ฉันได้อ่านและยอมรับข้อกำหนดของตลาดเรียบร้อยแล้ว
                </span>
              </label>

              <div style={{display: 'flex', gap: '10px', marginTop: '24px'}}>
                <button 
                  style={{
                    padding: '13px', backgroundColor: '#1a7a4a', color: '#fff', 
                    border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', 
                    flex: 1, cursor: acceptTerms ? 'pointer' : 'not-allowed', 
                    opacity: acceptTerms ? 1 : 0.5, transition: 'opacity 0.2s'
                  }}
                  disabled={!acceptTerms}
                  onClick={() => setShowTermsModal(false)}
                >
                  เข้าสู่หน้าจองล็อค
                </button>
                <button 
                  style={{
                    padding: '13px', backgroundColor: '#f0f0f0', color: '#555', 
                    border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', 
                    flex: 1, cursor: 'pointer'
                  }} 
                  onClick={() => navigate('/markets')}
                >
                  กลับไปหน้าตลาด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GLOBAL IMAGE PREVIEW MODAL */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 999999,
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

      <div style={styles.footer}>
        © 2026 POPMARKET PLATFORM — NATIONAL PAYMENT SERVICE
      </div>
    </div>
  );
}

const styles = {
  page: { fontFamily:'Sarabun, sans-serif', backgroundColor:'#f8f9fa', minHeight:'100vh' },
  loading: { textAlign:'center', padding:'80px', color:'#999' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 32px', backgroundColor:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  headerLogo: { fontSize:'14px', color:'#1a7a4a', fontWeight:'600', cursor:'pointer' },
  container: { maxWidth:'1100px', margin:'0 auto', padding:'24px' },
  pageTitle: { fontSize:'22px', fontWeight:'bold', color:'#222', margin:'0 0 4px' },
  pageSub: { fontSize:'13px', color:'#888', margin:'0 0 20px' },
  mainGrid: { display:'grid', gridTemplateColumns:'2fr 1fr', gap:'20px' },
  left: { display:'flex', flexDirection:'column', gap:'16px' },
  right: {},
  card: { backgroundColor:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' },
  cardTitle: { fontSize:'14px', fontWeight:'700', color:'#222' },
  marketSelected: { display:'flex', alignItems:'center', gap:'12px' },
  checkIcon: { fontSize:'20px' },
  marketName: { fontSize:'15px', fontWeight:'700', color:'#222' },
  marketMeta: { fontSize:'12px', color:'#888', marginTop:'2px' },
  label: { display:'block', fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'6px' },
  input: { width:'100%', padding:'10px 12px', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'13px', marginBottom:'12px', outline:'none', boxSizing:'border-box' },
  marketPhotoBox: { height:'160px', backgroundColor:'#e8f5e9', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', color:'#1a7a4a' },
  stallMap: { display:'flex', flexWrap:'wrap', gap:'8px' },
  stallMapItem: { width:'80px', padding:'10px 4px', borderRadius:'8px', textAlign:'center', transition:'all 0.2s' },
  stallMapName: { fontSize:'13px', fontWeight:'700' },
  stallMapPrice: { fontSize:'10px', marginTop:'2px' },
  legend: { display:'flex', gap:'16px', marginTop:'14px' },
  legendItem: { display:'flex', alignItems:'center', gap:'6px', fontSize:'11px', color:'#666' },
  legendDot: { width:'12px', height:'12px', borderRadius:'2px', display:'inline-block' },
  summaryCard: { backgroundColor:'#fff', borderRadius:'12px', padding:'20px', boxShadow:'0 2px 12px rgba(0,0,0,0.1)', position:'sticky', top:'20px' },
  summaryHeader: { display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' },
  summaryIcon: { fontSize:'18px' },
  summaryTitle: { fontSize:'14px', fontWeight:'700', color:'#222' },
  summaryMarket: { fontSize:'11px', color:'#999', letterSpacing:'1px', marginBottom:'4px' },
  summaryLockName: { fontSize:'28px', fontWeight:'bold', color:'#222', marginBottom:'12px' },
  summaryVendor: { display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' },
  vendorAvatar: { width:'36px', height:'36px', borderRadius:'50%', backgroundColor:'#1a7a4a', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', fontSize:'14px', overflow:'hidden' },
  vendorName: { fontSize:'13px', fontWeight:'700', color:'#222' },
  vendorRole: { fontSize:'11px', color:'#888' },
  summaryDivider: { borderTop:'1px solid #eee', margin:'10px 0' },
  priceRow: { display:'flex', justifyContent:'space-between', margin:'6px 0' },
  priceLabel: { fontSize:'12px', color:'#888' },
  priceVal: { fontSize:'12px', color:'#222', fontWeight:'500' },
  totalPrice: { fontSize:'20px', fontWeight:'bold', color:'#1a7a4a' },
  bookBtn: { width:'100%', marginTop:'16px', padding:'13px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'700' },
  summaryNote: { fontSize:'11px', color:'#888', textAlign:'center', marginTop:'10px' },
  paymentPage: {},
  paymentHeader: { marginBottom:'20px' },
  paymentGrid: { display:'grid', gridTemplateColumns:'3fr 2fr', gap:'20px' },
  paymentLeft: {},
  paymentRight: {},
  payTabRow: { display:'flex', gap:'0', marginBottom:'20px', borderRadius:'8px', overflow:'hidden', border:'1px solid #e0e0e0' },
  payTab: { flex:1, padding:'10px', textAlign:'center', cursor:'pointer', fontSize:'13px', color:'#555', backgroundColor:'#f8f9fa' },
  payTabActive: { backgroundColor:'#1a7a4a', color:'#fff', fontWeight:'600' },
  qrSection: { textAlign:'center', padding:'20px 0' },
  qrBox: {},
  qrPlaceholder: { width:'160px', height:'160px', backgroundColor:'#f0f0f0', margin:'0 auto 8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'48px', borderRadius:'8px' },
  qrLabel: { fontSize:'12px', color:'#888' },
  bankSection: { padding:'12px 0' },
  bankRow: { display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f5f5' },
  bankLabel: { fontSize:'12px', color:'#999' },
  bankVal: { fontSize:'13px', fontWeight:'600', color:'#222' },
  slipSection: { marginTop:'16px' },
  confirmPayBtn: { width:'100%', padding:'13px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'700', marginTop:'8px' },
  backStepBtn: { width: '100%', padding: '10px', backgroundColor: '#f0f0f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#666', marginTop: '8px' },
  footer: { textAlign:'center', padding:'16px', fontSize:'11px', color:'#bbb', borderTop:'1px solid #eee', backgroundColor:'#fff', marginTop:'40px' },
  marketPhotoImg: { width:'100%', height:'auto', borderRadius:'8px', display:'block' },
  zoneSection: { backgroundColor: '#fbfcfd', border: '1.5px solid #edf2f7', borderRadius: '12px', padding: '14px', marginBottom: '16px' },
  zoneHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px dashed #e2e8f0' },
  zoneBadge: { backgroundColor: '#e8f5e9', color: '#1a7a4a', fontWeight: '700', fontSize: '13px', padding: '3px 12px', borderRadius: '20px' },
  zonePrice: { fontSize: '12px', color: '#666', fontWeight: '600' },
};

export default BookStall;