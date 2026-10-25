import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testLink, setTestLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setTestLink('');

    if (!email.trim()) {
      setError('กรุณากรอกอีเมลของคุณ');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(res.data.message);
      if (res.data.resetLink) {
        setTestLink(res.data.resetLink);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>🔑</div>
          <h2 style={styles.title}>ลืมรหัสผ่าน?</h2>
          <p style={styles.subtitle}>
            กรอกอีเมลที่ใช้ลงทะเบียน ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้คุณ
          </p>
        </div>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}
        {message && <div style={styles.successBox}>✅ {message}</div>}

        {/* กล่องช่วยคลิกสำหรับทดสอบในเครื่อง */}
        {testLink && (
          <div style={styles.devBox}>
            <div style={{ fontWeight: '700', marginBottom: '6px' }}>⚡ สำหรับการทดสอบ (Dev Mode):</div>
            <a href={testLink} style={styles.devLink}>
              👉 คลิกที่นี่เพื่อไปตั้งรหัสผ่านใหม่ทันที
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>อีเมลของคุณ</label>
          <input
            type="email"
            style={styles.input}
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? '⏳ กำลังดำเนินการ...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
          </button>
        </form>

        <div style={styles.footer}>
          <Link to="/login" style={styles.backLink}>
            ← กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9', fontFamily: "'Sarabun', sans-serif", padding: '20px' },
  card: { backgroundColor: '#fff', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #eee' },
  header: { textAlign: 'center', marginBottom: '24px' },
  icon: { fontSize: '40px', marginBottom: '8px' },
  title: { fontSize: '22px', fontWeight: '800', color: '#222', margin: '0 0 6px' },
  subtitle: { fontSize: '13px', color: '#777', margin: 0, lineHeight: '1.5' },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: '#444', marginBottom: '6px' },
  input: { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box', outline: 'none', backgroundColor: '#fafafa' },
  submitBtn: { width: '100%', padding: '12px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' },
  errorBox: { backgroundColor: '#fff0f0', color: '#e74c3c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid #ffd0d0' },
  successBox: { backgroundColor: '#e8f5e9', color: '#1a7a4a', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid #c8e6c9' },
  devBox: { backgroundColor: '#fff9e6', border: '1px dashed #f39c12', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#856404' },
  devLink: { color: '#1a7a4a', fontWeight: '700', textDecoration: 'none' },
  footer: { textAlign: 'center', marginTop: '20px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' },
  backLink: { fontSize: '13px', color: '#1a7a4a', textDecoration: 'none', fontWeight: '600' }
};

export default ForgotPassword;