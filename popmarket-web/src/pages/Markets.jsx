import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';

function Markets() {
  const [markets, setMarkets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [searchParams] = useSearchParams();
  
  // ✅ ดึง user และกำหนด Key แยกตาม user.id
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const FAV_MARKET_KEY = `favorite_markets_${user.id || 'guest'}`;
  
  // ✅ เก็บไอดีตลาดนัดที่ชอบโดยอ้างอิงจาก Key
  const [savedMarketIds, setSavedMarketIds] = useState([]);

  useEffect(() => {
    const q = searchParams.get('search') || '';
    const p = searchParams.get('province') || '';
    setSearch(q);
    setProvince(p);
    
    // ✅ ดึงไอดีตลาดที่ชอบจาก Key ของ User นั้นๆ
    const savedIds = JSON.parse(localStorage.getItem(FAV_MARKET_KEY) || '[]');
    setSavedMarketIds(savedIds);

    api.get('/markets').then(res => {
      setMarkets(res.data);
      setFiltered(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [searchParams, FAV_MARKET_KEY]); // เพิ่ม FAV_MARKET_KEY เข้าไปใน dependency

  // ✅ ฟังก์ชันสลับการบันทึกถูกใจตลาดโดยใช้ Key ที่ถูกต้อง
  const toggleFavoriteMarket = (marketId, e) => {
    e.preventDefault();
    const currentFavs = JSON.parse(localStorage.getItem(FAV_MARKET_KEY) || '[]');
    let newFavs;

    if (currentFavs.includes(marketId)) {
      newFavs = currentFavs.filter(id => id !== marketId);
    } else {
      newFavs = [...currentFavs, marketId];
    }

    localStorage.setItem(FAV_MARKET_KEY, JSON.stringify(newFavs));
    setSavedMarketIds(newFavs);
  };

  useEffect(() => {
    let result = [...markets];
    if (search) result = result.filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.province || '').toLowerCase().includes(search.toLowerCase())
    );
    if (province) result = result.filter(m => m.province === province);
    
    if (sortBy === 'newest') {
      result.sort((a, b) => b.id - a.id);
    } else if (sortBy === 'popular') {
      result.sort((a, b) => parseFloat(b.avg_rating || 0) - parseFloat(a.avg_rating || 0));
    }
    
    setFiltered(result);
  }, [search, province, sortBy, markets]);

  const statusColor = (s) => ({
    active: '#1a7a4a', upcoming: '#3498db', pending: '#f39c12', closed: '#999', suspended: '#e74c3c'
  }[s] || '#999');

  const statusLabel = (s) => ({
    active: 'ACTIVE', upcoming: 'UPCOMING', pending: 'PENDING', closed: 'CLOSED'
  }[s] || s?.toUpperCase());

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <div style={styles.headerInner}>
          <div style={styles.breadcrumb}>
            <Link to="/" style={styles.breadLink}>หน้าแรก</Link>
            <span style={styles.breadSep}>/</span>
            <span style={styles.breadCurrent}>ตลาดยอดนิยม</span>
          </div>
          <h1 style={styles.pageTitle}>ตลาดยอดนิยม</h1>
          <p style={styles.pageSub}>ค้นพบตลาดนัดป๊อปอัพที่น่าสนใจในพื้นที่ของคุณ</p>
        </div>
      </div>

      <div style={styles.container}>
        <div style={styles.filterBar}>
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>🔍</span>
            <input style={styles.searchInput} placeholder="ค้นหาชื่อตลาด หรือจังหวัด..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select style={styles.select} value={province} onChange={e => setProvince(e.target.value)}>
            <option value="">📍 จังหวัดทั้งหมด</option>
            <option value="กรุงเทพ">กรุงเทพ</option>
            <option value="เชียงใหม่">เชียงใหม่</option>
            <option value="พิษณุโลก">พิษณุโลก</option>
            <option value="อุตรดิตถ์">อุตรดิตถ์</option>
          </select>
          <select style={styles.select} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="newest">ใหม่สุด</option>
            <option value="popular">ยอดนิยม</option>
          </select>
        </div>

        {!loading && (
          <p style={styles.resultCount}>พบ <strong>{filtered.length}</strong> ตลาด</p>
        )}

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.loadingEmoji}>⏳</div>
            <p>กำลังโหลดตลาด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={styles.emptyEmoji}>🏪</p>
            <h3 style={styles.emptyTitle}>ไม่พบตลาดที่ค้นหา</h3>
            <button style={styles.clearBtn} onClick={() => { setSearch(''); setProvince(''); }}>ล้างการค้นหา</button>
          </div>
        ) : (
          <div style={styles.grid}>
            {filtered.map(m => {
              const isLiked = savedMarketIds.includes(m.id);
              const marketRating = parseFloat(m.avg_rating || 0).toFixed(1);

              return (
                <div key={m.id} style={styles.card}>
                  <div style={styles.cardImg}>
                    {m.cover_url ? (
                      <img src={m.cover_url} alt={m.name} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                    ) : (
                      <div style={styles.cardImgInner}>🏪</div>
                    )}
                    <div style={styles.cardImgOverlay}>
                      <span style={{...styles.statusBadge, backgroundColor: statusColor(m.status)}}>{statusLabel(m.status)}</span>
                    </div>
                    
                    <button style={styles.heartBtn} onClick={(e) => toggleFavoriteMarket(m.id, e)}>
                      {isLiked ? '❤️' : '🤍'}
                    </button>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.cardMeta}>
                      <span style={styles.cardOrg}>จัดโดย {m.organizer_name}</span>
                      <span style={styles.marketRating}>
                        ⭐ {marketRating > 0 ? marketRating : 'ไม่มีรีวิว'} 
                        {m.review_count > 0 && ` (${m.review_count})`}
                      </span>
                    </div>
                    
                    <h3 style={styles.cardTitle}>{m.name}</h3>
                    <div style={styles.cardInfoRow}>
                      <div style={styles.cardInfoItem}>
                        <span style={styles.cardInfoIcon}>📅</span>
                        <span style={styles.cardInfoText}>
                          {m.start_date?.split('T')[0] || m.start_date} — {m.end_date?.split('T')[0] || m.end_date}
                        </span>
                      </div>
                      <div style={styles.cardInfoItem}><span style={styles.cardInfoIcon}>📍</span><span style={styles.cardInfoText}>{m.address || m.province || 'ไม่ระบุ'}</span></div>
                    </div>
                    {m.description && <p style={styles.cardDesc}>{m.description.slice(0, 70)}...</p>}
                    <Link to={`/markets/${m.id}`} style={styles.cardBtn}>SEE DETAILS</Link>
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
  page: { backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: "'Sarabun', sans-serif" },
  pageHeader: { backgroundColor: '#fff', borderBottom: '1px solid #eee', padding: '32px 0 24px' },
  headerInner: { maxWidth: '1100px', margin: '0 auto', padding: '0 32px' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' },
  breadLink: { fontSize: '13px', color: '#1a7a4a', textDecoration: 'none' },
  breadSep: { color: '#ccc', fontSize: '13px' },
  breadCurrent: { fontSize: '13px', color: '#888' },
  pageTitle: { fontSize: '28px', fontWeight: '800', color: '#222', margin: '0 0 6px' },
  pageSub: { fontSize: '14px', color: '#888', margin: 0 },
  container: { maxWidth: '1100px', margin: '0 auto', padding: '24px 32px' },
  filterBar: { display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  searchWrap: { flex: 1, display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1.5px solid #e8e8e8', borderRadius: '10px', padding: '0 16px', minWidth: '200px' },
  searchIcon: { fontSize: '16px', marginRight: '8px' },
  searchInput: { flex: 1, padding: '11px 0', border: 'none', outline: 'none', fontSize: '14px', backgroundColor: 'transparent' },
  select: { padding: '11px 16px', border: '1.5px solid #e8e8e8', borderRadius: '10px', fontSize: '13px', outline: 'none', cursor: 'pointer', backgroundColor: '#fff', color: '#333' },
  resultCount: { fontSize: '13px', color: '#888', margin: '0 0 16px' },
  loadingBox: { textAlign: 'center', padding: '80px', color: '#999' },
  loadingEmoji: { fontSize: '40px', marginBottom: '12px' },
  emptyBox: { textAlign: 'center', padding: '80px', backgroundColor: '#fff', borderRadius: '16px' },
  emptyEmoji: { fontSize: '48px', margin: '0 0 12px' },
  emptyTitle: { fontSize: '18px', fontWeight: '700', color: '#333', margin: '0 0 6px' },
  clearBtn: { padding: '10px 20px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' },
  card: { backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', transition: 'transform 0.15s, box-shadow 0.15s' },
  cardImg: { position: 'relative', height: '190px', backgroundColor: '#e8f5e9' },
  cardImgInner: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '60px' },
  cardImgOverlay: { position: 'absolute', top: '12px', left: '12px' },
  statusBadge: { fontSize: '10px', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: '700', letterSpacing: '0.5px' },
  heartBtn: { position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 5 },
  cardBody: { padding: '16px' },
  cardMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  cardOrg: { fontSize: '11px', color: '#1a7a4a', fontWeight: '600' },
  marketRating: { fontSize: '12px', fontWeight: '700', color: '#f39c12' },
  cardTitle: { fontSize: '16px', fontWeight: '800', color: '#222', margin: '4px 0 10px', lineHeight: 1.3 },
  cardInfoRow: { display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' },
  cardInfoItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  cardInfoIcon: { fontSize: '12px', flexShrink: 0 },
  cardInfoText: { fontSize: '12px', color: '#666' },
  cardDesc: { fontSize: '12px', color: '#888', lineHeight: 1.5, margin: '0 0 10px' },
  cardBtn: { display: 'block', padding: '10px', backgroundColor: '#1a7a4a', color: '#fff', textDecoration: 'none', borderRadius: '8px', textAlign: 'center', fontSize: '12px', fontWeight: '700', letterSpacing: '0.5px' },
};

export default Markets;