// routes/market_reviews.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');


// ========== 1. ดูรีวิวทั้งหมดของตลาด (GET /market_reviews/market/:marketId) ==========
router.get('/market/:marketId', async (req, res) => {
  try {
    const [reviews] = await pool.query(
      `SELECT mr.*, u.name AS reviewer_name
       FROM market_reviews mr
       JOIN users u ON mr.reviewer_id = u.id
       WHERE mr.market_id = ?
       ORDER BY mr.created_at DESC`,
      [req.params.marketId]
    );
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 2. เขียนรีวิวตลาดใหม่ (POST /market_reviews) ==========
router.post('/', authMiddleware, async (req, res) => {
  const { market_id, rating, comment } = req.body;
  const reviewer_id = req.user.id;

  if (!market_id || !rating) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM market_reviews WHERE market_id = ? AND reviewer_id = ?',
      [market_id, reviewer_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'คุณเคยรีวิวตลาดนี้ไปแล้ว ⚠️' });
    }

    await pool.query(
      `INSERT INTO market_reviews (market_id, reviewer_id, rating, comment)
       VALUES (?, ?, ?, ?)`,
      [market_id, reviewer_id, rating, comment || null]
    );

    res.status(201).json({ message: 'บันทึกรีวิวตลาดสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 3. แก้ไขรีวิวตลาด (PUT /market_reviews/:id) ==========
router.put('/:id', authMiddleware, async (req, res) => {
  const { rating, comment } = req.body;
  try {
    await pool.query(
      'UPDATE market_reviews SET rating = COALESCE(?, rating), comment = ? WHERE id = ? AND reviewer_id = ?',
      [rating, comment, req.params.id, req.user.id]
    );
    res.json({ message: 'แก้ไขรีวิวตลาดสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 4. ลบรีวิวตลาด (DELETE /market_reviews/:id) ==========
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM market_reviews WHERE id = ? AND reviewer_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'ลบรีวิวตลาดสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;