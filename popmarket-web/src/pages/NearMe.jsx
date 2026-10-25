import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function NearMe() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMarkets();
    getLocation();
  }, []);

  const fetchMarkets = async () => {
    try {
      const res = await api.get('/markets');
      setMarkets(res.data);
    } catch (err) { console.log(err); }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ไม่รองรับ GPS');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLoading(false);
      },
      (err) => {
        setError('ไม่สามารถเข้าถึง GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง');
        setLoading(false);
      }
    );
  };

  // คำนวณระยะทาง (Haversine formula)
  const calcDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  useEffect(() => {
    if (!location || markets.length === 0) return;
    const withDistance = markets
      .filter(m => m.lat && m.lng)
      .map(m => ({
        ...m,
        distance: calcDistance(location.lat, location.lng, m.lat, m.lng)
      }))
      .sort((a, b) => a.distance - b.distance);

    // ถ้าไม่มีพิกัด ใช้ทั้งหมดแทน
    if (withDistance.length === 0) {
      setNearby(markets.map(m => ({...m, distance: null})));
    } else {
      setNearby(withDistance);
    }
  }, [location, markets]);

  const statusColor = (s) => ({
    active: '#1a7a4a', upcoming: '#3498db', pending: '#f39c12'
  }[s] || '#999');
  const filterMarkets = (list) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString().split('T')[0];

    return list.filter(m => {
      const start = m.start_date?.split('T')[0];
      const end = m.end_date?.split('T')[0];
      if (!start || !end) return true;
      if (filter === 'today') return start <= today && end >= today;
      if (filter === 'week') return start <= weekLater && end >= today;
      if (filter === 'month') return start <= monthLater && end >= today;
      return true;
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.pageHeader}>
          <div style={styles.breadcrumb}>
            <span
              style={{cursor:'pointer', color:'#1a7a4a', fontWeight:'600'}}
              onClick={() => navigate(-1)}
            >
              ← ย้อนกลับ
            </span>
            <span style={{margin:'0 8px', color:'#ccc'}}>/</span>
            <span>📍 ตลาดนัดใกล้ฉัน</span>
          </div>
          <h2 style={styles.title}>ตลาดนัดใกล้คุณ</h2>
          <p style={styles.sub}>หาตลาดนัดที่อยู่ใกล้ตำแหน่งของคุณที่สุด</p>

          {/* Filter Tabs */}
          <div style={styles.filterRow}>
            {[
              { key:'all', label:'ทั้งหมด' },
              { key:'today', label:'Today' },
              { key:'week', label:'สัปดาห์นี้' },
              { key:'month', label:'เดือนนี้' },
            ].map(f => (
              <button key={f.key}
                style={{...styles.filterBtn, ...(filter === f.key ? styles.filterActive : {})}}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location Status */}
        {loading && (
          <div style={styles.locationBox}>
            <div style={styles.locationIcon}>📍</div>
            <p>กำลังหาตำแหน่งของคุณ...</p>
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            <p>⚠️ {error}</p>
            <p style={{fontSize:'13px', color:'#888'}}>แสดงตลาดทั้งหมดแทน</p>
          </div>
        )}

        {location && (
          <div style={styles.locationFound}>
            ✅ พบตำแหน่งของคุณ: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </div>
        )}

       {/* Markets Grid */}
{!loading && (() => {
  const base = nearby.length > 0 ? nearby : markets;
  const filtered = filterMarkets(base);
  return filtered.length > 0 ? (
    <div style={styles.grid}>
      {filtered.map(m => (
        <MarketCard key={m.id} market={m} statusColor={statusColor} />
      ))}
    </div>
  ) : base.length > 0 ? (
    <div style={styles.empty}>
      <p>ไม่มีตลาดในช่วงเวลาที่เลือก</p>
      <button style={{...styles.browseBtn, border:'none', cursor:'pointer'}}
        onClick={() => setFilter('all')}>
        ดูทั้งหมด
      </button>
    </div>
  ) : (
    <div style={styles.empty}>
      <p>ยังไม่มีตลาดในระบบ</p>
      <Link to="/markets" style={styles.browseBtn}>ดูตลาดทั้งหมด</Link>
    </div>
  );
})()}
        {/* CTA Banner */}
        <div style={styles.ctaBanner}>
          <div style={styles.ctaIcon}>🏪</div>
          <h3 style={styles.ctaTitle}>สำรวจแผนที่แบบเรียลไทม์</h3>
          <p style={styles.ctaSub}>
            ดูตำแหน่งตลาดนัดทั้งหมดบนแผนที่ และค้นหาตลาดที่ถูกใจได้ทันที
          </p>
          <button style={styles.ctaBtn}>เปิดแผนที่ตลาดนัด</button>
        </div>
      </div>
    </div>
  );
}

// 🏪 Component การ์ดตลาด (แก้ไขให้แรนเดอร์รูปภาพจาก cover_url)
function MarketCard({ market, statusColor }) {
  return (
    <div style={cardStyles.card}>
      <div style={cardStyles.cardImg}>
        {/* 🌟 ดักเช็คเงื่อนไขรูปหน้าปกตลาดเหมือนหน้าอื่นๆ */}
        {market.cover_url ? (
          <img 
            src={market.cover_url} 
            alt={market.name} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <div style={cardStyles.imgEmoji}>🏪</div>
        )}
        
        <span style={{
          ...cardStyles.statusBadge,
          backgroundColor: statusColor(market.status),
        }}>
          {market.status?.toUpperCase()}
        </span>
        {market.distance && (
          <span style={cardStyles.distanceBadge}>
            📍 {market.distance} km
          </span>
        )}
      </div>
      <div style={cardStyles.cardBody}>
        <h3 style={cardStyles.cardTitle}>{market.name}</h3>
        <p style={cardStyles.cardOrg}>จัดโดย: {market.organizer_name}</p>
        <div style={cardStyles.cardInfo}>
          <span>📅 {market.start_date?.split('T')[0] || market.start_date} — {market.end_date?.split('T')[0] || market.end_date}</span>
        </div>
        <div style={cardStyles.cardInfo}>
          <span>📍 {market.address || market.province || 'ไม่ระบุที่อยู่'}</span>
        </div>
        <Link to={`/markets/${market.id}`} style={cardStyles.cardBtn}>
          SEE DETAILS
        </Link>
      </div>
    </div>
  );
}

const styles = {
  page: { backgroundColor:'#f8f9fa', minHeight:'100vh', fontFamily:'Sarabun, sans-serif' },
  container: { maxWidth:'1100px', margin:'0 auto', padding:'32px 24px' },
  pageHeader: { marginBottom:'24px' },
  breadcrumb: { fontSize:'13px', color:'#888', marginBottom:'8px' },
  title: { fontSize:'24px', fontWeight:'bold', margin:'4px 0', color:'#222' },
  sub: { fontSize:'14px', color:'#888', margin:'0 0 16px' },
  filterRow: { display:'flex', gap:'8px' },
  filterBtn: {
    padding:'7px 16px', border:'1.5px solid #e0e0e0',
    borderRadius:'20px', backgroundColor:'#fff',
    cursor:'pointer', fontSize:'13px', color:'#555',
  },
  filterActive: {
    backgroundColor:'#1a7a4a', color:'#fff',
    borderColor:'#1a7a4a', fontWeight:'600',
  },
  locationBox: {
    textAlign:'center', padding:'32px',
    backgroundColor:'#fff', borderRadius:'12px',
    marginBottom:'20px', color:'#888',
  },
  locationIcon: { fontSize:'32px', marginBottom:'8px' },
  errorBox: {
    backgroundColor:'#fff9e6', padding:'16px',
    borderRadius:'8px', marginBottom:'20px',
    border:'1px solid #fce5a0', color:'#f39c12',
  },
  locationFound: {
    backgroundColor:'#e8f5e9', padding:'10px 16px',
    borderRadius:'8px', marginBottom:'20px',
    fontSize:'13px', color:'#1a7a4a', fontWeight:'600',
  },
  grid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))',
    gap:'20px', marginBottom:'32px',
  },
  empty: { textAlign:'center', padding:'60px', color:'#999' },
  browseBtn: {
    display:'inline-block', marginTop:'12px',
    padding:'10px 20px', backgroundColor:'#1a7a4a',
    color:'#fff', textDecoration:'none', borderRadius:'6px',
  },
  ctaBanner: {
    background:'linear-gradient(135deg, #1a7a4a, #2ecc71)',
    borderRadius:'16px', padding:'40px',
    textAlign:'center', color:'#fff', marginTop:'8px',
  },
  ctaIcon: { fontSize:'32px', marginBottom:'12px' },
  ctaTitle: { fontSize:'22px', fontWeight:'bold', margin:'0 0 8px' },
  ctaSub: { fontSize:'14px', opacity:0.85, margin:'0 0 20px', maxWidth:'500px', marginInline:'auto' },
  ctaBtn: {
    padding:'12px 28px', backgroundColor:'#fff',
    color:'#1a7a4a', border:'none', borderRadius:'8px',
    cursor:'pointer', fontSize:'14px', fontWeight:'700',
  },
};

