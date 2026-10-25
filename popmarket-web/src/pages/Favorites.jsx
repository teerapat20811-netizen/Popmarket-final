import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function Favorites() {
  const navigate = useNavigate();
  const [favoriteMarkets, setFavoriteMarkets] = useState([]);
  const [favoriteShops, setFavoriteShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // ✅ ดึง user และกำหนด Key ให้เป็น Dynamic ตาม user.id
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const FAV_MARKET_KEY = `favorite_markets_${user.id || 'guest'}`;
  const FAV_SHOP_KEY = `favorite_shops_${user.id || 'guest'}`;

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchFavoritesData();
  }, [FAV_MARKET_KEY, FAV_SHOP_KEY]); 

  const fetchFavoritesData = async () => {
    setLoading(true);
    try {
      // 1. โหลดข้อมูลตลาด
      const marketRes = await api.get('/markets');
      const savedMarketIds = JSON.parse(localStorage.getItem(FAV_MARKET_KEY) || '[]');
      setFavoriteMarkets(marketRes.data.filter(m => savedMarketIds.includes(m.id)));

      // 2. โหลดข้อมูลร้านค้า
      const shopRes = await api.get('/admin/vendors/public');
      const savedShopIds = JSON.parse(localStorage.getItem(FAV_SHOP_KEY) || '[]');
      
      const mappedShops = shopRes.data.filter(v => savedShopIds.includes(v.id)).map(v => ({
        id: v.id,
        name: v.shop_name || v.name,
        logo_url: v.logo_url || null, 
        desc: v.description || 'พบกับสินค้าดีๆ ของเราได้ในตลาดนัด',
        rating: parseFloat(v.avg_rating || 0).toFixed(1),
      }));
      setFavoriteShops(mappedShops);
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
    setLoading(false);
  };

  // ✅ ปรับฟังก์ชันลบให้ใช้ Key ใหม่
  const removeMarket = (id, e) => {
    e.preventDefault();
    if (!window.confirm('ต้องการลบตลาดนี้ออกจากรายการโปรดไหม?')) return;
    const saved = JSON.parse(localStorage.getItem(FAV_MARKET_KEY) || '[]');
    const filtered = saved.filter(favId => favId !== id);
    localStorage.setItem(FAV_MARKET_KEY, JSON.stringify(filtered));
    setFavoriteMarkets(prev => prev.filter(m => m.id !== id));
  };

  const removeShop = (id, e) => {
    e.preventDefault();
    if (!window.confirm('ต้องการลบร้านค้านี้ออกจากรายการโปรดไหม?')) return;
    const saved = JSON.parse(localStorage.getItem(FAV_SHOP_KEY) || '[]');
    const filtered = saved.filter(favId => favId !== id);
    localStorage.setItem(FAV_SHOP_KEY, JSON.stringify(filtered));
    setFavoriteShops(prev => prev.filter(s => s.id !== id));
  };

  const statusColor = (s) => ({
    active: '#1a7a4a', upcoming: '#3498db', pending: '#f39c12'
  }[s] || '#999');

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <div style={styles.breadcrumb}><span style={styles.breadActive}>❤️ SAVED FAVE</span></div>
          <h2 style={styles.title}>รายการโปรด</h2>
          <p style={styles.sub}>รวมตลาดและร้านค้าที่คุณชื่นชอบทั้งหมดไว้ที่นี่</p>

          {/* Filter Tab Selector */}
          <div style={styles.filterRow}>
            <button style={{...styles.filterBtn, ...(filter === 'all' ? styles.filterActive : {})}} onClick={() => setFilter('all')}>
              🏪 ตลาดทั้งหมด ({favoriteMarkets.length})
            </button>
            <button style={{...styles.filterBtn, ...(filter === 'shop' ? styles.filterActive : {})}} onClick={() => setFilter('shop')}>
              🛍️ ร้านค้าที่ชอบ ({favoriteShops.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div style={styles.empty}><p>⏳ กำลังโหลดรายการโปรด...</p></div>
        ) : filter === 'all' ? (
          // GRID ตลาด
          favoriteMarkets.length === 0 ? (
            <div style={styles.empty}><p>ยังไม่มีตลาดในรายการโปรด</p></div>
          ) : (
            <div style={styles.grid}>
              {favoriteMarkets.map(m => (
                <div key={m.id} style={styles.card}>
                  <div style={styles.cardImg}>
                    {m.cover_url ? <img src={m.cover_url} alt={m.name} style={styles.imgCover} /> : <div style={styles.imgEmoji}>🏪</div>}
                    <button style={styles.heartBtn} onClick={(e) => removeMarket(m.id, e)}>❤️</button>
                    <span style={{...styles.statusBadge, backgroundColor: statusColor(m.status)}}>{m.status?.toUpperCase()}</span>
                  </div>
                  <div style={styles.cardBody}>
                    <h3 style={styles.cardTitle}>{m.name}</h3>
                    <div style={styles.cardInfo}><span>📅 {m.start_date?.split('T')[0]}</span></div>
                    <div style={styles.cardInfo}><span>📍 {m.province}</span></div>
                    <Link to={`/markets/${m.id}`} style={styles.cardBtn}>VIEW MARKET MAP</Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // GRID ร้านค้า (แก้ไขให้ดึงรูปภาพแบบ Dynamic)
          favoriteShops.length === 0 ? (
            <div style={styles.empty}><p>ยังไม่มีร้านค้าในรายการโปรด</p></div>
          ) : (
            <div style={styles.grid}>
              {favoriteShops.map(s => (
                <div key={s.id} style={styles.card}>
                  
                  {/* 📸 เพิ่มการเช็คเพื่อแสดงรูปภาพโลโก้ร้านค้า */}
                  <div style={styles.cardImg}>
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} style={styles.imgCover} />
                    ) : (
                      <div style={styles.imgEmoji}>🛍️</div>
                    )}
                    <button style={styles.heartBtn} onClick={(e) => removeShop(s.id, e)}>❤️</button>
                    <span style={{...styles.statusBadge, backgroundColor: '#1a7a4a'}}>OPEN NOW</span>
                  </div>

                  <div style={styles.cardBody}>
                    <h3 style={styles.cardTitle}>{s.name}</h3>
                    <div style={styles.cardInfo}><span>⭐ Rating: {s.rating}</span></div>
                    <p style={{fontSize:'12px', color:'#888', margin:'6px 0', height: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5}}>{s.desc}</p>
                    <Link to={`/shops/${s.id}`} style={{...styles.cardBtn, backgroundColor: '#222'}}>ENTER SHOP</Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { backgroundColor:'#f8f9fa', minHeight:'100vh', fontFamily:'Sarabun, sans-serif' },
  container: { maxWidth:'1100px', margin:'0 auto', padding:'32px 24px' },
  pageHeader: { marginBottom:'24px' },
  breadcrumb: { marginBottom:'8px' },
  breadActive: { fontSize:'11px', color:'#e74c3c', fontWeight:'700', backgroundColor:'#ffe4e4', padding:'3px 10px', borderRadius:'20px' },
  title: { fontSize:'24px', fontWeight:'bold', margin:'8px 0 4px', color:'#222' },
  sub: { fontSize:'14px', color:'#888', margin:'0 0 16px' },
  filterRow: { display:'flex', gap:'8px', flexWrap:'wrap' },
  filterBtn: { padding:'7px 14px', border:'1.5px solid #e0e0e0', borderRadius:'20px', backgroundColor:'#fff', cursor:'pointer', fontSize:'13px', color:'#555', fontWeight:'600' },
  filterActive: { backgroundColor:'#1a7a4a', color:'#fff', borderColor:'#1a7a4a', fontWeight:'600' },
  empty: { textAlign:'center', padding:'60px', color:'#999', backgroundColor:'#fff', borderRadius:'12px', border:'1px solid #eee' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px' },
  card: { backgroundColor:'#fff', borderRadius:'12px', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #eee' },
  cardImg: { position:'relative', height:'180px', backgroundColor:'#e8f5e9' },
  imgEmoji: { width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'64px' },
  imgCover: { width: '100%', height: '100%', objectFit: 'cover' },
  heartBtn: { position:'absolute', top:'12px', right:'12px', background:'rgba(255,255,255,0.9)', border:'none', borderRadius:'50%', width:'36px', height:'36px', cursor:'pointer', fontSize:'16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' },
  statusBadge: { position:'absolute', top:'12px', left:'12px', color:'#fff', fontSize:'10px', padding:'3px 10px', borderRadius:'20px', fontWeight:'700' },
  cardBody: { padding:'16px' },
  cardTitle: { fontSize:'15px', fontWeight:'bold', margin:'0 0 8px', color:'#222', lineHeight: 1.4 },
  cardInfo: { fontSize:'12px', color:'#666', margin:'4px 0' },
  cardBtn: { display:'block', marginTop:'12px', padding:'10px', backgroundColor:'#1a7a4a', color:'#fff', textDecoration:'none', borderRadius:'6px', textAlign:'center', fontSize:'12px', fontWeight:'700' },
};

export default Favorites;