const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const authMiddleware = require('../middleware/auth');

const pool = mysql.createPool({
  host: 'localhost', user: 'root', password: '1234',
  database: 'popmarket', waitForConnections: true, connectionLimit: 10,
});

// vendor สมัคร subscription (ปรับให้รับยอดเงิน total_amount จากหน้าบ้านตามจริง)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'vendor') return res.status(403).json({ message: 'เฉพาะ vendor' });
  const { stall_id, market_id, package_months, slip_url, total_amount } = req.body;
  if (!stall_id || !package_months || !slip_url) {
    return res.status(400).json({ message: 'ข้อมูลไม่ครบ' });
  }
  try {
    // เช็คว่าล็อคนี้มีคนผูกอยู่แล้วไหม
    const [stalls] = await pool.query(
      `SELECT * FROM stalls WHERE id = ? AND subscriber_id IS NOT NULL AND subscription_end >= CURDATE()`,
      [stall_id]
    );
    if (stalls.length > 0) return res.status(400).json({ message: 'ล็อคนี้มีคนผูกอยู่แล้ว' });

    // ตรวจสอบว่ามีล็อคจริงไหม
    const [stallData] = await pool.query('SELECT * FROM stalls WHERE id = ?', [stall_id]);
    if (!stallData.length) return res.status(404).json({ message: 'ไม่พบล็อค' });
    
    // 🟢 ใช้วิธีดึงราคาที่คำนวณจากหน้าบ้านมาใช้ (ถ้าไม่มีให้คำนวณสำรอง)
    const amount = total_amount ? Number(total_amount) : (Number(stallData[0].price_per_day || 0) * 5 * parseInt(package_months));

    const start_date = new Date();
    const end_date = new Date();
    end_date.setMonth(end_date.getMonth() + parseInt(package_months));

    const [result] = await pool.query(
      `INSERT INTO stall_subscriptions 
       (stall_id, vendor_id, market_id, package_months, amount, slip_url, status, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [stall_id, req.user.id, market_id, package_months, amount, slip_url,
       start_date.toISOString().slice(0,10), end_date.toISOString().slice(0,10)]
    );
    res.status(201).json({ message: 'ส่งคำขอสำเร็จ ✅ รอ organizer ยืนยัน', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// organizer ยืนยัน subscription
router.put('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const [subs] = await pool.query('SELECT * FROM stall_subscriptions WHERE id = ?', [req.params.id]);
    if (!subs.length) return res.status(404).json({ message: 'ไม่พบ' });
    const sub = subs[0];

    await pool.query(
      `UPDATE stall_subscriptions SET status = 'active' WHERE id = ?`, [req.params.id]
    );
    // ผูกล็อคให้ vendor
    await pool.query(
      `UPDATE stalls SET subscriber_id = ?, subscription_end = ? WHERE id = ?`,
      [sub.vendor_id, sub.end_date, sub.stall_id]
    );
    res.json({ message: 'ยืนยันสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ดู subscriptions ของตัวเอง (vendor)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const [subs] = await pool.query(
      `SELECT ss.*, s.lock_number, s.zone, m.name as market_name,
              vc.is_open as today_is_open
       FROM stall_subscriptions ss
       JOIN stalls s ON ss.stall_id = s.id
       JOIN markets m ON ss.market_id = m.id
       LEFT JOIN vendor_checkins vc ON vc.vendor_id = ss.vendor_id 
            AND vc.market_id = ss.market_id 
            AND vc.checkin_date = ?
       WHERE ss.vendor_id = ?
       ORDER BY ss.created_at DESC`,
      [today, req.user.id]
    );
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// organizer ดู subscriptions ของตลาดตัวเอง
router.get('/market/:marketId', authMiddleware, async (req, res) => {
  try {
    const [subs] = await pool.query(
      `SELECT ss.*, s.lock_number, s.zone, u.name as vendor_name
       FROM stall_subscriptions ss
       JOIN stalls s ON ss.stall_id = s.id
       JOIN users u ON ss.vendor_id = u.id
       WHERE ss.market_id = ?
       ORDER BY ss.created_at DESC`,
      [req.params.marketId]
    );
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// vendor เช็คอิน
router.post('/checkin', authMiddleware, async (req, res) => {
  if (req.user.role !== 'vendor') return res.status(403).json({ message: 'เฉพาะ vendor' });
  const { stall_id, market_id, is_open } = req.body;
  try {
    const today = new Date().toISOString().slice(0,10);
    
    const [existing] = await pool.query(
      `SELECT id FROM vendor_checkins WHERE vendor_id = ? AND market_id = ? AND checkin_date = ?`,
      [req.user.id, market_id, today]
    );
    
    if (existing.length > 0) {
      await pool.query(
        `UPDATE vendor_checkins SET is_open = ? WHERE vendor_id = ? AND market_id = ? AND checkin_date = ?`,
        [is_open, req.user.id, market_id, today]
      );
    } else {
      await pool.query(
        `INSERT INTO vendor_checkins (vendor_id, stall_id, market_id, checkin_date, is_open) VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, stall_id, market_id, today, is_open]
      );
    }

    res.json({ message: is_open ? '🟢 เช็คอินสำเร็จ' : '🔴 แจ้งไม่มาสำเร็จ' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ดู checkin status ของตลาด (public)
router.get('/checkin/:marketId', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0,10);
    const [checkins] = await pool.query(
      `SELECT vc.*, u.id as user_id, u.name as vendor_name, vp.id as vendor_profile_id, vp.shop_name, vp.logo_url, s.lock_number, s.zone
       FROM vendor_checkins vc
       JOIN users u ON vc.vendor_id = u.id
       LEFT JOIN vendor_profiles vp ON vp.user_id = vc.vendor_id
       JOIN stalls s ON vc.stall_id = s.id
       WHERE vc.market_id = ? AND vc.checkin_date = ?`,
      [req.params.marketId, today]
    );
    res.json(checkins);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;