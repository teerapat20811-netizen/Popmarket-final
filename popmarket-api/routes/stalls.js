const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// แก้ไขล็อค
router.put('/:id', authMiddleware, async (req, res) => {
  const { lock_number, zone, size_sqm, price_per_day } = req.body;
  try {
    const [stalls] = await pool.query(
      `SELECT s.*, m.organizer_id 
       FROM stalls s 
       JOIN markets m ON s.market_id = m.id 
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (stalls.length === 0) {
      return res.status(404).json({ message: 'ไม่พบล็อคนี้' });
    }
    if (stalls[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไข' });
    }

    await pool.query(
      `UPDATE stalls SET lock_number=?, zone=?, size_sqm=?, price_per_day=?
       WHERE id=?`,
      [lock_number, zone || null, size_sqm || null, price_per_day, req.params.id]
    );
    res.json({ message: 'แก้ไขล็อคสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ลบล็อค
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [stalls] = await pool.query(
      `SELECT s.*, m.organizer_id 
       FROM stalls s 
       JOIN markets m ON s.market_id = m.id 
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (stalls.length === 0) {
      return res.status(404).json({ message: 'ไม่พบล็อคนี้' });
    }
    if (stalls[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบ' });
    }

    await pool.query('DELETE FROM stalls WHERE id = ?', [req.params.id]);
    res.json({ message: 'ลบล็อคสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;