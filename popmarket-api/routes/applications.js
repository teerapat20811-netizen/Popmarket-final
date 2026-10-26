const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');


// ========== 1. ยื่นคำขอสมัคร organizer หรือขอเพิ่มตลาดใหม่ ==========
router.post('/', authMiddleware, async (req, res) => {
  const {
    business_name,
    business_type,
    description,
    phone,
    backup_phone,
    line_id,
    experience,
    idCard,
    company_name,
    corporate_id,
    location,
    markets,
    app_type = 'new_organizer'
  } = req.body;

  if (!business_name) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อตลาดหรือชื่อธุรกิจ' });
  }

  try {
    const [existing] = await pool.query(
      `SELECT id FROM applications WHERE user_id = ? AND status = 'pending'`,
      [req.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'คุณมีคำขอที่กำลังรอการพิจารณาจาก Admin อยู่แล้ว' });
    }

    if (app_type === 'new_organizer') {
      const [users] = await pool.query(`SELECT role FROM users WHERE id = ?`, [req.user.id]);
      if (users[0]?.role === 'organizer') {
        return res.status(400).json({ message: 'คุณเป็น Organizer ในระบบอยู่แล้ว' });
      }
    }

    // 🟢 ดึงเบอร์โทรเดิมของผู้ใช้มาใส่อัตโนมัติ (กรณีฟอร์มไม่ได้ส่งมา)
    const [userRows] = await pool.query('SELECT phone FROM users WHERE id = ?', [req.user.id]);
    const applicantPhone = phone || userRows[0]?.phone || null;

    // แปลงอาร์เรย์ตลาดเป็น JSON String เพื่อเก็บลงตาราง
    const marketsDataJson = markets ? JSON.stringify(markets) : null;

    const [result] = await pool.query(
      `INSERT INTO applications 
        (user_id, business_name, business_type, description, phone, backup_phone, line_id, 
         experience, idCard, company_name, corporate_id, location, markets_data, app_type, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.id,
        business_name,
        business_type || null,
        description || null,
        applicantPhone,
        backup_phone || null,
        line_id || null,
        experience || null,
        idCard || null,
        company_name || null,
        corporate_id || null,
        location || null,
        marketsDataJson,
        app_type
      ]
    );

    res.status(201).json({
      message: 'ส่งคำขอสำเร็จ ✅ รอ admin พิจารณา',
      applicationId: result.insertId,
    });
  } catch (err) {
    console.error('APPLICATIONS POST ERROR:', err);
    res.status(500).json({ 
      message: err.sqlMessage || err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลคำขอ', 
      error: err.sqlMessage || err.message 
    });
  }
});

// ========== 2. ดูสถานะคำขอของตัวเอง (สำหรับ User/Organizer) ==========
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [apps] = await pool.query(
      `SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(apps);
  } catch (err) {
    console.error('APPLICATIONS GET ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูล', error: err.sqlMessage || err.message });
  }
});

// ========== 3. [ADMIN] ดึงรายการคำขอทั้งหมด ==========
router.get('/admin/all', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง (เฉพาะผู้ดูแลระบบเท่านั้น)' });
    }

    const [apps] = await pool.query(`
      SELECT 
        a.*, 
        u.name AS applicant_name, 
        u.email AS applicant_email, 
        u.role AS user_current_role,
        COALESCE(u.market_quota, 0) AS current_quota
      FROM applications a
      JOIN users u ON a.user_id = u.id
      ORDER BY 
        CASE WHEN a.status = 'pending' THEN 1 ELSE 2 END,
        a.created_at DESC
    `);

    res.json(apps);
  } catch (err) {
    console.error('ADMIN GET APPS ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลใบสมัคร', error: err.sqlMessage || err.message });
  }
});

// ========== 4. [ADMIN] อนุมัติคำขอ (ปรับสิทธิ์ + เพิ่มโควตาตลาด) ==========
router.put('/:id/approve', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
    }

    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบใบสมัครนี้' });
    }

    const app = rows[0];
    if (app.status !== 'pending') {
      return res.status(400).json({ message: 'คำขอนี้ได้รับการดำเนินการไปแล้ว' });
    }

    // คำนวณโควตาตลาดจากจำนวนตลาดที่ส่งมาใน markets_data
    let quotaToAdd = 1;
    if (app.markets_data) {
      try {
        const parsed = typeof app.markets_data === 'string' ? JSON.parse(app.markets_data) : app.markets_data;
        if (Array.isArray(parsed) && parsed.length > 0) {
          quotaToAdd = parsed.length;
        }
      } catch (e) {
        quotaToAdd = 1;
      }
    }

    // 1. อัปเดตสถานะใบสมัครเป็น approved
    await pool.query('UPDATE applications SET status = "approved", reject_reason = NULL WHERE id = ?', [id]);

    // 2. ปรับสิทธิ์ User เป็น organizer และบวกโควตาตลาดตามจำนวนที่ขอ
    await pool.query(
      `UPDATE users 
       SET role = 'organizer', market_quota = COALESCE(market_quota, 0) + ? 
       WHERE id = ?`,
      [quotaToAdd, app.user_id]
    );

    res.json({
      message: `อนุมัติคำขอสำเร็จ! ปรับสิทธิ์เป็นเจ้าของตลาด และมอบโควตาเปิดตลาด +${quotaToAdd} เรียบร้อยแล้ว`,
      addedQuota: quotaToAdd
    });

  } catch (err) {
    console.error('ADMIN APPROVE ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอนุมัติคำขอ', error: err.sqlMessage || err.message });
  }
});

// ========== 5. [ADMIN] ปฏิเสธคำขอ (พร้อมระบุเหตุผล) ==========
router.put('/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
    }

    const { id } = req.params;
    const { reject_reason } = req.body;

    const [rows] = await pool.query('SELECT * FROM applications WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบใบสมัครนี้' });
    }

    await pool.query(
      'UPDATE applications SET status = "rejected", reject_reason = ? WHERE id = ?',
      [reject_reason?.trim() || 'ข้อมูลไม่ผ่านเกณฑ์การพิจารณา', id]
    );

    res.json({ message: 'ปฏิเสธคำขอเรียบร้อยแล้ว' });

  } catch (err) {
    console.error('ADMIN REJECT ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ', error: err.sqlMessage || err.message });
  }
});

module.exports = router;