import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom'; // 🟢 เพิ่ม useLocation
import api from '../services/api';

function Shops() {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [savedShopIds, setSavedShopIds] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const FAV_SHOP_KEY = `favorite_shops_${user.id || 'guest'}`;
  
  const location = useLocation(); // 🟢 ดึงข้อมูล URL ปัจจุบัน

  const normalizeCategory = (cat) => {
  if (!cat) return 'other';
  const c = String(cat).toLowerCase().trim();
  if (c === 'food' || c.includes('อาหาร') || c.includes('เครื่องดื่ม') || c.includes('drink')) return 'food';
  if (c === 'handmade' || c.includes('งานฝีมือ') || c.includes('แฮนด์')) return 'handmade';
  if (c === 'fashion' || c.includes('แฟชั่น') || c.includes('เสื้อผ้า')) return 'fashion';
  return 'other';
};

  // 🟢 เพิ่ม useEffect เพื่อดึงคำค้นหาจาก URL (เช่น ?search=ไก่ทอด) มาใส่ใน State ทันทีที่โหลดหน้าเว็บ
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchQuery = params.get('search');
    const categoryQuery = params.get('category');
    
    if (searchQuery) setSearch(searchQuery);
    if (categoryQuery && categoryQuery !== '') setCategory(categoryQuery);
  }, [location.search]);

  useEffect(() => {
    const savedIds = JSON.parse(localStorage.getItem(FAV_SHOP_KEY) || '[]');
    setSavedShopIds(savedIds);
    fetchShops();
  }, [FAV_SHOP_KEY]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/vendors/public');
      const vendorShops = res.data.map(v => ({
        id: v.id,
        name: v.shop_name || v.name,
        phone: v.phone || 'ไม่ระบุเบอร์โทร',
        logo_url: v.logo_url || null,
        category: normalizeCategory(v.category) || ['food', 'handmade', 'fashion', 'other'][v.id % 4],
        rating: parseFloat(v.avg_rating || 0).toFixed(1),
        review_count: parseInt(v.review_count) || 0,
        desc: v.description || 'ยินดีต้อนรับสู่ร้านค้าของเรา',
        total_bookings: v.total_bookings || 0,
        paid_bookings: v.paid_bookings || 0,
        today_is_open: v.today_is_open !== undefined ? v.today_is_open : 1,
        tag: v.paid_bookings > 0 ? 'VERIFIED' : 'NEW',
      }));
      setShops(vendorShops);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    }
    setLoading(false);
  };

  const filteredShops = useMemo(() => {
    let result = [...shops];
    if (search) result = result.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
    if (category !== 'all') result = result.filter(s => normalizeCategory(s.category) === category);
    
    if (sortBy === 'rating') {
      result.sort((a, b) => {
        const rA = parseFloat(a.rating) || 0;
        const rB = parseFloat(b.rating) || 0;
        const cA = parseInt(a.review_count) || 0;
        const cB = parseInt(b.review_count) || 0;
        if (rB !== rA) return rB - rA;
        return cB - cA;
      });
    } else {
      result.sort((a, b) => b.id - a.id);
    }
    return result;
  }, [search, category, sortBy, shops]);

  const toggleFavoriteShop = (shopId, e) => {
    e.preventDefault();
    const currentFavs = JSON.parse(localStorage.getItem(FAV_SHOP_KEY) || '[]');
    let newFavs = currentFavs.includes(shopId) ? currentFavs.filter(id => id !== shopId) : [...currentFavs, shopId];
    localStorage.setItem(FAV_SHOP_KEY, JSON.stringify(newFavs));
    setSavedShopIds(newFavs);
  };

  const categoryColor = (cat) => ({
    food: '#e74c3c', handmade: '#9b59b6', fashion: '#3498db', other: '#f39c12'
  }[cat] || '#999');

  const categoryLabel = (cat) => ({
  food: '🍕 อาหาร & เครื่องดื่ม', 
  handmade: '🎨 งานฝีมือ / Handmade', 
  fashion: '👗 แฟชั่น & เสื้อผ้า', 
  other: '🏷️ สินค้าทั่วไป'
}[normalizeCategory(cat)] || '🏷️ สินค้าทั่วไป');

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h2 style={styles.title}>DISCOVER SHOPS</h2>
        <p style={styles.sub}>ค้นพบร้านค้าและผู้ค้าที่น่าสนใจในระบบ PopMarket</p>

        <div style={styles.searchRow}>
          <input style={styles.searchInput} placeholder="🔍 ค้นหาชื่อร้านค้า..." value={search} onChange={e => setSearch(e.target.value)} />
          <div style={styles.sortWrap}>
            <span style={styles.sortLabel}>📊 เรียงตาม</span>
            <select style={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">ร้านค้าใหม่สุด</option>
              <option value="rating">ยอดนิยม (เรตติ้งสูง & รีวิวเยอะ)</option>
            </select>
            <button style={styles.mapBtn} onClick={fetchShops}>🔄 รีเฟรช</button>
          </div>
        </div>

        <div style={styles.catRow}>
          {[{key:'all', label:'ทั้งหมด'}, {key:'food', label:'🍕 อาหาร & เครื่องดื่ม'}, {key:'handmade', label:'🎨 Handmade'}, {key:'fashion', label:'👗 แฟชั่น'}, {key:'other', label:'🌿 อื่นๆ'}].map(c => (
            <button key={c.key} style={{...styles.catBtn, ...(category===c.key ? styles.catActive : {})}} onClick={() => setCategory(c.key)}>{c.label}</button>
          ))}
        </div>

        {loading ? (
          <div style={styles.empty}>⏳ กำลังโหลดข้อมูลร้านค้า...</div>
        ) : filteredShops.length === 0 ? (
          <div style={styles.empty}>❌ ไม่พบร้านค้าที่คุณค้นหา</div>
        ) : (
          <div style={styles.grid}>
            {filteredShops.map(s => {
              const isClosedToday = s.today_is_open === 0;
              return (
                <div key={s.id} style={styles.card}>
                  <div style={styles.cardImg}>
                    {s.logo_url ? <img src={s.logo_url} alt={s.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={styles.imgPlaceholder}>🛍️</div>}
                    <button style={styles.heartBtn} onClick={(e) => toggleFavoriteShop(s.id, e)}>{savedShopIds.includes(s.id) ? '❤️' : '🤍'}</button>
                    
                    {/* ป้ายมุมซ้ายบน: เปลี่ยนเป็นสีแดงทันทีถ้าวันนี้ร้านไม่มา */}
                    <span style={{
                      ...styles.availBadge, 
                      backgroundColor: isClosedToday ? '#e74c3c' : (s.tag === 'VERIFIED' ? '#1a7a4a' : '#f39c12')
                    }}>
                      {isClosedToday ? '🔴 วันนี้หยุด' : s.tag}
                    </span>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.cardTop}>
                      <h3 style={styles.cardTitle}>{s.name}</h3>
                      <div style={styles.ratingBadge}>⭐ {s.rating} ({s.review_count})</div>
                    </div>
                    <span style={{...styles.catBadge, backgroundColor: categoryColor(s.category) + '20', color: categoryColor(s.category)}}>{categoryLabel(s.category)}</span>
                    <p style={styles.cardDesc}>{s.desc}</p>
                    <div style={styles.cardFooter}>
                      {/* ป้ายสถานะล่างการ์ด: อิงตามสถานะเปิด/ปิดของวันนี้ */}
                      <div style={{
                        fontSize:'11px', fontWeight:'700', 
                        color: isClosedToday ? '#e74c3c' : (s.tag === 'VERIFIED' ? '#1a7a4a' : '#f39c12'), 
                        backgroundColor: isClosedToday ? '#fff0f0' : (s.tag === 'VERIFIED' ? '#e8f5e9' : '#fff9e6'), 
                        padding:'3px 8px', borderRadius:'20px'
                      }}>
                        {isClosedToday ? '🔴 วันนี้แจ้งไม่มา' : (s.tag === 'VERIFIED' ? '✅ VERIFIED' : '🆕 NEW')}
                      </div>
                      <Link to={`/shops/${s.id}`} style={styles.enterBtn}>ENTER SHOP</Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = { 
  page: { backgroundColor:'#f8f9fa', minHeight:'100vh', fontFamily:'Sarabun, sans-serif' },
  container: { maxWidth:'1100px', margin:'0 auto', padding:'32px 24px' },
  title: { fontSize:'24px', fontWeight:'bold', margin:'0 0 6px', color:'#222' },
  sub: { fontSize:'14px', color:'#888', margin:'0 0 20px' },
  searchRow: { display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', marginBottom:'16px', flexWrap: 'wrap' },
  searchInput: { flex:1, padding:'11px 16px', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'14px', outline:'none', minWidth: '280px' },
  sortWrap: { display:'flex', alignItems:'center', gap:'8px' },
  sortLabel: { fontSize:'13px', color:'#555', whiteSpace: 'nowrap' },
  sortSelect: { padding:'9px 12px', border:'1.5px solid #e0e0e0', borderRadius:'8px', fontSize:'13px', outline:'none', backgroundColor: '#fff' },
  mapBtn: { padding:'9px 14px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'13px', fontWeight: '600' },
  catRow: { display:'flex', gap:'8px', marginBottom:'20px', flexWrap:'wrap' },
  catBtn: { padding:'7px 16px', border:'1.5px solid #e0e0e0', borderRadius:'20px', backgroundColor:'#fff', cursor:'pointer', fontSize:'13px', color:'#555', fontWeight: '600' },
  catActive: { backgroundColor:'#1a7a4a', color:'#fff', borderColor:'#1a7a4a', fontWeight:'600' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px' },
  card: { backgroundColor:'#fff', borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #eee' },
  cardImg: { position:'relative', height:'140px', backgroundColor: '#e8f5e9' },
  imgPlaceholder: { width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'48px' },
  heartBtn: { position:'absolute', top:'10px', right:'10px', background:'rgba(255,255,255,0.9)', border:'none', borderRadius:'50%', width:'32px', height:'32px', cursor:'pointer', fontSize:'14px', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 10 },
  availBadge: { position:'absolute', top:'10px', left:'10px', color:'#fff', fontSize:'9px', padding:'3px 8px', borderRadius:'20px', fontWeight:'700' },
  cardBody: { padding:'14px' },
  cardTop: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px', gap: '8px' },
  cardTitle: { fontSize:'15px', fontWeight:'bold', margin:0, color:'#222', flex:1, lineHeight: 1.3 },
  ratingBadge: { fontSize:'12px', fontWeight:'700', color:'#f39c12', backgroundColor:'#fff9e6', padding:'4px 8px', borderRadius:'20px', flexShrink:0, display:'flex', alignItems:'center', gap:'2px' },
  catBadge: { fontSize:'11px', padding:'2px 10px', borderRadius:'20px', fontWeight:'600', display:'inline-block', marginBottom:'8px' },
  cardDesc: { fontSize:'12px', color:'#888', margin:'4px 0 12px', lineHeight:1.5, height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' },
  cardFooter: { display:'flex', justifyContent:'space-between', alignItems:'center', borderTop: '1px solid #f8f8f8', paddingTop: '12px' },
  enterBtn: { padding:'7px 14px', backgroundColor:'#222', color:'#fff', textDecoration:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'700' },
  empty: { textAlign:'center', padding:'60px', color:'#999', width: '100%', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee' },
};

export default Shops;