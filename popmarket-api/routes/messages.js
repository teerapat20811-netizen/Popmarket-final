const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth'); // ปรับเส้นทาง middleware ตามตำแหน่งจริงในโปรเจกต์ของคุณ

// สร้าง Pool เชื่อมต่อ MySQL ตามรูปแบบเดียวกับไฟล์อื่นในโปรเจกต์


// 1. API ส่งข้อความ (รองรับทั้งข้อความและรูปภาพ)
router.post('/', authMiddleware, async (req, res) => {
  const { receiver_id, message, image_url } = req.body;
  const sender_id = req.user.id; // ดึง user_id ของคนที่กำลังล็อกอินอยู่จาก Token

  if (!receiver_id || (!message && !image_url)) {
    return res.status(400).json({ message: 'กรุณาระบุข้อมูลการส่งข้อความหรือรูปภาพ' });
  }

  try {
    await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, message, image_url) VALUES (?, ?, ?, ?)',
      [sender_id, receiver_id, message || '', image_url || null]
    );
    res.status(201).json({ message: 'ส่งข้อความสำเร็จ ✅' });
  } catch (err) {
    console.error('SEND MESSAGE ERROR:', err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการส่งข้อความ', error: err.message });
  }
});

// 2. API ดึงประวัติแชทระหว่างผู้ใช้งาน 2 คน
router.get('/:partnerId', authMiddleware, async (req, res) => {
  const myId = req.user.id;
  const partnerId = req.params.partnerId;

  try {
    const [rows] = await pool.query(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?) 
       ORDER BY created_at ASC`,
      [myId, partnerId, partnerId, myId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET MESSAGES ERROR:', err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแชท', error: err.message });
  }
});
// 3. API ดึงรายชื่อคนที่เคยคุยกัน (สำหรับหน้า Inbox / รายการแชท)
router.get('/conversations/list', authMiddleware, async (req, res) => {
  const myId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT 
         u.id as user_id, u.name, vp.shop_name, vp.logo_url,
         (SELECT message FROM messages 
          WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
          ORDER BY created_at DESC LIMIT 1) as last_message,
         (SELECT created_at FROM messages 
          WHERE (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
          ORDER BY created_at DESC LIMIT 1) as last_time
       FROM users u
       LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
       WHERE u.id IN (
         SELECT DISTINCT 
           CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
         FROM messages 
         WHERE sender_id = ? OR receiver_id = ?
       )
       ORDER BY last_time DESC`,
      [myId, myId, myId, myId, myId, myId, myId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET CONVERSATIONS ERROR:', err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายชื่อแชท', error: err.message });
  }
});


module.exports = router;