const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const authMiddleware = require('../middleware/auth');
const { sendNotification } = require('./notifications'); // 🟢 นำเข้าฟังก์ชันส่งกระดิ่งแจ้งเตือน

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'popmarket',
  waitForConnections: true,
  connectionLimit: 10,
});

// ========== 1. ดึงรายการ Ticket ทั้งหมด (สำหรับ Admin ในหน้า Support Hub) ==========
router.get('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะ Admin เท่านั้น' });
  }
  try {
    const [tickets] = await pool.query(
      `SELECT t.*, u.name as user_name, u.email as user_email, u.role as user_role 
       FROM support_tickets t
       LEFT JOIN users u ON t.reporter_id = u.id
       ORDER BY t.created_at DESC`
    );
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 2. ส่ง ticket ใหม่ (สำหรับ User / Vendor) ==========
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, category, priority } = req.body;
  if (!title) return res.status(400).json({ message: 'กรุณากรอกหัวข้อปัญหา' });
  try {
    const [result] = await pool.query(
      `INSERT INTO support_tickets (reporter_id, title, description, category, priority)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, title, description || null, category || 'other', priority || 'normal']
    );
    res.status(201).json({ message: 'ส่งเรื่องสำเร็จ ✅', ticketId: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 3. ดู tickets ของตัวเอง (สำหรับ User / Vendor) ==========
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [tickets] = await pool.query(
      `SELECT * FROM support_tickets WHERE reporter_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 4. 🟢 Admin อัปเดตสถานะ Ticket และส่ง Notification กลับหาผู้ใช้ ==========
router.put('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะ Admin เท่านั้น' });
  }

  const { status, admin_note } = req.body;
  const ticketId = req.params.id;

  try {
    const [tickets] = await pool.query('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
    if (tickets.length === 0) {
      return res.status(404).json({ message: 'ไม่พบ Ticket นี้' });
    }
    const ticket = tickets[0];

    // 1. อัปเดตสถานะ Ticket และข้อความตอบกลับ
    await pool.query(
      `UPDATE support_tickets SET status = ?, admin_note = ?, updated_at = NOW() WHERE id = ?`,
      [status || 'resolved', admin_note || null, ticketId]
    );

    // 2. 🟢 ส่ง Notification (บันทึกลง Database โดยตรง ชัวร์ 100%)
    try {
      const targetUserId = ticket.reporter_id;
      if (targetUserId) {
        const [users] = await pool.query('SELECT role FROM users WHERE id = ?', [targetUserId]);
        let notifLink = '/';
        if (users.length > 0) {
          const role = users[0].role;
          if (role === 'vendor' || role === 'pending_vendor') notifLink = '/vendor';
          else if (role === 'organizer' || role === 'pending_organizer') notifLink = '/organizer';
        }

        const notifTitle = '🛠️ อัปเดตสถานะปัญหาของคุณ';
        let statusText = status === 'in_progress' ? 'กำลังดำเนินการ ⏳' : 
                         status === 'resolved' ? 'แก้ไขเรียบร้อยแล้ว ✅' : 'เปิดรับเรื่องแล้ว';
        
        let notifMessage = `Ticket #${ticketId} ("${ticket.title}"): ${statusText}`;
        if (admin_note && admin_note.trim() !== '') {
          notifMessage += ` | จากทีมงาน: ${admin_note}`;
        }

        // 🎯 สั่ง Insert ลงตารางแจ้งเตือนตรงๆ
        const [result] = await pool.query(
          `INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at)
           VALUES (?, ?, ?, 'system', ?, 0, NOW())`,
          [targetUserId, notifTitle, notifMessage, notifLink]
        );

        // 🎯 ยิงสัญญาณ Socket ให้กระดิ่งเด้งแบบ Real-time
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${targetUserId}`).emit('notification', {
            id: result.insertId,
            title: notifTitle,
            message: notifMessage,
            type: 'system',
            link: notifLink,
            is_read: false,
            created_at: new Date()
          });
        }
      }
    } catch (notifErr) {
      console.error('❌ Notification DB Error (ถ้าขึ้นบรรทัดนี้แปลว่าตารางแจ้งเตือนมีปัญหา):', notifErr);
    }

    res.json({ message: 'อัปเดต Ticket และส่งแจ้งเตือนสำเร็จ ✅' });
  } catch (err) {
    console.error("PUT Ticket Error:", err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', error: err.message });
  }
});

// ========== 5. Admin ลบ Ticket ==========
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'เฉพาะ Admin เท่านั้น' });
  }
  try {
    await pool.query('DELETE FROM support_tickets WHERE id = ?', [req.params.id]);
    res.json({ message: 'ลบ Ticket สำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;