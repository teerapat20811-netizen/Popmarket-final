const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');


// ========== REGISTER ==========
router.post('/register', async (req, res) => {
  console.log('register body:', req.body); 
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  const allowedRoles = ['shopper', 'vendor', 'organizer', 'admin', 'pending_organizer', 'pending_vendor'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: 'role ไม่ถูกต้อง' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?', [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'อีเมลนี้มีผู้ใช้แล้ว' });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, hash, role]
    );

    if (role === 'vendor' || role === 'pending_vendor') {
      await pool.query(
        `INSERT INTO vendor_profiles (user_id, shop_name, category, logo_url, line_id, social_media, owner_name, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          result.insertId, 
          req.body.shop_name || name,
          req.body.category || null,
          req.body.logo_url || null,
          req.body.line_id || null,
          req.body.social_media || req.body.instagram || null, // 🟢 รองรับ social_media
          req.body.owner_name || null,
          req.body.description || null
        ]
      );
    }

    res.status(201).json({ 
      message: 'สมัครสมาชิกสำเร็จ ✅',
      userId: result.insertId 
    });

  } catch (err) {
    console.error('REGISTER ERROR FULL:', err); 
    res.status(500).json({ 
      message: err.sqlMessage || err.message || 'เกิดข้อผิดพลาด', 
      error: err.sqlMessage || err.message 
    });
  }
});

// ========== LOGIN ==========
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'กรุณากรอก email และ password' });
  }

  try {
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?', [email]
    );
    if (users.length === 0) {
      return res.status(401).json({ message: 'ไม่พบผู้ใช้นี้' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      'popmarket_secret_key_2026',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        market_quota: user.market_quota || 0,
      }
    });

  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== UPDATE PROFILE ==========
router.put('/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'ไม่มี token' });

  try {
    const decoded = jwt.verify(token, 'popmarket_secret_key_2026');
    const {
      name, phone, avatar_url,
      bank_name, bank_account, bank_account_name, promptpay_qr, 
      promptpay_number,
      logo_url, shop_name, description, category,
      line_id, social_media // 🟢 1. รับค่า line_id และ social_media
    } = req.body;

    const userFields = [];
    const userValues = [];
    if (name !== undefined)               { userFields.push('name = ?');               userValues.push(name); }
    if (phone !== undefined)              { userFields.push('phone = ?');              userValues.push(phone); }
    if (avatar_url !== undefined)         { userFields.push('avatar_url = ?');         userValues.push(avatar_url); }
    if (bank_name !== undefined)          { userFields.push('bank_name = ?');          userValues.push(bank_name); }
    if (bank_account !== undefined)       { userFields.push('bank_account = ?');       userValues.push(bank_account); }
    if (bank_account_name !== undefined)  { userFields.push('bank_account_name = ?');  userValues.push(bank_account_name); }
    if (promptpay_qr !== undefined)       { userFields.push('promptpay_qr = ?');       userValues.push(promptpay_qr); }
    if (promptpay_number !== undefined)   { userFields.push('promptpay_number = ?');   userValues.push(promptpay_number); }

    if (userFields.length > 0) {
      userValues.push(decoded.id);
      await pool.query(
        `UPDATE users SET ${userFields.join(', ')} WHERE id = ?`,
        userValues
      );
    }

    const hasShopFields = [logo_url, shop_name, description, category, line_id, social_media].some(v => v !== undefined);

    if (hasShopFields) {
      // 🟢 2. บันทึกและอัปเดต line_id กับ social_media ลง vendor_profiles
      await pool.query(
        `INSERT INTO vendor_profiles (user_id, shop_name, logo_url, description, category, line_id, social_media)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           logo_url = COALESCE(?, logo_url),
           shop_name = COALESCE(?, shop_name),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           line_id = COALESCE(?, line_id),
           social_media = COALESCE(?, social_media)`,
        [
          decoded.id, shop_name || null, logo_url || null, description || null, category || null, line_id || null, social_media || null,
          logo_url || null, shop_name || null, description || null, category || null, line_id || null, social_media || null
        ]
      );
    }

    res.json({ message: 'อัปเดตสำเร็จ ✅' });
  } catch (err) {
    console.error('Profile update error:', err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== GET PROFILE ==========
router.get('/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'ไม่มี token' });

  try {
    const decoded = jwt.verify(token, 'popmarket_secret_key_2026');
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.phone, u.email, u.role, u.avatar_url, 
              u.market_quota,
              u.bank_name, u.bank_account, u.bank_account_name, u.promptpay_qr,
              u.promptpay_number,
              vp.logo_url,
              vp.logo_url AS shop_logo_url,
              vp.shop_name, vp.description, vp.category,
              vp.line_id,       -- 🟢 3. ดึง line_id ออกมาให้หน้าบ้าน
              vp.social_media   -- 🟢 3. ดึง social_media ออกมาให้หน้าบ้าน
       FROM users u
       LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
       WHERE u.id = ?`,
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 1. ขอลิงก์รีเซ็ตรหัสผ่าน (Forgot Password) ==========
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'กรุณากรอกอีเมลที่ใช้ลงทะเบียน' });
  }

  try {
    const [users] = await pool.query(
      'SELECT id, name, email FROM users WHERE email = ?',
      [email.trim()]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ' });
    }

    const user = users[0];

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?',
      [resetToken, expires, user.id]
    );

    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

    console.log('==================================================');
    console.log(`🔗 ลิงก์รีเซ็ตรหัสผ่านสำหรับคุณ ${user.name} (${user.email}):`);
    console.log(resetLink);
    console.log('==================================================');

    res.json({
      message: 'ระบบได้สร้างลิงก์รีเซ็ตรหัสผ่านเรียบร้อยแล้ว (มีอายุ 15 นาที)',
      resetLink: resetLink
    });

  } catch (err) {
    console.error('FORGOT PASSWORD ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการขอรีเซ็ตรหัสผ่าน', error: err.message });
  }
});

// ========== 2. ตั้งรหัสผ่านใหม่ (Reset Password) ==========
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  try {
    const [users] = await pool.query(
      'SELECT id, name, email FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
      [token]
    );

    if (users.length === 0) {
      return res.status(400).json({ 
        message: 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง หรือหมดอายุแล้ว (กรุณากดขอใหม่อีกครั้ง)' 
      });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ message: 'ตั้งรหัสผ่านใหม่สำเร็จแล้ว! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่ ✅' });

  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่', error: err.message });
  }
});

module.exports = router;