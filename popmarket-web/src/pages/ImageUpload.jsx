import { useState } from 'react';

/**
 * ImageUpload
 *
 * Props ใหม่ (ทั้งหมด optional — ไม่ใส่ก็ทำงานเหมือนเดิมทุกประการ):
 * - frameWidth:  ความกว้างกรอบ preview เช่น '200px', '100%' (default: '100%')
 * - frameAspectRatio: สัดส่วนกรอบ preview เช่น '1/1', '3/4' (default: ไม่กำหนด → สูงตามรูปจริง เหมือนพฤติกรรมเดิม)
 * - frameObjectFit: 'cover' | 'contain' (default: 'contain' เมื่อกำหนด aspect ratio, ไม่มีผลถ้าไม่กำหนด aspect ratio)
 *
 * ตัวอย่างใช้งานแบบเดิม (ไม่ fix กรอบ ปล่อยตามรูปจริง — เหมือน behavior เดิม 100%):
 *   <ImageUpload onUpload={...} label="อัปโหลดรูปปกตลาด" />
 *
 * ตัวอย่างใช้งานสำหรับ QR (กรอบคงที่ 3:4 ไม่ตัดเนื้อหา):
 *   <ImageUpload
 *     type="market"
 *     label="อัปโหลด QR Code"
 *     onUpload={...}
 *     frameWidth="200px"
 *     frameAspectRatio="3/4"
 *     frameObjectFit="contain"
 *   />
 */
function ImageUpload({
  onUpload,
  label = 'อัปโหลดรูปภาพ',
  type = 'market',
  frameWidth = '100%',
  frameAspectRatio = null,
  frameObjectFit = 'contain',
}) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์ใหญ่เกิน 5MB');
      return;
    }

    // แสดง preview ก่อน
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);

    // อัปโหลดจริงไป Cloudinary
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file); // field name ต้องเป็น 'image'

      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/upload/${type}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          // ไม่ต้องใส่ Content-Type — browser จะจัดการ boundary เอง
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert('อัปโหลดไม่สำเร็จ: ' + (data.message || res.status));
        setPreview(null);
        setLoading(false);
        return;
      }

      // ส่ง Cloudinary URL กลับไป
      onUpload(data.url);
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
      setPreview(null);
    }
    setLoading(false);
  };

  // ── กำหนด style กรอบ preview ─────────────────────────────────────────────
  // ถ้าไม่ส่ง frameAspectRatio มา -> ใช้ behavior เดิมเป๊ะ (height: auto, ไม่ fix กรอบ)
  const hasFixedFrame = Boolean(frameAspectRatio);

  const frameStyle = {
    position: 'relative',
    width: frameWidth,
    ...(hasFixedFrame ? { aspectRatio: frameAspectRatio } : {}),
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
    overflow: 'hidden',
    display: 'flex',
    alignItems: hasFixedFrame ? 'center' : 'flex-start',
    justifyContent: 'center',
  };

  const imgStyle = {
    width: '100%',
    height: hasFixedFrame ? '100%' : 'auto',
    objectFit: hasFixedFrame ? frameObjectFit : undefined,
    display: 'block',
    opacity: loading ? 0.5 : 1,
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      {label && (
        <div style={{ fontSize:'12px', fontWeight:'600', color:'#555', marginBottom:'6px' }}>
          {label}
        </div>
      )}

      {!preview ? (
        <label style={{
          display:'block', border:'2px dashed #ddd',
          borderRadius:'10px', cursor: loading ? 'not-allowed' : 'pointer',
          backgroundColor:'#fafafa', padding:'24px',
          textAlign:'center', transition:'border-color 0.2s',
          width: frameWidth,
          boxSizing: 'border-box',
        }}>
          <div style={{ fontSize:'28px', marginBottom:'6px' }}>📸</div>
          <div style={{ fontSize:'13px', color:'#555', fontWeight:'600' }}>
            {loading ? '⏳ กำลังอัปโหลด...' : 'คลิกเพื่อเลือกรูปภาพ'}
          </div>
          <div style={{ fontSize:'11px', color:'#aaa', marginTop:'4px' }}>
            PNG, JPG (max 5MB)
          </div>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFile}
            disabled={loading}
            style={{ display:'none' }}
          />
        </label>
      ) : (
        <div>
          <div style={frameStyle}>
            <img src={preview} alt="preview" style={imgStyle} />
            {loading && (
              <div style={{
                position:'absolute', inset:0,
                display:'flex', alignItems:'center', justifyContent:'center',
                backgroundColor:'rgba(255,255,255,0.7)',
                fontSize:'14px', fontWeight:'700', color:'#1a7a4a',
              }}>
                ⏳ กำลังอัปโหลด...
              </div>
            )}
            {!loading && (
              <div style={{
                position:'absolute', top:'8px', right:'8px',
                backgroundColor:'#1a7a4a', color:'#fff',
                fontSize:'11px', padding:'3px 8px', borderRadius:'10px', fontWeight:'700',
              }}>
                ✅ อัปโหลดแล้ว
              </div>
            )}
          </div>
          {!loading && (
            <label style={{
              display:'inline-block', marginTop:'8px',
              padding:'6px 14px', backgroundColor:'#f0f0f0',
              color:'#555', border:'none', borderRadius:'6px',
              cursor:'pointer', fontSize:'12px',
            }}>
              🔄 เปลี่ยนรูป
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                onChange={(e) => { setPreview(null); handleFile(e); }}
                style={{ display:'none' }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

export default ImageUpload;