const cardStyles = {
  card: {
    backgroundColor:'#fff', borderRadius:'12px',
    overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.08)',
  },
  cardImg: { position:'relative', height:'180px', backgroundColor: '#e8f5e9' }, // คลุมสีพื้นหลังไว้กันรูปโหลดช้า
  imgEmoji: {
    width:'100%', height:'100%',
    display:'flex', alignItems:'center', justifyContent:'center', fontSize:'56px',
  },
  statusBadge: {
    position:'absolute', top:'12px', left:'12px',
    color:'#fff', fontSize:'10px', padding:'3px 10px',
    borderRadius:'20px', fontWeight:'700', zIndex: 2
  },
  distanceBadge: {
    position:'absolute', top:'12px', right:'12px',
    backgroundColor:'rgba(0,0,0,0.6)', color:'#fff',
    fontSize:'11px', padding:'3px 10px', borderRadius:'20px', fontWeight:'600', zIndex: 2
  },
  cardBody: { padding:'16px' },
  cardTitle: { fontSize:'16px', fontWeight:'bold', margin:'0 0 4px', color:'#222' },
  cardOrg: { fontSize:'12px', color:'#888', margin:'0 0 8px' },
  cardInfo: { fontSize:'13px', color:'#555', margin:'4px 0' },
  cardBtn: {
    display:'block', marginTop:'12px', padding:'10px',
    backgroundColor:'#1a7a4a', color:'#fff',
    textDecoration:'none', borderRadius:'6px',
    textAlign:'center', fontSize:'13px', fontWeight:'600',
  },
};

export default NearMe;