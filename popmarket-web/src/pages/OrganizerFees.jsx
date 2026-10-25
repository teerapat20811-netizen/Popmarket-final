import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ImageUpload from '../components/ImageUpload';

function OrganizerFees() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [markets, setMarkets]       = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [settings, setSettings]     = useState({});
  const [myFeePayments, setMyFeePayments] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [slipUrl, setSlipUrl]       = useState('');
  const [sending, setSending]       = useState(false);
  const [msg, setMsg]               = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) navigate('/login');
    if (user.role !== 'organizer') navigate('/');
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [mRes, sRes, fpRes] = await Promise.all([
        api.get('/markets'),
        api.get('/admin/settings/public').catch(() => ({ data: {} })),
        api.get('/admin/fee-payments').catch(() => ({ data: [] })),
      ]);
      const myMarkets = mRes.data.filter(m => m.organizer_id === user.id);
      setMarkets(myMarkets);
      setSettings(sRes.data || {});
      setMyFeePayments(fpRes.data.filter(fp => fp.organizer_id === user.id) || []);

      // ดึง payments ของทุกตลาด
      const results = await Promise.all(
        myMarkets.map(m =>
          api.get(`/payments/market/${m.id}`)
            .then(r => r.data.map(p => ({ ...p, market_id: m.id, market_name: m.name })))
            .catch(() => [])
        )
      );
      setAllPayments(results.flat());
    } catch (err) { console.log(err); }
  };

  const submitFee = async (market, feeAmount) => {
    if (!slipUrl) return setMsg('❌ กรุณาอัปโหลดสลิปก่อน');
    setSending(true);
    try {
      await api.post('/admin/fee-payments', {
        market_id: market.id,
        amount: feeAmount,
        slip_url: slipUrl,
        period: new Date().toISOString().slice(0, 7), // YYYY-MM
      });
      setMsg('✅ ส่งหลักฐานสำเร็จ รอ Admin ยืนยัน');
      setSlipUrl('');
      setSelectedMarket(null);
      fetchAll();
    } catch (err) {
      setMsg('❌ ' + (err.response?.data?.message || 'เกิดข้อผิดพลาด'));
    }
    setSending(false);
  };

  return (
    <div style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <Link to="/organizer" style={s.backBtn}>← กลับ Dashboard</Link>
          <h1 style={s.title}>💰 ชำระค่า Platform Fee</h1>
          <p style={s.sub}>ค่าธรรมเนียมแพลตฟอร์ม 10% จากยอดที่ได้รับ</p>
        </div>

        {/* บัญชีรับเงินของ Admin */}
       {(settings.bank_name || settings.promptpay_qr) && (
  <div style={s.bankCard}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'16px' }}>
  <h3 style={{ fontSize:'14px', fontWeight:'800', color:'#222', margin:0 }}>
    📌 ช่องทางชำระเงิน
  </h3>
  <div style={{ textAlign:'right' }}>
    <div style={{ fontSize:'11px', color:'#888', marginBottom:'2px' }}>ยอดรวม Platform Fee ทุกตลาด</div>
    <div style={{ fontSize:'22px', fontWeight:'800', color:'#1a7a4a' }}>
      ฿{markets.reduce((total, m) => {
        const paid = allPayments.filter(p => p.market_id === m.id && p.status === 'paid');
        return total + paid.reduce((sum, p) => sum + Number(p.amount), 0) * 0.1;
      }, 0).toLocaleString()}
    </div>
    <div style={{ fontSize:'11px', color:'#aaa' }}>
      จาก {markets.filter(m => {
        const paid = allPayments.filter(p => p.market_id === m.id && p.status === 'paid');
        return paid.reduce((sum, p) => sum + Number(p.amount), 0) > 0;
      }).length} ตลาด
    </div>
  </div>
</div>
    <div style={s.bankGrid}>

      {(settings.bank_name || settings.bank_account || settings.bank_account_name) && (
        <div style={s.bankInfoBox}>
          {settings.bank_name && (
            <div style={s.bankRow}>
              <span style={s.bankLabel}>ธนาคาร</span>
              <span style={s.bankVal}>{settings.bank_name}</span>
            </div>
          )}
          {settings.bank_account && (
            <div style={s.bankRow}>
              <span style={s.bankLabel}>เลขบัญชี</span>
              <span style={s.bankVal}>{settings.bank_account}</span>
            </div>
          )}
          {settings.bank_account_name && (
            <div style={s.bankRow}>
              <span style={s.bankLabel}>ชื่อบัญชี</span>
              <span style={s.bankVal}>{settings.bank_account_name}</span>
            </div>
          )}
        </div>
      )}

      {settings.promptpay_qr && (
        <div style={s.qrBox}>
          <img src={settings.promptpay_qr} alt="QR PromptPay"
            style={{ width:'160px', height:'160px', objectFit:'contain',
              borderRadius:'10px', border:'1px solid #eee', display:'block' }} />
          <p style={{ fontSize:'12px', color:'#888', marginTop:'8px', textAlign:'center' }}>
            สแกน QR PromptPay
          </p>
        </div>
      )}

    </div>
   {/* ส่วนอัปโหลดสลิปรวม */}
      <div style={{ marginTop:'20px', borderTop:'1px solid #f0f0f0', paddingTop:'16px' }}>

        {myFeePayments.length > 0 && (
          <div style={{
            padding:'14px 16px', borderRadius:'10px', marginBottom:'12px',
            backgroundColor: myFeePayments.every(fp => fp.status === 'paid') ? '#e8f5e9' : '#fff9e6',
            color: myFeePayments.every(fp => fp.status === 'paid') ? '#1a7a4a' : '#f39c12',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <div>
              <div style={{ fontWeight:'700', fontSize:'14px' }}>
                {myFeePayments.every(fp => fp.status === 'paid')
                  ? '✅ ชำระเรียบร้อย — Admin ยืนยันแล้ว'
                  : '⏳ รอ Admin ตรวจสอบสลิป'}
              </div>
              <div style={{ fontSize:'12px', marginTop:'4px', opacity:0.8 }}>
                ยอดรวม ฿{myFeePayments.reduce((sum, fp) => sum + Number(fp.amount), 0).toLocaleString()}
                {' '}• {myFeePayments.length} ตลาด
              </div>
            </div>
            {myFeePayments.find(fp => fp.slip_url) && (
              <a href={myFeePayments.find(fp => fp.slip_url).slip_url}
                target="_blank" rel="noreferrer"
                style={{ fontSize:'12px', color:'#555', backgroundColor:'#fff',
                  padding:'6px 12px', borderRadius:'6px', textDecoration:'none', fontWeight:'600' }}>
                👁 ดูสลิป
              </a>
            )}
          </div>
        )}

        {markets.some(m => {
          const paid = allPayments.filter(p => p.market_id === m.id && p.status === 'paid');
          return paid.reduce((sum, p) => sum + Number(p.amount), 0) > 0 &&
            !myFeePayments.find(fp => fp.market_id === m.id);
        }) && (
          <>
            <p style={{ fontSize:'13px', color:'#555', margin:'0 0 12px', fontWeight:'600' }}>
              📎 อัปโหลดสลิปการโอนยอดรวม ฿{markets.reduce((total, m) => {
                const paid = allPayments.filter(p => p.market_id === m.id && p.status === 'paid');
                return total + paid.reduce((sum, p) => sum + Number(p.amount), 0) * 0.1;
              }, 0).toLocaleString()} ไปยัง Admin
            </p>
            <ImageUpload
              type="slip"
              label="แนบสลิปการชำระเงินรวม"
              onUpload={(url) => setSlipUrl(url)}
            />
            {slipUrl && (
              <button
                style={{ marginTop:'12px', width:'100%', padding:'12px',
                  backgroundColor: sending ? '#aaa' : '#1a7a4a',
                  color:'#fff', border:'none', borderRadius:'8px',
                  cursor: sending ? 'not-allowed' : 'pointer',
                  fontSize:'14px', fontWeight:'700' }}
                onClick={async () => {
                  setSending(true);
                  try {
                    const pending = markets.filter(m => {
                      const paid = allPayments.filter(p => p.market_id === m.id && p.status === 'paid');
                      return paid.reduce((sum, p) => sum + Number(p.amount), 0) > 0 &&
                        !myFeePayments.find(fp => fp.market_id === m.id);
                    });
                    for (const m of pending) {
                      const paid = allPayments.filter(p => p.market_id === m.id && p.status === 'paid');
                      const fee = paid.reduce((sum, p) => sum + Number(p.amount), 0) * 0.1;
                      await api.post('/admin/fee-payments', {
                        market_id: m.id, amount: fee, slip_url: slipUrl,
                        period: new Date().toISOString().slice(0, 7),
                      });
                    }
                    alert('✅ ส่งหลักฐานสำเร็จ รอ Admin ยืนยัน');
                    setSlipUrl('');
                    fetchAll();
                  } catch (err) {
                    alert('❌ ' + (err.response?.data?.message || 'เกิดข้อผิดพลาด'));
                  }
                  setSending(false);
                }}
                disabled={sending}
              >
                {sending ? '⏳ กำลังส่ง...' : '📨 ส่งหลักฐานการชำระรวม'}
              </button>
            )}
          </>
        )}
     </div>
    </div>
  )}
        {/* ตารางยอดค่า fee แต่ละตลาด */}
        {markets.map(m => {
          const paid = allPayments.filter(p => p.market_id === m.id && p.status === 'paid');
          const total = paid.reduce((sum, p) => sum + Number(p.amount), 0);
          const fee = total * 0.1;
          const submitted = myFeePayments.find(fp => fp.market_id === m.id);

          return (
            <div key={m.id} style={s.marketCard}>
              <div style={s.marketCardHeader}>
                {m.cover_url && (
                  <img src={m.cover_url} alt={m.name}
                    style={{width:'48px', height:'48px', borderRadius:'8px', objectFit:'cover', flexShrink:0}} />
                )}
                <div style={{flex:1}}>
                  <div style={s.marketName}>{m.name}</div>
                  <div style={s.marketSub}>📅 {m.start_date?.slice(0,10)} — {m.end_date?.slice(0,10)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={s.feeAmount}>฿{fee.toLocaleString()}</div>
                  <div style={s.feeLabel}>Platform Fee 10%</div>
                </div>
              </div>

              <div style={s.feeDetail}>
                <div style={s.feeRow}>
                  <span>ยอด paid รวม</span>
                  <span>฿{total.toLocaleString()}</span>
                </div>
                <div style={s.feeRow}>
                  <span>จำนวนการจอง paid</span>
                  <span>{paid.length} รายการ</span>
                </div>
                <div style={{...s.feeRow, borderTop:'1px solid #eee', paddingTop:'8px', marginTop:'4px'}}>
                  <span style={{fontWeight:'700'}}>ค่าธรรมเนียม 10%</span>
                  <span style={{fontWeight:'800', color:'#1a7a4a', fontSize:'16px'}}>฿{fee.toLocaleString()}</span>
                </div>
              </div>

            </div>
          );
        })}

        {markets.length === 0 && (
          <div style={{textAlign:'center', padding:'60px', color:'#aaa'}}>
            <p style={{fontSize:'40px'}}>🏪</p>
            <p>ยังไม่มีตลาด</p>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {

  page: { minHeight:'100vh', backgroundColor:'#f4f6f9', fontFamily:"'Sarabun', sans-serif" },

  container: { maxWidth:'720px', margin:'0 auto', padding:'32px 24px' },

  header: { marginBottom:'24px' },

  backBtn: { fontSize:'13px', color:'#1a7a4a', textDecoration:'none', fontWeight:'600' },

  title: { fontSize:'24px', fontWeight:'800', color:'#222', margin:'8px 0 4px' },

  sub: { fontSize:'13px', color:'#888', margin:0 },



  bankCard: { backgroundColor:'#fff', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'20px' },

  bankTitle: { fontSize:'14px', fontWeight:'800', color:'#222', margin:'0 0 16px' },

  bankGrid: {

  display: 'flex',

  gap: '24px',

  alignItems: 'flex-start',

  flexWrap: 'wrap',

},

bankInfoBox: {

  flex: 1,

  minWidth: '200px',

},

qrBox: {

  display: 'flex',

  flexDirection: 'column',

  alignItems: 'center',

  flexShrink: 0,

},

bankCard: {

  backgroundColor: '#fff',

  borderRadius: '14px',

  padding: '20px',

  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',

  marginBottom: '20px',

},

bankTitle: {

  fontSize: '14px', fontWeight: '800', color: '#222', margin: '0 0 16px',

},

bankGrid: {

  display: 'flex',

  gap: '24px',

  alignItems: 'flex-start',

  flexWrap: 'wrap',

},

bankInfoBox: {

  flex: 1,

  minWidth: '200px',

},

qrBox: {

  display: 'flex',

  flexDirection: 'column',

  alignItems: 'center',

  flexShrink: 0,

},

  bankRow: { display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f5f5' },

  bankLabel: { fontSize:'12px', color:'#888' },

  bankVal: { fontSize:'13px', fontWeight:'700', color:'#222' },



  marketCard: { backgroundColor:'#fff', borderRadius:'14px', padding:'20px', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', marginBottom:'16px' },

  marketCardHeader: { display:'flex', alignItems:'center', gap:'14px', marginBottom:'14px' },

  marketName: { fontSize:'15px', fontWeight:'800', color:'#222' },

  marketSub: { fontSize:'12px', color:'#888', marginTop:'2px' },

  feeAmount: { fontSize:'22px', fontWeight:'800', color:'#1a7a4a' },

  feeLabel: { fontSize:'11px', color:'#888' },



  feeDetail: { backgroundColor:'#f8f9fa', borderRadius:'8px', padding:'12px' },

  feeRow: { display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:'13px', color:'#555' },



  uploadSection: { backgroundColor:'#f8f9fa', borderRadius:'10px', padding:'16px' },

  payBtn: { width:'100%', padding:'12px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'700' },

  submitBtn: { flex:2, padding:'12px', backgroundColor:'#1a7a4a', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px', fontWeight:'700' },

  cancelBtn: { flex:1, padding:'12px', backgroundColor:'#f0f0f0', color:'#555', border:'none', borderRadius:'8px', cursor:'pointer', fontSize:'14px' },

};



export default OrganizerFees;