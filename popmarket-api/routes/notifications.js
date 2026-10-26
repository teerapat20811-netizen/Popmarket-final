const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');



// ========== 1. ดูรายการแจ้งเตือนของตัวเอง (จำกัด 20 รายการล่าสุด) ==========
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [notifs] = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [req.user.id]
    );
    res.json(notifs);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแจ้งเตือน', error: err.message });
  }
});

// ========== 2. ทำเครื่องหมายว่าอ่านแล้วเฉพาะรายการ (Mark as read) ==========
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'อ่านแล้ว ✅' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 3. ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว (Mark all as read) ==========
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );
    res.json({ message: 'อ่านทั้งหมดแล้ว ✅' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 4. ฟังก์ชัน Helper สำหรับส่ง Notification ==========
// รองรับทั้ง 2 รูปแบบ:
// แบบที่ 1 (ทั่วไป/ยิงจาก API): sendNotification(userId, title, message, type, link)
// แบบที่ 2 (ส่งผ่าน Socket.IO): sendNotification(io, userId, title, message, type, link)
const sendNotification = async (arg1, arg2, arg3, arg4 = 'booking', arg5 = null) => {
  let io = null;
  let userId, title, message, type, link;

  if (typeof arg1 === 'number' || typeof arg1 === 'string') {
    // กรณีไม่มี io ส่งมา (เช่น payments.js เรียกใช้โดยตรง)
    userId = arg1;
    title = arg2;
    message = arg3;
    type = arg4 || 'booking';
    link = arg5 || null;
  } else {
    // กรณีส่ง instance ของ io เข้ามาเป็นตัวแปรแรก
    io = arg1;
    userId = arg2;
    title = arg3;
    message = arg4;
    type = arg5 || 'system';
    link = null;
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, title, message, type, link]
    );

    console.log(`[Notification] บันทึกแจ้งเตือนลง DB สำเร็จ -> User ID: ${userId} (ID: ${result.insertId})`);

    // ส่งแบบ Real-time ผ่าน Socket.IO (ถ้ามีการเชื่อมต่อ socket)
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        id: result.insertId,
        title,
        message,
        type,
        link,
        is_read: false,
        created_at: new Date(),
      });
    }
  } catch (err) {
    console.error('❌ [Notification] Error:', err.message);
  }
};

module.exports = { router, sendNotification };