import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('ไม่พบรหัส Token สำหรับรีเซ็ต กรุณากดขอลิงก์ใหม่อีกครั้ง');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('กรุณากรอกรหัสผ่านให้ครบทั้งสองช่อง');
      return;
    }

    if (newPassword.length < 6) {
      setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: token,
        new_password: newPassword
      });
      alert(res.data.message);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>🔒</div>
          <h2 style={styles.title}>ตั้งรหัสผ่านใหม่</h2>
          <p style={styles.subtitle}>กรุณากำหนดรหัสผ่านใหม่ที่คุณต้องการใช้เข้าสู่ระบบ</p>
        </div>

        {error && <div style={styles.errorBox}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>รหัสผ่านใหม่ *</label>
          <input
            type="password"
            style={styles.input}
            placeholder="•••••••• (อย่างน้อย 6 ตัวอักษร)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={loading}
          />

          <label style={styles.label}>ยืนยันรหัสผ่านใหม่ *</label>
          <input
            type="password"
            style={styles.input}
            placeholder="•••••••• (กรอกให้ตรงกัน)"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />

          <button
            type="submit"
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? '⏳ กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          </button>
        </form>

        <div style={styles.footer}>
          <Link to="/login" style={styles.backLink}>
            ← ยกเลิกและกลับไปหน้าเข้าสู่ระบบ
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
  input: { width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #e0e0e0', fontSize: '14px', marginBottom: '14px', boxSizing: 'border-box', outline: 'none', backgroundColor: '#fafafa' },
  submitBtn: { width: '100%', padding: '12px', backgroundColor: '#1a7a4a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '6px' },
  errorBox: { backgroundColor: '#fff0f0', color: '#e74c3c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid #ffd0d0' },
  footer: { textAlign: 'center', marginTop: '20px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' },
  backLink: { fontSize: '13px', color: '#666', textDecoration: 'none', fontWeight: '600' }
};

export default ResetPassword;