const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

pool.query('ALTER TABLE reviews ADD COLUMN reply TEXT NULL').catch(() => {});
pool.query('ALTER TABLE reviews ADD COLUMN reply_by VARCHAR(255) NULL').catch(() => {});

// 1. ดึงรีวิวของร้านค้า
router.get('/vendor/:vendorProfileId', async (req, res) => {
  try {
    const [profiles] = await pool.query(
      'SELECT id FROM vendor_profiles WHERE user_id = ? OR id = ?',
      [req.params.vendorProfileId, req.params.vendorProfileId]
    );

    if (profiles.length === 0) {
      return res.json({ reviews: [], avg_rating: "0.0", total: 0 });
    }

    const realProfileId = profiles[0].id;

    const [reviews] = await pool.query(
      `SELECT r.*, u.name AS reviewer_name
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.vendor_profile_id = ?
       ORDER BY r.created_at DESC`,
      [realProfileId]
    );

    const [avg] = await pool.query(
      `SELECT AVG(rating) AS avg_rating, COUNT(*) AS total
       FROM reviews WHERE vendor_profile_id = ?`,
      [realProfileId]
    );

    res.json({
      reviews,
      avg_rating: Number(avg[0].avg_rating || 0).toFixed(1),
      total: avg[0].total,
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// 2. เขียนรีวิวใหม่
router.post('/', authMiddleware, async (req, res) => {
  const { vendor_profile_id, rating, comment } = req.body; 
  const reviewer_id = req.user.id;

  if (!vendor_profile_id || !rating) return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });

  try {
    const [profiles] = await pool.query(
      'SELECT id FROM vendor_profiles WHERE user_id = ? OR id = ?',
      [vendor_profile_id, vendor_profile_id]
    );
    if (profiles.length === 0) return res.status(404).json({ message: 'ไม่พบโปรไฟล์ร้านค้า' });

    const realProfileId = profiles[0].id;

    const [existing] = await pool.query(
      'SELECT id FROM reviews WHERE vendor_profile_id = ? AND reviewer_id = ?',
      [realProfileId, reviewer_id]
    );
    if (existing.length > 0) return res.status(409).json({ message: 'คุณเคยรีวิวร้านนี้แล้ว' });

    await pool.query(
      `INSERT INTO reviews (vendor_profile_id, reviewer_id, rating, comment) VALUES (?, ?, ?, ?)`,
      [realProfileId, reviewer_id, rating, comment || null]
    );

    res.status(201).json({ message: 'รีวิวสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// 3. แก้ไขคอมเมนต์ (คนรีวิว)
router.put('/:id', authMiddleware, async (req, res) => {
  const { rating, comment } = req.body;
  try {
    await pool.query(
      'UPDATE reviews SET rating = COALESCE(?, rating), comment = ? WHERE id = ? AND reviewer_id = ?',
      [rating, comment, req.params.id, req.user.id]
    );
    res.json({ message: 'แก้ไขรีวิวสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// 4. ลบคอมเมนต์ (คนรีวิว หรือ เจ้าของร้าน หรือ Admin)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [reviewRows] = await pool.query(
      `SELECT r.id, r.reviewer_id, vp.user_id AS owner_user_id
       FROM reviews r
       JOIN vendor_profiles vp ON r.vendor_profile_id = vp.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (reviewRows.length === 0) return res.status(404).json({ message: 'ไม่พบรีวิว' });

    const isReviewer = reviewRows[0].reviewer_id === req.user.id;
    const isOwner = reviewRows[0].owner_user_id === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isReviewer && !isOwner && !isAdmin) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบรีวิวนี้' });
    }

    await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    res.json({ message: 'ลบรีวิวสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// 5. ตอบกลับรีวิว (เจ้าของร้าน)
router.post('/:id/reply', authMiddleware, async (req, res) => {
  const { reply } = req.body;
  if (!reply || !reply.trim()) return res.status(400).json({ message: 'กรุณากรอกข้อความตอบกลับ' });

  try {
    const [reviewRows] = await pool.query(
      `SELECT r.id, vp.user_id AS owner_user_id, COALESCE(vp.shop_name, u.name) AS shop_name
       FROM reviews r
       JOIN vendor_profiles vp ON r.vendor_profile_id = vp.id
       JOIN users u ON vp.user_id = u.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (reviewRows.length === 0 || reviewRows[0].owner_user_id !== req.user.id) {
      return res.status(403).json({ message: 'เฉพาะเจ้าของร้านเท่านั้นที่มีสิทธิ์ตอบกลับ' });
    }

    const replyByLabel = `${reviewRows[0].shop_name} (เจ้าของร้าน)`;

    await pool.query(
      'UPDATE reviews SET reply = ?, reply_by = ? WHERE id = ?',
      [reply.trim(), replyByLabel, req.params.id]
    );

    res.json({ message: 'ตอบกลับรีวิวสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการตอบกลับ', error: err.message });
  }
});

// 6. แก้ไขข้อความตอบกลับ (เจ้าของร้าน)
router.put('/:id/reply', authMiddleware, async (req, res) => {
  const { reply } = req.body;
  if (!reply || !reply.trim()) return res.status(400).json({ message: 'กรุณากรอกข้อความ' });

  try {
    const [reviewRows] = await pool.query(
      `SELECT r.id, vp.user_id AS owner_user_id
       FROM reviews r
       JOIN vendor_profiles vp ON r.vendor_profile_id = vp.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (reviewRows.length === 0 || reviewRows[0].owner_user_id !== req.user.id) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขข้อความนี้' });
    }

    await pool.query('UPDATE reviews SET reply = ? WHERE id = ?', [reply.trim(), req.params.id]);
    res.json({ message: 'แก้ไขข้อความตอบกลับสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// 7. ลบข้อความตอบกลับ (เจ้าของร้าน)
router.delete('/:id/reply', authMiddleware, async (req, res) => {
  try {
    const [reviewRows] = await pool.query(
      `SELECT r.id, vp.user_id AS owner_user_id
       FROM reviews r
       JOIN vendor_profiles vp ON r.vendor_profile_id = vp.id
       WHERE r.id = ?`,
      [req.params.id]
    );

    if (reviewRows.length === 0 || reviewRows[0].owner_user_id !== req.user.id) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบข้อความนี้' });
    }

    await pool.query('UPDATE reviews SET reply = NULL, reply_by = NULL WHERE id = ?', [req.params.id]);
    res.json({ message: 'ลบข้อความตอบกลับสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;