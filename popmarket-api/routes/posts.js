const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const authMiddleware = require('../middleware/auth');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'popmarket',
  waitForConnections: true,
  connectionLimit: 10,
});

// POST — สร้างโพสต์
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'vendor') return res.status(403).json({ message: 'เฉพาะ vendor' });
  const { caption, image_url } = req.body;
  if (!caption && !image_url) return res.status(400).json({ message: 'กรุณาใส่ข้อความหรือรูป' });
  try {
    const [result] = await pool.query(
      `INSERT INTO shop_posts (vendor_id, caption, image_url) VALUES (?, ?, ?)`,
      [req.user.id, caption || null, image_url || null]
    );
    res.status(201).json({ message: 'โพสต์สำเร็จ ✅', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// DELETE — ลบโพสต์
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM shop_posts WHERE id = ? AND vendor_id = ?`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'ลบแล้ว ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;