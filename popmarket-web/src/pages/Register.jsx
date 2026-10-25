import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import ImageUpload from '../components/ImageUpload';

function Register() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('shopper');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [vendorPhoto, setVendorPhoto] = useState('');

  // State สำหรับ Pop-up นโยบายความเป็นส่วนตัว
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [agreedConsent, setAgreedConsent] = useState(false);

  // Form States
  const [shopperForm, setShopperForm] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: '', confirm: '',
  });

  const [vendorForm, setVendorForm] = useState({
    shopName: '', firstName: '', lastName: '', phone: '', email: '', password: '', confirm: '',
    shopCategory: '', lineId: '', socialMedia: '',
  });

  const [orgForm, setOrgForm] = useState({
    firstName: '', lastName: '', idCard: '', phone: '', backupPhone: '', line_id: '',
    email: '', password: '', confirm: '', company_name: '', corporate_id: '',
  });

  const [orgMarkets, setOrgMarkets] = useState([
    { market_name: '', location: '', estimated_stalls: '', business_type: '', description: '', experience: '' }
  ]);

  const handleAddMarket = () => {
    setOrgMarkets([
      ...orgMarkets,
      { market_name: '', location: '', estimated_stalls: '', business_type: '', description: '', experience: '' }
    ]);
  };

  const handleRemoveMarket = (index) => {
    if (orgMarkets.length === 1) return;
    setOrgMarkets(orgMarkets.filter((_, i) => i !== index));
  };

  const handleMarketChange = (index, field, value) => {
    const updated = [...orgMarkets];
    updated[index][field] = value;
    setOrgMarkets(updated);
  };

  // 🟢 ตรวจสอบความถูกต้องของข้อมูล (Validation ครบทุกช่องรวมถึง Email)
  const validateForm = () => {
    setError('');
    const nameRegex = /^[a-zA-Z\u0E00-\u0E7F\s]+$/;
    const phoneRegex = /^0[0-9]{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // 🟢 ตรวจสอบว่ามี @ และโดเมนถูกต้อง

    if (activeTab === 'shopper') {
      const { firstName, lastName, phone, email, password, confirm } = shopperForm;
      if (!firstName || !email || !password) { setError('กรุณากรอกข้อมูลให้ครบ'); return false; }
      if (!nameRegex.test(firstName.trim())) { setError('ชื่อจริงต้องเป็นตัวอักษรเท่านั้น ห้ามมีตัวเลขหรือสัญลักษณ์พิเศษ'); return false; }
      if (lastName.trim() && !nameRegex.test(lastName.trim())) { setError('นามสกุลต้องเป็นตัวอักษรเท่านั้น ห้ามมีตัวเลขหรือสัญลักษณ์พิเศษ'); return false; }
      if (!phone || !phoneRegex.test(phone.trim())) { setError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก และขึ้นต้นด้วยเลข 0 เท่านั้น'); return false; }
      
      // 🟢 ตรวจสอบอีเมล
      if (!emailRegex.test(email.trim())) { setError('รูปแบบอีเมลไม่ถูกต้อง (ต้องมี @ เช่น example@email.com)'); return false; }

      if (password.length < 6) { setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'); return false; }
      if (password !== confirm) { setError('รหัสผ่านไม่ตรงกัน'); return false; }

    } else if (activeTab === 'vendor') {
      const { shopName, firstName, lastName, phone, email, password, confirm } = vendorForm;
      if (!shopName || !firstName || !email || !password || !phone) { setError('กรุณากรอกข้อมูลให้ครบถ้วน'); return false; }
      if (!nameRegex.test(firstName.trim())) { setError('ชื่อจริงเจ้าของร้านต้องเป็นตัวอักษรเท่านั้น ห้ามมีตัวเลขหรือสัญลักษณ์พิเศษ'); return false; }
      if (lastName.trim() && !nameRegex.test(lastName.trim())) { setError('นามสกุลต้องเป็นตัวอักษรเท่านั้น ห้ามมีตัวเลขหรือสัญลักษณ์พิเศษ'); return false; }
      if (!phoneRegex.test(phone.trim())) { setError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก และขึ้นต้นด้วยเลข 0 เท่านั้น'); return false; }
      
      // 🟢 ตรวจสอบอีเมล
      if (!emailRegex.test(email.trim())) { setError('รูปแบบอีเมลไม่ถูกต้อง (ต้องมี @ เช่น contact@shop.com)'); return false; }

      if (password.length < 6) { setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'); return false; }
      if (password !== confirm) { setError('รหัสผ่านไม่ตรงกัน'); return false; }

    } else {
      const { firstName, lastName, idCard, phone, email, password, confirm } = orgForm;
      if (!firstName || !email || !password || !idCard || !phone) { setError('กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน (ชื่อ, เลขบัตรประชาชน, เบอร์โทรศัพท์, อีเมล, รหัสผ่าน)'); return false; }
      if (!nameRegex.test(firstName.trim())) { setError('ชื่อจริงต้องเป็นตัวอักษรเท่านั้น ห้ามมีตัวเลขหรือสัญลักษณ์พิเศษ'); return false; }
      if (lastName.trim() && !nameRegex.test(lastName.trim())) { setError('นามสกุลต้องเป็นตัวอักษรเท่านั้น ห้ามมีตัวเลขหรือสัญลักษณ์พิเศษ'); return false; }
      if (!phoneRegex.test(phone.trim())) { setError('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก และขึ้นต้นด้วยเลข 0 เท่านั้น'); return false; }
      
      // 🟢 ตรวจสอบอีเมล
      if (!emailRegex.test(email.trim())) { setError('รูปแบบอีเมลไม่ถูกต้อง (ต้องมี @ เช่น organizer@email.com)'); return false; }

      if (password.length < 6) { setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร'); return false; }
      if (password !== confirm) { setError('รหัสผ่านไม่ตรงกัน'); return false; }

      for (let i = 0; i < orgMarkets.length; i++) {
        const m = orgMarkets[i];
        if (!m.market_name.trim() || !m.location.trim()) {
          setError(`กรุณากรอก "ชื่อตลาด" และ "ที่ตั้งของตลาด" ในตลาดที่ ${i + 1} ให้ครบถ้วน`);
          return false;
        }
      }
    }
    return true;
  };

  const handleInitiateRegister = () => {
    if (validateForm()) {
      setAgreedConsent(false);
      setShowConsentModal(true);
    }
  };

  const handleConfirmRegister = async () => {
    if (!agreedConsent) {
      alert('กรุณาติ๊กยอมรับข้อกำหนดและนโยบายความเป็นส่วนตัวก่อนดำเนินการต่อ');
      return;
    }

    setShowConsentModal(false);
    setLoading(true);
    setError('');

    try {
      if (activeTab === 'shopper') {
        const { firstName, lastName, phone, email, password } = shopperForm;
        const payload = { 
          name: `${firstName.trim()} ${lastName.trim()}`.trim(), 
          email: email.trim(), 
          phone: phone.trim(), 
          password, 
          role: 'shopper' 
        };
        await api.post('/auth/register', payload);
        alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
        navigate('/login');

      } else if (activeTab === 'vendor') {
        const { shopName, firstName, lastName, phone, email, password, shopCategory, lineId, socialMedia } = vendorForm;
        const payload = { 
          name: shopName.trim(), 
          email: email.trim(), 
          phone: phone.trim(), 
          password, 
          role: 'vendor',
          shop_name: shopName.trim(),
          owner_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          category: shopCategory || null,
          logo_url: vendorPhoto || null,
          line_id: lineId || null,
          instagram: socialMedia || null,
        };
        await api.post('/auth/register', payload);
        await new Promise(resolve => setTimeout(resolve, 500));

        const loginRes = await api.post('/auth/login', { email: payload.email, password: payload.password });
        localStorage.setItem('token', loginRes.data.token);
        localStorage.setItem('user', JSON.stringify(loginRes.data.user));
        navigate('/vendor');

      } else {
        const { firstName, lastName, idCard, phone, backupPhone, line_id, email, password, company_name, corporate_id } = orgForm;
        const payload = {
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
          role: 'pending_organizer',
        };

        await api.post('/auth/register', payload);
        await new Promise(resolve => setTimeout(resolve, 500));

        const loginRes = await api.post('/auth/login', { email: payload.email, password: payload.password });
        const token = loginRes.data.token;

        const marketNames = orgMarkets.map(m => m.market_name).join(', ');
        const marketLocations = orgMarkets.map(m => m.location).join(', ');
        const marketDescriptions = orgMarkets.map((m, idx) => 
          `[ตลาดที่ ${idx + 1}: ${m.market_name} | ล็อคประมาณ: ${m.estimated_stalls || '-'} | ที่ตั้ง: ${m.location}] ${m.description || '-'}`
        ).join('\n\n');

        const mainExperience = orgMarkets[0]?.experience || '-';

        await api.post('/applications', {
          business_name: marketNames,
          business_type: orgMarkets[0]?.business_type || null,
          description: marketDescriptions,
          phone: phone.trim(),
          backup_phone: backupPhone?.trim() || null,
          line_id: line_id || null,
          experience: mainExperience,
          idCard: idCard.trim(),
          company_name: company_name?.trim() || null,
          corporate_id: corporate_id?.trim() || null,
          location: marketLocations,
          markets: orgMarkets,
          app_type: 'new_organizer'
        }, { 
          headers: { Authorization: `Bearer ${token}` } 
        });

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(loginRes.data.user));
        navigate('/organizer');
      }
    } catch (err) {
      console.error("Registration failed:", err);
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
    setLoading(false);
  };

  const tabs = [
    { key: 'shopper', icon: '👤', label: 'ผู้เยี่ยมชม', sub: 'ดูและสำรวจตลาด' },
    { key: 'vendor', icon: '🛍️', label: 'ผู้ค้า', sub: 'จองล็อคขายของ' },
    { key: 'organizer', icon: '🏪', label: 'เจ้าของตลาด', sub: 'สร้างและจัดการตลาด' },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <Link to="/" style={styles.logo}>🛒 PopMarket</Link>
        <Link to="/login" style={styles.loginLink}>มีบัญชีแล้ว? เข้าสู่ระบบ →</Link>
      </div>

      <div style={styles.container}>
        <div style={styles.headingWrap}>
          <h1 style={styles.heading}>เปิดบัญชีใหม่</h1>
          <p style={styles.headingSub}>เลือกประเภทบัญชีที่เหมาะกับคุณ</p>
        </div>

        {/* Tab Selector */}
        <div style={styles.tabRow}>
          {tabs.map(t => (
            <div key={t.key}
              style={{
                ...styles.tabCard,
                ...(activeTab === t.key ? styles.tabCardActive : {}),
              }}
              onClick={() => { setActiveTab(t.key); setError(''); }}
            >
              <div style={styles.tabCardIcon}>{t.icon}</div>
              <div style={styles.tabCardLabel}>{t.label}</div>
              <div style={styles.tabCardSub}>{t.sub}</div>
              {activeTab === t.key && <div style={styles.tabDot} />}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div style={styles.formCard}>
          {error && <div style={styles.errorBox}>⚠️ {error}</div>}

          {/* ===== SHOPPER ===== */}
          {activeTab === 'shopper' && (
            <>
              <div style={styles.formTitle}>
                <span style={styles.formTitleIcon}>👤</span>
                <div>
                  <div style={styles.formTitleText}>ลงทะเบียนผู้เยี่ยมชม</div>
                  <div style={styles.formTitleSub}>เข้าถึงตลาดทั้งหมดในแพลตฟอร์ม</div>
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>ชื่อ *</label>
                  <input style={styles.input} placeholder="ชื่อจริง"
                    value={shopperForm.firstName}
                    onChange={e => setShopperForm({...shopperForm, firstName: e.target.value})} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>นามสกุล</label>
                  <input style={styles.input} placeholder="นามสกุล"
                    value={shopperForm.lastName}
                    onChange={e => setShopperForm({...shopperForm, lastName: e.target.value})} />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>เบอร์โทรศัพท์ *</label>
                  <input 
                    style={styles.input} 
                    placeholder="0xx-xxx-xxxx"
                    maxLength={10}
                    value={shopperForm.phone}
                    onChange={e => {
                      const onlyDigits = e.target.value.replace(/\D/g, '');
                      setShopperForm({...shopperForm, phone: onlyDigits});
                    }} 
                  />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>อีเมล *</label>
                  <input 
                    style={styles.input} 
                    type="email"
                    placeholder="example@email.com"
                    autoComplete="off"
                    value={shopperForm.email}
                    onChange={e => setShopperForm({...shopperForm, email: e.target.value})} 
                  />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>รหัสผ่าน *</label>
                  <input style={styles.input} type="password" placeholder="••••••••"
                    autoComplete="new-password"
                    value={shopperForm.password}
                    onChange={e => setShopperForm({...shopperForm, password: e.target.value})} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>ยืนยันรหัส *</label>
                  <input style={styles.input} type="password" placeholder="••••••••"
                    autoComplete="new-password"
                    value={shopperForm.confirm}
                    onChange={e => setShopperForm({...shopperForm, confirm: e.target.value})} />
                </div>
              </div>
            </>
          )}

          {/* ===== VENDOR ===== */}
          {activeTab === 'vendor' && (
            <>
              <div style={styles.formTitle}>
                <span style={styles.formTitleIcon}>🛍️</span>
                <div>
                  <div style={styles.formTitleText}>ลงทะเบียนผู้ค้า</div>
                  <div style={styles.formTitleSub}>จองล็อคและขายของในตลาดนัด</div>
                </div>
              </div>

              <div style={styles.sectionDivider}>ข้อมูลส่วนตัว</div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>ชื่อจริงเจ้าของร้าน *</label>
                  <input style={styles.input} placeholder="ชื่อจริง"
                    value={vendorForm.firstName}
                    onChange={e => setVendorForm({...vendorForm, firstName: e.target.value})} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>นามสกุล</label>
                  <input style={styles.input} placeholder="นามสกุล"
                    value={vendorForm.lastName}
                    onChange={e => setVendorForm({...vendorForm, lastName: e.target.value})} />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>เบอร์โทรศัพท์ *</label>
                  <input 
                    style={styles.input} 
                    placeholder="0xx-xxx-xxxx"
                    maxLength={10}
                    value={vendorForm.phone}
                    onChange={e => {
                      const onlyDigits = e.target.value.replace(/\D/g, '');
                      setVendorForm({...vendorForm, phone: onlyDigits});
                    }} 
                  />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>อีเมล *</label>
                  <input 
                    style={styles.input} 
                    type="email"
                    placeholder="contact@shop.com"
                    autoComplete="off"
                    value={vendorForm.email}
                    onChange={e => setVendorForm({...vendorForm, email: e.target.value})} 
                  />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>รหัสผ่าน *</label>
                  <input style={styles.input} type="password" placeholder="••••••••"
                    autoComplete="new-password"
                    value={vendorForm.password}
                    onChange={e => setVendorForm({...vendorForm, password: e.target.value})} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>ยืนยันรหัส *</label>
                  <input style={styles.input} type="password" placeholder="••••••••"
                    autoComplete="new-password"
                    value={vendorForm.confirm}
                    onChange={e => setVendorForm({...vendorForm, confirm: e.target.value})} />
                </div>
              </div>

              <div style={styles.sectionDivider}>ข้อมูลร้านค้า</div>

              <label style={styles.label}>ชื่อร้านค้า / แบรนด์ *</label>
              <input style={styles.input} placeholder="เช่น: ข้าวแกงป้าแดง, Handmade by Ploy"
                value={vendorForm.shopName}
                onChange={e => setVendorForm({...vendorForm, shopName: e.target.value})} />

              <label style={styles.label}>ประเภทสินค้า *</label>
              <select style={styles.input}
                value={vendorForm.shopCategory}
                onChange={e => setVendorForm({...vendorForm, shopCategory: e.target.value})}>
                <option value="">เลือกประเภทสินค้า</option>
                <option value="อาหารและเครื่องดื่ม">🍜 อาหารและเครื่องดื่ม</option>
                <option value="เสื้อผ้าและแฟชั่น">👗 เสื้อผ้าและแฟชั่น</option>
                <option value="สินค้าแฮนด์เมด">🎨 สินค้าแฮนด์เมด</option>
                <option value="ของใช้และของตกแต่ง">🏠 ของใช้และของตกแต่ง</option>
                <option value="สินค้ามือสอง">♻️ สินค้ามือสอง</option>
                <option value="ผลิตภัณฑ์ออร์แกนิก">🌿 ผลิตภัณฑ์ออร์แกนิก</option>
                <option value="อื่นๆ">📌 อื่นๆ</option>
              </select>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>LINE ID</label>
                  <input style={styles.input} placeholder="@yourline"
                    value={vendorForm.lineId}
                    onChange={e => setVendorForm({...vendorForm, lineId: e.target.value})} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>Social Media</label>
                  <input style={styles.input} placeholder="เช่น Facebook, IG, TikTok"
                    value={vendorForm.socialMedia}
                    onChange={e => setVendorForm({...vendorForm, socialMedia: e.target.value})} />
                </div>
              </div>

              <div style={styles.sectionDivider}>รูปร้านค้า / โลโก้</div>
              <ImageUpload 
                type="shop" 
                label="อัปโหลดรูปร้านค้า / โลโก้" 
                onUpload={async (url) => setVendorPhoto(url)} 
              />
              {vendorPhoto && (
                <img src={vendorPhoto} alt="shop preview" 
                  style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', marginTop: '8px', marginBottom: '12px', backgroundColor: '#f8f9fa' }} />
              )}
            </>
          )}

          {/* ===== ORGANIZER ===== */}
          {activeTab === 'organizer' && (
            <>
              <div style={styles.formTitle}>
                <span style={styles.formTitleIcon}>🏪</span>
                <div>
                  <div style={styles.formTitleText}>ลงทะเบียนเป็นเจ้าของตลาด</div>
                  <div style={styles.formTitleSub}>รอ admin พิจารณาภายใน 1–3 วันทำการ</div>
                </div>
              </div>

              <div style={styles.noticeBox}>
                <div style={styles.noticeTitle}>📋 ขั้นตอนการสมัคร</div>
                <div style={styles.noticeSteps}>
                  <span style={styles.noticeStep}>1 กรอกข้อมูล</span>
                  <span style={styles.noticeArrow}>→</span>
                  <span style={styles.noticeStep}>2 Admin พิจารณา</span>
                  <span style={styles.noticeArrow}>→</span>
                  <span style={styles.noticeStep}>3 ได้รับสิทธิ์</span>
                </div>
              </div>

              <div style={styles.sectionDivider}>ข้อมูลส่วนตัว</div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>ชื่อ *</label>
                  <input style={styles.input} placeholder="ชื่อจริง"
                    value={orgForm.firstName}
                    onChange={e => setOrgForm({...orgForm, firstName: e.target.value})} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>นามสกุล</label>
                  <input style={styles.input} placeholder="นามสกุล"
                    value={orgForm.lastName}
                    onChange={e => setOrgForm({...orgForm, lastName: e.target.value})} />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>เลขบัตรประชาชน *</label>
                  <input style={styles.input} placeholder="เลขบัตรประชาชน 13 หลัก"
                    maxLength={13}
                    value={orgForm.idCard}
                    onChange={e => {
                      const onlyDigits = e.target.value.replace(/\D/g, '');
                      setOrgForm({...orgForm, idCard: onlyDigits});
                    }} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>เบอร์โทรศัพท์ *</label>
                  <input style={styles.input} placeholder="0xx-xxx-xxxx"
                    maxLength={10}
                    value={orgForm.phone}
                    onChange={e => {
                      const onlyDigits = e.target.value.replace(/\D/g, '');
                      setOrgForm({...orgForm, phone: onlyDigits});
                    }} />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>เบอร์ติดต่อสำรอง / ผู้จัดการตลาด</label>
                  <input style={styles.input} placeholder="0xx-xxx-xxxx (ถ้ามี)"
                    maxLength={10}
                    value={orgForm.backupPhone}
                    onChange={e => {
                      const onlyDigits = e.target.value.replace(/\D/g, '');
                      setOrgForm({...orgForm, backupPhone: onlyDigits});
                    }} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>LINE ID</label>
                  <input style={styles.input} placeholder="@yourline"
                    value={orgForm.line_id}
                    onChange={e => setOrgForm({...orgForm, line_id: e.target.value})} />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>อีเมล *</label>
                  <input 
                    style={styles.input} 
                    type="email"
                    placeholder="organizer@email.com"
                    autoComplete="off"
                    value={orgForm.email}
                    onChange={e => setOrgForm({...orgForm, email: e.target.value})} 
                  />
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>รหัสผ่าน *</label>
                  <input style={styles.input} type="password" placeholder="••••••••"
                    autoComplete="new-password"
                    value={orgForm.password}
                    onChange={e => setOrgForm({...orgForm, password: e.target.value})} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>ยืนยันรหัส *</label>
                  <input style={styles.input} type="password" placeholder="••••••••"
                    autoComplete="new-password"
                    value={orgForm.confirm}
                    onChange={e => setOrgForm({...orgForm, confirm: e.target.value})} />
                </div>
              </div>

              <div style={styles.sectionDivider}>ข้อมูลธุรกิจ</div>

              <div style={styles.row}>
                <div style={styles.col}>
                  <label style={styles.label}>ชื่อจดทะเบียนนิติบุคคล / ชื่อบริษัท</label>
                  <input style={styles.input} placeholder="เช่น: บริษัท ป๊อปมาร์เก็ต กรุ๊ป จำกัด (ถ้ามี)"
                    value={orgForm.company_name}
                    onChange={e => setOrgForm({...orgForm, company_name: e.target.value})} />
                </div>
                <div style={styles.col}>
                  <label style={styles.label}>เลขนิติบุคคล</label>
                  <input style={styles.input} placeholder="เลขนิติบุคคล 13 หลัก (ถ้ามี)"
                    maxLength={13}
                    value={orgForm.corporate_id}
                    onChange={e => {
                      const onlyDigits = e.target.value.replace(/\D/g, '');
                      setOrgForm({...orgForm, corporate_id: onlyDigits});
                    }} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', marginBottom: '8px' }}>
                <div style={{ ...styles.sectionDivider, margin: 0, borderBottom: 'none' }}>ข้อมูลตลาดที่ต้องการเปิด</div>
                <span style={{ fontSize: '12px', color: '#1a7a4a', fontWeight: '700' }}>รวม {orgMarkets.length} ตลาด</span>
              </div>

              {orgMarkets.map((market, idx) => (
                <div key={idx} style={styles.marketBox}>
                  <div style={styles.marketBoxHeader}>
                    <span style={{ fontWeight: '800', fontSize: '13px', color: '#1a7a4a' }}>
                      🏪 ตลาดที่ {idx + 1}
                    </span>
                    {orgMarkets.length > 1 && (
                      <button 
                        type="button" 
                        style={styles.removeMarketBtn}
                        onClick={() => handleRemoveMarket(idx)}
                      >
                        🗑️ ลบตลาดนี้
                      </button>
                    )}
                  </div>

                  <label style={styles.label}>ชื่อตลาด / ชื่องาน *</label>
                  <input style={styles.input} placeholder="เช่น: ตลาดนัดสุขใจ, ถนนคนเดินท่าแพ, งานกาชาดประจำปี"
                    value={market.market_name}
                    onChange={e => handleMarketChange(idx, 'market_name', e.target.value)} />

                  <div style={styles.row}>
                    <div style={{ flex: 2 }}>
                      <label style={styles.label}>ที่ตั้งของตลาด / พื้นที่จัดงาน *</label>
                      <input style={styles.input} placeholder="เช่น ลาดกระบัง กรุงเทพมหานคร หรือ ลานหน้าที่ว่าการอำเภอ"
                        value={market.location}
                        onChange={e => handleMarketChange(idx, 'location', e.target.value)} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={styles.label}>จำนวนล็อคโดยประมาณ</label>
                      <input style={styles.input} placeholder="เช่น 50 ล็อค"
                        value={market.estimated_stalls}
                        onChange={e => handleMarketChange(idx, 'estimated_stalls', e.target.value)} />
                    </div>
                  </div>

                  <label style={styles.label}>ประเภทตลาด / งานจัดแสดง</label>
                  <select style={styles.input}
                    value={market.business_type}
                    onChange={e => handleMarketChange(idx, 'business_type', e.target.value)}>
                    <option value="">เลือกประเภทตลาด / งานจัดแสดง</option>
                    <option value="ตลาดนัดทั่วไป">🏪 ตลาดนัดทั่วไป / ตลาดชุมชน</option>
                    <option value="ถนนคนเดิน / ตลาดนัดกลางคืน">🚶 ถนนคนเดิน / ตลาดนัดกลางคืน</option>
                    <option value="ตลาดสด / ตลาดเช้า">🥦 ตลาดสด / ตลาดเช้าชุมชน</option>
                    <option value="งานเทศกาล / งานอีเวนต์ / งานกาชาด">🎪 งานเทศกาล / งานอีเวนต์ / งานกาชาด (ชั่วคราว)</option>
                    <option value="ตลาดอาหารและเครื่องดื่ม">🍜 ตลาดอาหารและเครื่องดื่ม</option>
                    <option value="ตลาดสินค้าแฮนด์เมดและงานคราฟต์">🎨 ตลาดสินค้าแฮนด์เมด / งานคราฟต์</option>
                    <option value="ตลาดนัดเสื้อผ้าและแฟชั่น">👗 ตลาดนัดเสื้อผ้าและแฟชั่น</option>
                    <option value="ตลาดสินค้ามือสองและของเก่า">♻️ ตลาดสินค้ามือสองและของสะสม</option>
                    <option value="ตลาดเกษตรและผลิตภัณฑ์ออร์แกนิก">🌿 ตลาดเกษตรและผลิตภัณฑ์ออร์แกนิก</option>
                    <option value="อื่นๆ">📌 อื่นๆ</option>
                  </select>

                  <label style={styles.label}>รายละเอียดตลาด / งานจัดแสดง</label>
                  <textarea style={{...styles.input, height:'60px', resize:'vertical'}}
                    placeholder="บรรยายตลาดหรือลักษณะงาน จำนวนล็อค กลุ่มลูกค้าเป้าหมาย หรือช่วงเวลาที่ต้องการจัด..."
                    value={market.description}
                    onChange={e => handleMarketChange(idx, 'description', e.target.value)} />

                  {idx === 0 && (
                    <>
                      <label style={styles.label}>ประสบการณ์จัดตลาด / จัดงาน (ถ้ามี)</label>
                      <textarea style={{...styles.input, height:'50px', resize:'vertical'}}
                        placeholder="เช่น: เคยจัดตลาดมา 2 ปี หรือเคยเป็นฝ่ายประสานงานจัดงานกาชาดประจำปี..."
                        value={market.experience}
                        onChange={e => handleMarketChange(idx, 'experience', e.target.value)} />
                    </>
                  )}
                </div>
              ))}

              <button 
                type="button" 
                style={styles.addMarketBtn}
                onClick={handleAddMarket}
              >
                ＋ เพิ่มตลาดที่ต้องการเปิด (ตลาดที่ {orgMarkets.length + 1})
              </button>
            </>
          )}

          {/* Terms Footer Text */}
          <p style={styles.termsText}>
            โดยการกดสมัคร คุณยอมรับ{' '}
            <span style={styles.termsLink} onClick={() => { if(validateForm()) { setShowConsentModal(true); } }}>ข้อกำหนดการใช้งาน และ นโยบายความเป็นส่วนตัว</span>
          </p>

          {/* Submit Button */}
          <button
            style={{
              ...styles.submitBtn,
              backgroundColor: activeTab === 'organizer' ? '#1a7a4a'
                : activeTab === 'vendor' ? '#2c3e50' : '#222',
              opacity: loading ? 0.7 : 1,
            }}
            onClick={handleInitiateRegister}
            disabled={loading}
          >
            {loading ? '⏳ กำลังดำเนินการ...'
              : activeTab === 'shopper' ? '✅ สมัครบัญชีนักช้อป'
              : activeTab === 'vendor' ? '✅ สมัครบัญชีผู้ค้า'
              : '✅ ส่งคำขอสมัครเจ้าของตลาด'}
          </button>

          <p style={styles.loginRow}>
            มีบัญชีแล้ว?{' '}
            <Link to="/login" style={styles.loginLinkInline}>เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>

      {/* Pop-up Consent Modal */}
      {showConsentModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>📜 นโยบายความเป็นส่วนตัวและข้อกำหนด</h2>
              <button 
                type="button" 
                style={styles.modalCloseBtn}
                onClick={() => setShowConsentModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <h4 style={styles.modalSectionTitle}>1. วัตถุประสงค์ในการเก็บรวบรวมข้อมูล</h4>
              <p style={styles.modalText}>
                แพลตฟอร์ม <strong>PopMarket</strong> มีความจำเป็นต้องขออนุญาตจัดเก็บและใช้ข้อมูลส่วนตัวของท่าน เช่น ชื่อ นามสกุล หมายเลขโทรศัพท์ อีเมล รวมถึงข้อมูลระบุตัวตน (เช่น หมายเลขประจำตัวประชาชน หรือเลขทะเบียนนิติบุคคล) สำหรับการยืนยันตัวตน ตรวจสอบความถูกต้อง และอำนวยความสะดวกในการใช้งานระบบ
              </p>

              <h4 style={styles.modalSectionTitle}>2. การนำข้อมูลไปใช้ตามบทบาท</h4>
              <ul style={styles.modalList}>
                <li><strong>นักช้อป:</strong> เพื่อใช้ในการติดต่อ รับข่าวสาร และการมีส่วนร่วมในตลาด</li>
                <li><strong>ผู้ค้า (Vendor):</strong> เพื่อใช้ในการจองล็อค แสดงข้อมูลร้านค้า และการติดต่อประสานงานกับผู้จัดตลาด</li>
                <li><strong>เจ้าของตลาด (Organizer):</strong> เพื่อตรวจสอบสิทธิ์การจัดตั้งตลาด การดำเนินการตามกฎหมาย และการบริหารจัดการพื้นที่</li>
              </ul>

              <h4 style={styles.modalSectionTitle}>3. ความปลอดภัยและการคุ้มครองข้อมูล</h4>
              <p style={styles.modalText}>
                แพลตฟอร์มจะรักษาความปลอดภัยของข้อมูลส่วนบุคคลของท่านตามมาตรฐานความปลอดภัยที่เหมาะสม และจะไม่นำข้อมูลไปเผยแพร่หรือจำหน่ายต่อบุคคลภายนอกโดยไม่ได้รับความยินยอม ยกเว้นกรณีที่กฎหมายกำหนด
              </p>

              <div style={styles.consentCheckboxWrap}>
                <label style={styles.consentLabel}>
                  <input 
                    type="checkbox" 
                    checked={agreedConsent} 
                    onChange={e => setAgreedConsent(e.target.checked)} 
                    style={styles.checkboxInput}
                  />
                  <span>
                    ข้าพเจ้าได้อ่านและยอมรับ <strong>ข้อกำหนดการใช้งาน</strong> และยินยอมให้ระบบจัดเก็บข้อมูลส่วนบุคคลตาม <strong>นโยบายความเป็นส่วนตัว</strong>
                  </span>
                </label>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button 
                type="button" 
                style={styles.modalCancelBtn}
                onClick={() => setShowConsentModal(false)}
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                style={{
                  ...styles.modalConfirmBtn,
                  opacity: agreedConsent ? 1 : 0.5,
                  cursor: agreedConsent ? 'pointer' : 'not-allowed'
                }}
                disabled={!agreedConsent}
                onClick={handleConfirmRegister}
              >
                ยอมรับและยืนยันการสมัคร
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={styles.footer}>© 2026 POPMARKET PLATFORM — COMMUNITY BUILT</p>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f4f6f9', fontFamily: "'Sarabun', sans-serif" },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', backgroundColor: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  logo: { fontSize: '20px', fontWeight: '800', color: '#1a7a4a', textDecoration: 'none' },
  loginLink: { fontSize: '13px', color: '#1a7a4a', textDecoration: 'none', fontWeight: '600' },
  container: { maxWidth: '600px', margin: '32px auto', padding: '0 24px' },
  headingWrap: { textAlign: 'center', marginBottom: '24px' },
  heading: { fontSize: '28px', fontWeight: '800', color: '#222', margin: '0 0 6px' },
  headingSub: { fontSize: '14px', color: '#888', margin: 0 },
  tabRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' },
  tabCard: { 
    backgroundColor: '#fff', 
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: '#eee', 
    borderRadius: '12px', 
    padding: '16px 12px', 
    textAlign: 'center', 
    cursor: 'pointer', 
    position: 'relative', 
    transition: 'all 0.15s' 
  },
  tabCardActive: { 
    borderColor: '#1a7a4a', 
    backgroundColor: '#f0faf4', 
    boxShadow: '0 2px 12px rgba(26,122,74,0.12)' 
  },
  tabCardIcon: { fontSize: '24px', marginBottom: '6px' },
  tabCardLabel: { fontSize: '14px', fontWeight: '800', color: '#222' },
  tabCardSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  tabDot: { position: 'absolute', bottom: '-2px', left: '50%', transform: 'translateX(-50%)', width: '40px', height: '3px', backgroundColor: '#1a7a4a', borderRadius: '2px' },
  formCard: { backgroundColor: '#fff', borderRadius: '16px', padding: '28px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: '1px solid #eee' },
  formTitle: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f0f0f0' },
  formTitleIcon: { fontSize: '28px' },
  formTitleText: { fontSize: '16px', fontWeight: '800', color: '#222' },
  formTitleSub: { fontSize: '12px', color: '#888', marginTop: '2px' },
  sectionDivider: { 
    fontSize: '15px', 
    fontWeight: '800', 
    color: '#222', 
    letterSpacing: '0.5px', 
    margin: '24px 0 14px', 
    paddingBottom: '8px', 
    borderBottom: '2px solid #f0f0f0' 
  },
  noticeBox: { backgroundColor: '#e8f5e9', border: '1px solid #c8e6c9', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' },
  noticeTitle: { fontSize: '12px', fontWeight: '700', color: '#1a7a4a', marginBottom: '8px' },
  noticeSteps: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  noticeStep: { fontSize: '12px', color: '#1a7a4a', fontWeight: '600', backgroundColor: '#fff', padding: '3px 10px', borderRadius: '20px', border: '1px solid #c8e6c9' },
  noticeArrow: { fontSize: '12px', color: '#1a7a4a' },
  errorBox: { backgroundColor: '#fff0f0', color: '#e74c3c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid #ffd0d0' },
  row: { display: 'flex', gap: '12px' },
  col: { flex: 1 },
  label: { display: 'block', fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '4px' },
  input: { width: '100%', padding: '10px 12px', border: '1.5px solid #e8e8e8', borderRadius: '8px', fontSize: '13px', marginBottom: '12px', outline: 'none', boxSizing: 'border-box', backgroundColor: '#fafafa', color: '#333' },
  termsText: { fontSize: '12px', color: '#888', margin: '4px 0 16px', lineHeight: 1.6 },
  termsLink: { color: '#1a7a4a', cursor: 'pointer', fontWeight: '600', textDecoration: 'underline' },
  submitBtn: { width: '100%', padding: '13px', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginBottom: '14px' },
  loginRow: { textAlign: 'center', fontSize: '13px', color: '#666', margin: 0 },
  loginLinkInline: { color: '#1a7a4a', fontWeight: '700', textDecoration: 'none' },
  footer: { textAlign: 'center', fontSize: '12px', color: '#ccc', padding: '24px' },
  marketBox: { backgroundColor: '#fcfcfc', border: '1.5px solid #e8e8e8', borderRadius: '12px', padding: '16px', marginBottom: '14px' },
  marketBoxHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #eee' },
  removeMarketBtn: { backgroundColor: '#fff0f0', color: '#e74c3c', border: '1px solid #ffd0d0', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' },
  addMarketBtn: { width: '100%', padding: '10px', backgroundColor: '#e8f5e9', color: '#1a7a4a', border: '1.5px dashed #1a7a4a', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', marginBottom: '16px' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.55)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px' },
  modalCard: { backgroundColor: '#fff', borderRadius: '16px', maxWidth: '520px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 30px rgba(0,0,0,0.25)', overflow: 'hidden' },
  modalHeader: { padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '16px', fontWeight: '800', color: '#222', margin: 0 },
  modalCloseBtn: { background: 'none', border: 'none', fontSize: '18px', color: '#888', cursor: 'pointer', padding: '4px' },
  modalBody: { padding: '20px', overflowY: 'auto', fontSize: '13px', lineHeight: '1.6', color: '#444' },
  modalSectionTitle: { fontSize: '13px', fontWeight: '700', color: '#1a7a4a', margin: '12px 0 6px' },
  modalText: { margin: '0 0 10px' },
  modalList: { margin: '0 0 12px', paddingLeft: '20px' },
  consentCheckboxWrap: { marginTop: '16px', padding: '12px', backgroundColor: '#f8faf9', border: '1.5px solid #d4edda', borderRadius: '10px' },
  consentLabel: { display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '12px', color: '#333', cursor: 'pointer', lineHeight: '1.5' },
  checkboxInput: { marginTop: '3px', cursor: 'pointer', width: '16px', height: '16px' },
  modalFooter: { padding: '14px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#fafafa' },
  modalCancelBtn: { padding: '8px 16px', backgroundColor: '#fff', border: '1.5px solid #ccc', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#666', cursor: 'pointer' },
  modalConfirmBtn: { padding: '8px 20px', backgroundColor: '#1a7a4a', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: '#fff', transition: 'all 0.15s' },
};

export default Register;