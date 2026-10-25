import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      setError('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      const role = res.data.user.role;
      if (role === 'vendor') navigate('/vendor');
      else if (role === 'pending_vendor') navigate('/pending-vendor');
      else if (role === 'pending_organizer') navigate('/pending');
      else if (role === 'organizer') navigate('/organizer');
      else if (role === 'admin') navigate('/admin');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาด');
    }
    setLoading(false);
  };

  return (
    <div style={styles.page}>
      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <div style={styles.leftContent}>
          <Link to="/" style={styles.backBtn}>← กลับหน้าหลัก</Link>
          <div style={styles.leftLogo}>
            <span style={styles.logoIcon}>🛒</span>
            <span style={styles.logoText}>PopMarket</span>
          </div>
          <h2 style={styles.leftTitle}>ยินดีต้อนรับกลับ!</h2>
          <p style={styles.leftSub}>
            แพลตฟอร์มจองพื้นที่ตลาดนัดออนไลน์<br />
            ที่ใหญ่ที่สุดในประเทศไทย
          </p>
          <div style={styles.featureList}>
            {['🏪 ตลาดนัดกว่า 100 แห่ง', '🔖 จองง่าย ปลอดภัย', '📊 ติดตามสถานะแบบ Real-time'].map((f, i) => (
              <div key={i} style={styles.featureItem}>{f}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.rightPanel}>
        <div style={styles.formBox}>
          <h2 style={styles.formTitle}>เข้าสู่ระบบ</h2>
          <p style={styles.formSub}>ยินดีต้อนรับกลับมาสู่ PopMarket</p>

          {error && (
            <div style={styles.errorBox}>
              ⚠️ {error}
            </div>
          )}

          {/* Email */}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>อีเมล / เบอร์โทรศัพท์</label>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>✉️</span>
              <input
                style={styles.input}
                placeholder="example@email.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
            </div>
          </div>

          {/* Password */}
          <div style={styles.fieldWrap}>
            <div style={styles.labelRow}>
              <label style={styles.label}>รหัสผ่าน</label>
            </div>
            <div style={styles.inputWrap}>
              <span style={styles.inputIcon}>🔒</span>
              <input
                style={styles.input}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <span
                style={styles.eyeIcon}
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? '🙈' : '👁️'}

              </span>
              
            </div>
          </div>
          <div style={{ textAlign: 'right', marginBottom: '16px' }}>
  <Link to="/forgot-password" style={{ fontSize: '12px', color: '#1a7a4a', fontWeight: '600', textDecoration: 'none' }}>
    ลืมรหัสผ่าน?
  </Link>
</div>

          {/* Submit */}
          <button
            style={{...styles.submitBtn, opacity: loading ? 0.75 : 1}}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '⏳ กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>

          {/* Register Link */}
          <p style={styles.registerRow}>
            ยังไม่มีบัญชี?{' '}
            <Link to="/register" style={styles.registerLink}>
              สมัครสมาชิก
            </Link>
          </p>
        </div>
        <p style={styles.copyright}>© 2026 POPMARKET PLATFORM</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Sarabun', sans-serif",
  },

  // Left Panel
  leftPanel: {
    flex: '0 0 420px',
    background: 'linear-gradient(160deg, #0d5c36 0%, #1a7a4a 60%, #27ae60 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  leftContent: { width: '100%', maxWidth: '320px' },
  backBtn: {
    display: 'inline-block',
    color: 'rgba(255,255,255,0.7)',
    textDecoration: 'none',
    fontSize: '13px',
    marginBottom: '40px',
  },
  leftLogo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '32px',
  },
  logoIcon: { fontSize: '32px' },
  logoText: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#fff',
  },
  leftTitle: {
    fontSize: '28px',
    fontWeight: '800',
    color: '#fff',
    margin: '0 0 12px',
  },
  leftSub: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 1.7,
    margin: '0 0 32px',
  },
  featureList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  featureItem: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '10px 16px',
    borderRadius: '8px',
    borderLeft: '3px solid rgba(255,255,255,0.4)',
  },

  // Right Panel
  rightPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: '40px',
  },
  formBox: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '36px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  formTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#222',
    margin: '0 0 6px',
  },
  formSub: { fontSize: '14px', color: '#888', margin: '0 0 24px' },
  errorBox: {
    backgroundColor: '#fff0f0',
    color: '#e74c3c',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
    border: '1px solid #ffd0d0',
  },

  fieldWrap: { marginBottom: '16px' },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#444',
    marginBottom: '6px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  forgotLink: {
    fontSize: '12px',
    color: '#1a7a4a',
    cursor: 'pointer',
    fontWeight: '600',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid #e8e8e8',
    borderRadius: '10px',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  inputIcon: { padding: '0 12px', fontSize: '16px' },
  input: {
    flex: 1,
    padding: '12px 0',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    backgroundColor: 'transparent',
    color: '#333',
  },
  eyeIcon: {
    padding: '0 12px',
    fontSize: '16px',
    cursor: 'pointer',
  },

  submitBtn: {
    width: '100%',
    padding: '13px',
    backgroundColor: '#1a7a4a',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '8px',
    marginBottom: '20px',
    transition: 'opacity 0.2s',
  },

  registerRow: {
    textAlign: 'center',
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
  registerLink: {
    color: '#1a7a4a',
    fontWeight: '700',
    textDecoration: 'none',
  },

  copyright: {
    fontSize: '11px',
    color: '#ccc',
    marginTop: '20px',
  },
};

export default Login;