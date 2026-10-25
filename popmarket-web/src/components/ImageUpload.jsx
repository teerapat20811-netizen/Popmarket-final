import { useState } from 'react';
import axios from 'axios';

function ImageUpload({ onUpload, onUploadSuccess, label = 'อัปโหลดรูปภาพ', type = 'shop' }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('ไฟล์ใหญ่เกิน 5MB');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('token');
      
      // 🚀 เช็คว่าถ้าไม่มี Token (กำลังสมัครสมาชิก) หรือเป็นประเภทที่เปิดสาธารณะ ให้ใช้พาท /register/...
      const isRegistering = !token; 
      const uploadPath = isRegistering 
        ? `http://localhost:5000/api/upload/register/${type}` 
        : `http://localhost:5000/api/upload/${type}`;

      const headers = {
        'Content-Type': 'multipart/form-data',
      };
      
      // แนบ Token เฉพาะกรณีที่มี Token อยู่แล้วเท่านั้น
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await axios.post(uploadPath, formData, { headers });

      const url = res.data.url;
      if (onUpload) onUpload(url);
      if (onUploadSuccess) onUploadSuccess(url);

    } catch (err) {
      setError('อัปโหลดไม่สำเร็จ กรุณาลองใหม่');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{fontSize:'12px',fontWeight:'600',color:'#555',marginBottom:'6px'}}>
        {label}
      </div>
      {!preview ? (
        <label style={{
          display:'block', border:'2px dashed #ddd',
          borderRadius:'10px', cursor:'pointer',
          backgroundColor:'#fafafa', padding:'24px',
          textAlign:'center',
        }}>
          <div style={{fontSize:'28px',marginBottom:'6px'}}>📸</div>
          <div style={{fontSize:'13px',color:'#555',fontWeight:'600'}}>
            {loading ? '⏳ กำลังอัปโหลด...' : 'คลิกเพื่อเลือกรูปภาพ'}
          </div>
          <div style={{fontSize:'11px',color:'#aaa',marginTop:'4px'}}>PNG, JPG (max 5MB)</div>
          <input type="file" accept="image/png, image/jpeg, image/jpg"
            onChange={handleFile} style={{display:'none'}} disabled={loading} />
        </label>
      ) : (
        <div>
          <img src={preview} alt="preview"
            style={{width:'100%',height:'120px',objectFit:'contain',borderRadius:'8px',display:'block',marginBottom:'8px'}} />
          <button style={{padding:'6px 14px',backgroundColor:'#f0f0f0',color:'#555',border:'none',borderRadius:'6px',cursor:'pointer',fontSize:'12px'}}
            onClick={(e) => { e.preventDefault(); setPreview(null); }}>
            เปลี่ยนรูป
          </button>
        </div>
      )}
      {error && <p style={{color:'red',fontSize:'12px',marginTop:'6px'}}>{error}</p>}
    </div>
  );
}

export default ImageUpload;