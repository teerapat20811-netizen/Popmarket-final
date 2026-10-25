import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function Home() {
  const [featuredMarkets, setFeaturedMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchMode, setSearchMode] = useState('market'); 
  
  const [marketSearch, setMarketSearch] = useState('');
  const [marketProvince, setMarketProvince] = useState('');
  const [shopSearch, setShopSearch] = useState('');
  const [shopCategory, setShopCategory] = useState('');

  const [savedMarketIds, setSavedMarketsIds] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); 
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const FAV_KEY = `favorite_markets_${user.id || 'guest'}`;

  const handleMarketSearch = () => {
    navigate(`/markets?search=${marketSearch}&province=${marketProvince}`);
  };

  const handleShopSearch = () => {
    navigate(`/shops?search=${shopSearch}&category=${shopCategory}`);
  };

  useEffect(() => {
    const savedIds = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    setSavedMarketsIds(savedIds);

    api.get('/markets').then(res => {
      setFeaturedMarkets(res.data.slice(0, 4));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [FAV_KEY]);

  const toggleFavorite = (marketId, e) => {
    e.preventDefault();
    const currentFavs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    let newFavs;
    if (currentFavs.includes(marketId)) {
      newFavs = currentFavs.filter(id => id !== marketId);
    } else {
      newFavs = [...currentFavs, marketId];
    }
    localStorage.setItem(FAV_KEY, JSON.stringify(newFavs));
    setSavedMarketsIds(newFavs);
  };

  const statusColor = (s) => ({
    active: '#1a7a4a', upcoming: '#3498db', pending: '#f39c12'
  }[s] || '#999');

  const statusLabel = (s) => ({
    active: 'ACTIVE', upcoming: 'UPCOMING', pending: 'PENDING', closed: 'CLOSED'
  }[s] || s?.toUpperCase());

  return (
    <div style={styles.page}>

      {user.role === 'pending_vendor' && (
        <div style={{ backgroundColor: '#fff9e6', borderBottom: '1px solid #fce5a0', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          <span style={{ fontSize: '13px', color: '#b78103', fontWeight: '700' }}>
            ⏳ บัญชีร้านค้าของคุณอยู่ระหว่างรอการอนุมัติจาก Admin
          </span>
          <Link to="/pending-vendor" style={{ fontSize: '13px', backgroundColor: '#f39c12', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>
            ตรวจสอบสถานะใบสมัคร →
          </Link>
        </div>
      )}

      {/* ===== HERO ===== */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.heroLeft}>
            <h1 style={styles.heroTitle}>
              ค้นพบ{' '}
              <span style={styles.heroHighlight}>ตลาดป๊อปอัพ</span>
              <br />ที่น่าตื่นตาตื่นใจ
            </h1>
            <p style={styles.heroSub}>
              #แพลตฟอร์มจองพื้นที่ขายในตลาดนัดออนไลน์
            </p>

            <div style={styles.tabToggleRow}>
              <button 
                style={{
                  ...styles.tabToggleBtn,
                  backgroundColor: searchMode === 'market' ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: searchMode === 'market' ? '#1a7a4a' : '#fff'
                }}
                onClick={() => setSearchMode('market')}
              >
                🏪 ค้นหาตลาด
              </button>
              <button 
                style={{
                  ...styles.tabToggleBtn,
                  backgroundColor: searchMode === 'shop' ? '#fff' : 'rgba(255,255,255,0.2)',
                  color: searchMode === 'shop' ? '#1a7a4a' : '#fff'
                }}
                onClick={() => setSearchMode('shop')}
              >
                🏷️ ค้นหาร้านค้า
              </button>
            </div>

            {searchMode === 'market' && (
              <div style={styles.searchBar}>
                <input
                  style={styles.searchInput}
                  placeholder="🔍 ค้นหาชื่อตลาด..."
                  value={marketSearch}
                  onChange={e => setMarketSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleMarketSearch()}
                />
                
                <div style={styles.searchDivider} />
                
                <select
                  style={styles.searchSelect}
                  value={marketProvince}
                  onChange={e => setMarketProvince(e.target.value)}
                >
                  <option value="">📍 จังหวัดทั้งหมด</option>
                  <option value="กรุงเทพ">กรุงเทพ</option>
                  <option value="เชียงใหม่">เชียงใหม่</option>
                  <option value="พิษณุโลก">พิษณุโลก</option>
                  <option value="อุตรดิตถ์">อุตรดิตถ์</option>
                </select>

                <button style={styles.searchBtn} onClick={handleMarketSearch}>
                  ค้นหาตลาด
                </button>
              </div>
            )}

            {searchMode === 'shop' && (
              <div style={styles.searchBar}>
                <input
                  style={styles.searchInput}
                  placeholder="🔍 ค้นหาชื่อร้านค้า..."
                  value={shopSearch}
                  onChange={e => setShopSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleShopSearch()}
                />

                <div style={styles.searchDivider} />

                <select
                  style={styles.searchSelect}
                  value={shopCategory}
                  onChange={e => setShopCategory(e.target.value)}
                >
                  <option value="">🏷️ หมวดหมู่ร้านค้า</option>
                  <option value="food">🍕 อาหาร / เครื่องดื่ม</option>
                  <option value="handmade">🎨 แฮนด์เมด / งานฝีมือ</option>
                  <option value="fashion">👗 แฟชั่น / เสื้อผ้า</option>
                  <option value="other">📦 เบ็ดเตล็ด / อื่นๆ</option>
                </select>

                <button style={styles.searchBtn} onClick={handleShopSearch}>
                  ค้นหาร้านค้า
                </button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ===== CATEGORY ICONS (เอาการ์ดข้อความแชทออกแล้ว) ===== */}
      <div style={styles.catSection}>
        <div style={styles.catWrap}>
          <Link to="/favorites" style={styles.catLink}>
            <div style={styles.catItem}>
              <div style={{...styles.catIcon, backgroundColor:'#fff0f0'}}>
                <span style={styles.catEmoji}>❤️</span>
              </div>
              <span style={styles.catLabel}>รายการโปรด</span>
              <span style={styles.catSub}>ตลาดที่ชื่นชอบ</span>
            </div>
          </Link>
          <Link to="/shops" style={styles.catLink}>
            <div style={styles.catItem}>
              <div style={{...styles.catIcon, backgroundColor:'#f0f4ff'}}>
                <span style={styles.catEmoji}>🏪</span>
              </div>
              <span style={styles.catLabel}>ร้านค้า</span>
              <span style={styles.catSub}>ค้นหาร้านค้าที่ชอบ</span>
            </div>
          </Link>
          <Link to="/markets" style={styles.catLink}>
            <div style={styles.catItem}>
              <div style={{...styles.catIcon, backgroundColor:'#fffbf0'}}>
                <span style={styles.catEmoji}>⭐</span>
              </div>
              <span style={styles.catLabel}>ตลาดยอดนิยม</span>
              <span style={styles.catSub}>ยอดนิยมในพื้นที่</span>
            </div>
          </Link>
          <Link to="/nearme" style={styles.catLink}>
            <div style={styles.catItem}>
              <div style={{...styles.catIcon, backgroundColor:'#f0fff4'}}>
                <span style={styles.catEmoji}>📍</span>
              </div>
              <span style={styles.catLabel}>ตลาดนัดใกล้ฉัน</span>
              <span style={styles.catSub}>ค้นหาตามพื้นที่</span>
            </div>
          </Link>
        </div>
      </div>

      {/* ===== FEATURED MARKETS ===== */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>ตลาดแนะนำ (Featured)</h2>
            <p style={styles.sectionSub}>
              ตลาดนัดยอดนิยมที่น่าสนใจในขณะนี้
            </p>
          </div>
          <div style={styles.sectionNav}>
            <button style={styles.navDot}>‹</button>
            <button style={styles.navDot}>›</button>
            <Link to="/markets" style={styles.seeAll}>ดูทั้งหมด →</Link>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingBox}>
            <div style={styles.loadingSpinner}>⏳</div>
            <p>กำลังโหลดตลาด...</p>
          </div>
        ) : featuredMarkets.length === 0 ? (
          <div style={styles.emptyBox}>
            <p style={{fontSize:'48px', margin:'0 0 16px'}}>🏪</p>
            <p style={{color:'#999', marginBottom:'16px'}}>ยังไม่มีตลาดในระบบ</p>
            
            {(user.role === 'admin' || user.role === 'organizer') && (
              <Link to="/organizer" style={styles.emptyBtn}>
                สร้างตลาดแรก
              </Link>
            )}
          </div>
        ) : (
          <div style={styles.marketGrid}>
            {featuredMarkets.map(m => {
              const isLiked = savedMarketIds.includes(m.id);

              return (
                <div key={m.id} style={styles.marketCard}>
                  <div 
                    style={{ ...styles.marketCardImg, cursor: 'pointer' }} 
                    onClick={() => m.cover_url && setSelectedImage(m.cover_url)}
                  >
                    {m.cover_url ? (
                      <img 
                        src={m.cover_url} 
                        alt={m.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <div style={styles.marketCardEmoji}>🏪</div>
                    )}
                    
                    <div style={styles.marketCardOverlay}>
                      <span style={{
                        ...styles.marketStatusBadge,
                        backgroundColor: statusColor(m.status),
                      }}>
                        {statusLabel(m.status)}
                      </span>
                    </div>
                    
                    <button 
                      style={styles.heartBtnCard} 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(m.id, e);
                      }}
                    >
                      {isLiked ? '❤️' : '🤍'}
                    </button>
                  </div>

                  <div style={styles.marketCardBody}>
                    <h3 style={styles.marketCardTitle}>{m.name}</h3>
                    
                    <div style={styles.ratingBox}>
                      {m.avg_rating > 0 ? (
                        <>
                          <span style={styles.starIcon}>⭐</span>
                          <span style={styles.ratingText}>
                            {m.avg_rating.toFixed(1)} ({m.review_count} รีวิว)
                          </span>
                        </>
                      ) : (
                        <span style={{ ...styles.ratingText, color: '#999' }}>ยังไม่มีรีวิว</span>
                      )}
                    </div>

                    <div style={styles.marketCardInfo}>
                      <span style={styles.infoIcon}>📅</span>
                      <span>{m.start_date?.split('T')[0] || m.start_date} — {m.end_date?.split('T')[0] || m.end_date}</span>
                    </div>
                    <div style={styles.marketCardInfo}>
                      <span style={styles.infoIcon}>📍</span>
                      <span>{m.address || m.province || 'ไม่ระบุที่อยู่'}</span>
                    </div>
                    <Link to={`/markets/${m.id}`} style={styles.marketCardBtn}>
                      ดูรายละเอียดตลาด
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== FOOTER ===== */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLeft}>
            <div style={styles.footerLogo}>🛒 PopMarket</div>
            <p style={styles.footerDesc}>
              แพลตฟอร์มจองพื้นที่ตลาดนัดออนไลน์<br />
              เชื่อมต่อผู้ขายและตลาดนัด
            </p>
          </div>
          <div style={styles.footerLinks}>
            <div style={styles.footerCol}>
              <p style={styles.footerColTitle}>เกี่ยวกับแพลตฟอร์ม</p>
              <p style={styles.footerLink}>วิธีการใช้งาน</p>
              <p style={styles.footerLink}>ติดต่อเรา</p>
              <p style={styles.footerLink}>นโยบายความเป็นส่วนตัว</p>
            </div>
            <div style={styles.footerCol}>
              <p style={styles.footerColTitle}>สำหรับผู้ขาย</p>
              <p style={styles.footerLink}>จองพื้นที่ขาย</p>
              <p style={styles.footerLink}>ประวัติการจอง</p>
              <p style={styles.footerLink}>โปรไฟล์ร้านค้า</p>
            </div>
            <div style={styles.footerCol}>
              <p style={styles.footerColTitle}>สำหรับตลาด</p>
              <p style={styles.footerLink}>ลงทะเบียนตลาด</p>
              <p style={styles.footerLink}>จัดการล็อค</p>
              <p style={styles.footerLink}>รายงานสถิติ</p>
            </div>
          </div>
        </div>
        <div style={styles.footerBottom}>
          © 2026 PopMarket Platform — Community Built
        </div>
      </footer>

      {/* Modal สำหรับแสดงรูปภาพแบบเต็มจอ */}
      {selectedImage && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 9999,
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

const styles = {
  page: { fontFamily: "'Sarabun', sans-serif", backgroundColor: '#f8f9fa', minHeight: '100vh' },
  hero: { background: 'linear-gradient(135deg, #0d5c36 0%, #1a7a4a 50%, #27ae60 100%)', minHeight: '380px', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' },
  heroInner: { maxWidth: '1150px', margin: '0 auto', padding: '60px 32px', width: '100%' },
  heroLeft: { maxWidth: '720px' },
  heroTitle: { fontSize: '44px', fontWeight: '800', color: '#fff', lineHeight: 1.25, margin: '0 0 16px', textShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  heroHighlight: { color: '#f9e547', textDecoration: 'underline', textDecorationColor: 'rgba(249,229,71,0.4)' },
  heroSub: { fontSize: '15px', color: 'rgba(255,255,255,0.85)', margin: '0 0 20px', lineHeight: 1.6 },
  
  tabToggleRow: { display: 'flex', gap: '8px', marginBottom: '0px' },
  tabToggleBtn: { padding: '8px 18px', border: 'none', borderRadius: '8px 8px 0 0', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },

  searchBar: { display: 'flex', backgroundColor: '#fff', borderRadius: '0 12px 12px 12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', width: '100%', maxWidth: '680px' },
  searchInput: { flex: 1, padding: '14px 16px', border: 'none', outline: 'none', fontSize: '13px', color: '#333', minWidth: '140px' },
  searchDivider: { width: '1px', backgroundColor: '#eee', margin: '10px 0' },
  searchSelect: { padding: '14px 14px', border: 'none', outline: 'none', fontSize: '13px', color: '#555', cursor: 'pointer', backgroundColor: '#fff', minWidth: '160px' },
  searchBtn: { padding: '14px 24px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' },

  catSection: { backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  catWrap: { maxWidth: '1100px', margin: '0 auto', padding: '24px 32px', display: 'flex', gap: '8px', justifyContent: 'center' },
  catLink: { textDecoration: 'none', flex: 1, maxWidth: '200px' },
  catItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '16px 8px', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s', backgroundColor: '#fafafa', border: '1px solid #f0f0f0' },
  catIcon: { width: '52px', height: '52px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  catEmoji: { fontSize: '22px' },
  catLabel: { fontSize: '13px', fontWeight: '700', color: '#222', textAlign: 'center' },
  catSub: { fontSize: '11px', color: '#999', textAlign: 'center' },
  section: { maxWidth: '1100px', margin: '0 auto', padding: '40px 32px' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' },
  sectionTitle: { fontSize: '20px', fontWeight: '800', color: '#222', margin: '0 0 4px' },
  sectionSub: { fontSize: '13px', color: '#888', margin: 0 },
  sectionNav: { display: 'flex', alignItems: 'center', gap: '8px' },
  navDot: { width: '32px', height: '32px', border: '1.5px solid #ddd', borderRadius: '50%', backgroundColor: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  seeAll: { fontSize: '13px', color: '#1a7a4a', textDecoration: 'none', fontWeight: '600' },
  loadingBox: { textAlign: 'center', padding: '60px', color: '#999' },
  loadingSpinner: { fontSize: '32px', marginBottom: '8px' },
  emptyBox: { textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: '12px' },
  emptyBtn: { display: 'inline-block', padding: '10px 20px', backgroundColor: '#1a7a4a', color: '#fff', textDecoration: 'none', borderRadius: '6px' },
  marketGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' },
  marketCard: { backgroundColor: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.08)', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' },
  marketCardImg: { height: '160px', position: 'relative', backgroundColor: '#e8f5e9' },
  marketCardEmoji: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '52px' },
  marketCardOverlay: { position: 'absolute', top: '10px', left: '10px' },
  marketStatusBadge: { fontSize: '10px', color: '#fff', padding: '3px 10px', borderRadius: '20px', fontWeight: '700' },
  heartBtnCard: { position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  marketCardBody: { padding: '14px' },
  marketCardTitle: { fontSize: '15px', fontWeight: '700', margin: '0 0 8px', color: '#222', lineHeight: 1.3 },
  ratingBox: { display: 'flex', alignItems: 'center', gap: '4px', margin: '6px 0 8px' },
  starIcon: { color: '#f1c40f', fontSize: '14px' },
  ratingText: { fontSize: '12px', fontWeight: '600', color: '#444' },
  marketCardInfo: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666', margin: '4px 0' },
  infoIcon: { fontSize: '12px' },
  marketCardBtn: { display: 'block', marginTop: '12px', padding: '9px', backgroundColor: '#1a7a4a', color: '#fff', textDecoration: 'none', borderRadius: '6px', textAlign: 'center', fontSize: '12px', fontWeight: '700' },
  footer: { backgroundColor: '#fff', borderTop: '1px solid #eee', marginTop: '20px' },
  footerInner: { maxWidth: '1100px', margin: '0 auto', padding: '40px 32px', display: 'flex', gap: '40px', justifyContent: 'space-between' },
  footerLeft: { maxWidth: '280px' },
  footerLogo: { fontSize: '20px', fontWeight: '800', color: '#1a7a4a', marginBottom: '10px' },
  footerDesc: { fontSize: '13px', color: '#888', lineHeight: 1.6, margin: 0 },
  footerLinks: { display: 'flex', gap: '48px' },
  footerCol: {},
  footerColTitle: { fontSize: '13px', fontWeight: '700', color: '#333', margin: '0 0 12px' },
  footerLink: { fontSize: '13px', color: '#888', margin: '6px 0', cursor: 'pointer' },
  footerBottom: { textAlign: 'center', padding: '16px', borderTop: '1px solid #f0f0f0', fontSize: '12px', color: '#bbb' },
};

export default Home;