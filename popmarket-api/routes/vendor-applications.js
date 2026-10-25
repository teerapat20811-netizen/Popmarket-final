const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const authMiddleware = require('../middleware/auth');

const pool = mysql.createPool({
  host: 'localhost', user: 'root', password: '1234',
  database: 'popmarket', waitForConnections: true, connectionLimit: 10,
});

// vendor สมัครเข้าตลาด
router.post('/', authMiddleware, async (req, res) => {
  const { market_id } = req.body;
  try {
    const [existing] = await pool.query(
      `SELECT id FROM vendor_applications WHERE vendor_id = ? AND market_id = ? AND status = 'pending'`,
      [req.user.id, market_id]
    );
    if (existing.length > 0) return res.status(400).json({ message: 'คุณส่งคำขอไปแล้ว' });

    await pool.query(
      `INSERT INTO vendor_applications (vendor_id, market_id) VALUES (?, ?)`,
      [req.user.id, market_id]
    );
    res.status(201).json({ message: 'ส่งคำขอสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ดูคำขอของตัวเอง
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [apps] = await pool.query(
      `SELECT va.*, m.name as market_name 
       FROM vendor_applications va
       JOIN markets m ON va.market_id = m.id
       WHERE va.vendor_id = ? ORDER BY va.created_at DESC`,
      [req.user.id]
    );
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// organizer ดูคำขอของตลาดตัวเอง
router.get('/market/:marketId', authMiddleware, async (req, res) => {
  try {
    const [apps] = await pool.query(
      `SELECT va.*, u.name as vendor_name, u.email as vendor_email,
              vp.shop_name, vp.category, vp.logo_url
       FROM vendor_applications va
       JOIN users u ON va.vendor_id = u.id
       LEFT JOIN vendor_profiles vp ON vp.user_id = va.vendor_id
       WHERE va.market_id = ? ORDER BY va.created_at DESC`,
      [req.params.marketId]
    );
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// organizer อนุมัติ/ปฏิเสธ
router.put('/:id', authMiddleware, async (req, res) => {
  const { action } = req.body;
  try {
    const [apps] = await pool.query('SELECT * FROM vendor_applications WHERE id = ?', [req.params.id]);
    if (!apps.length) return res.status(404).json({ message: 'ไม่พบคำขอ' });
    const app = apps[0];

    await pool.query(
      `UPDATE vendor_applications SET status = ? WHERE id = ?`,
      [action === 'approve' ? 'approved' : 'rejected', req.params.id]
    );

    if (action === 'approve') {
      // เปลี่ยน role เป็น vendor
      await pool.query('UPDATE users SET role = "vendor" WHERE id = ?', [app.vendor_id]);

      // แจ้งเตือน
      const io = req.app.get('io');
      if (io) io.to(`user_${app.vendor_id}`).emit('notification', {
        title: '🎉 ได้รับการอนุมัติเป็นผู้ค้า!',
        message: 'คุณสามารถเริ่มจองล็อคได้แล้ว กรุณา login ใหม่',
        link: '/vendor', type: 'system',
      });
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'system', ?)`,
        [app.vendor_id, '🎉 ได้รับการอนุมัติเป็นผู้ค้า!', 'คุณสามารถเริ่มจองล็อคได้แล้ว กรุณา login ใหม่', '/vendor']
      );
    }

    res.json({ message: action === 'approve' ? 'อนุมัติสำเร็จ ✅' : 'ปฏิเสธแล้ว ❌' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;