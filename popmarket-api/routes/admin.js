const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');


// อนุญาตเฉพาะ admin
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'สิทธิ์ไม่เพียงพอ' });
  }
  next();
};

// ========== ดึงผู้ใช้งานทั้งหมด ==========
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT * FROM users WHERE role NOT LIKE 'pending_%' ORDER BY created_at DESC`
    );
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ระงับ / เปิดใช้งานผู้ใช้ ==========
router.put('/users/:id/toggle-suspend', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });
    }
    if (users[0].role === 'admin') {
      return res.status(403).json({ message: 'ไม่สามารถระงับ admin ได้' });
    }

    const newStatus = users[0].is_suspended ? 0 : 1;
    await pool.query('UPDATE users SET is_suspended = ? WHERE id = ?', [newStatus, req.params.id]);

    res.json({
      message: newStatus ? 'ระงับผู้ใช้แล้ว ✅' : 'เปิดใช้งานผู้ใช้อีกครั้งแล้ว ✅',
      is_suspended: newStatus,
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดึง bookings ทั้งหมด ==========
router.get('/bookings', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [bookings] = await pool.query(`
      SELECT 
        b.id, b.book_date, b.status as booking_status, b.note,
        b.created_at,
        u.name as vendor_name, u.email as vendor_email,
        s.lock_number, s.zone, s.price_per_day,
        m.name as market_name, m.province,
        p.amount, p.status as payment_status, p.method, p.slip_url
      FROM bookings b
      JOIN users u ON b.vendor_id = u.id
      JOIN stalls s ON b.stall_id = s.id
      JOIN markets m ON s.market_id = m.id
      LEFT JOIN payments p ON p.booking_id = b.id
      ORDER BY b.created_at DESC
    `);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== รายงานสถิติ ==========
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [[{ total_markets }]] = await pool.query(`SELECT COUNT(*) as total_markets FROM markets`);
    const [[{ total_users }]] = await pool.query(`SELECT COUNT(*) as total_users FROM users`);
    const [[{ total_bookings }]] = await pool.query(`SELECT COUNT(*) as total_bookings FROM bookings`);
    const [[{ total_revenue }]] = await pool.query(`SELECT COALESCE(SUM(amount),0) as total_revenue FROM payments WHERE status='paid'`);
    const [[{ platform_cut }]] = await pool.query(`SELECT COALESCE(SUM(amount)*0.1,0) as platform_cut FROM payments WHERE status='paid'`);

    const [revenueByMarket] = await pool.query(`
      SELECT m.name, m.id,
        COALESCE(SUM(CASE WHEN p.status='paid' THEN p.amount ELSE 0 END), 0) as revenue,
        COUNT(DISTINCT b.id) as booking_count
      FROM markets m
      LEFT JOIN stalls s ON s.market_id = m.id
      LEFT JOIN bookings b ON b.stall_id = s.id
      LEFT JOIN payments p ON p.booking_id = b.id
      GROUP BY m.id, m.name
      ORDER BY revenue DESC
    `);

    const [usersByRole] = await pool.query(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `);

    res.json({
      total_markets, total_users, total_bookings,
      total_revenue, platform_cut,
      revenueByMarket, usersByRole,
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดึง tickets ทั้งหมด (admin) ==========
router.get('/tickets', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [tickets] = await pool.query(`
      SELECT t.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM support_tickets t
      JOIN users u ON t.reporter_id = u.id
      ORDER BY 
        FIELD(t.status, 'open', 'in_progress', 'resolved'),
        FIELD(t.priority, 'urgent', 'normal', 'low'),
        t.created_at DESC
    `);
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== อัปเดต ticket status + admin_note + แจ้งเตือนผู้ส่งเรื่อง ==========
router.put('/tickets/:id', authMiddleware, adminOnly, async (req, res) => {
  const { status, admin_note } = req.body;
  try {
    const [ticketRows] = await pool.query(
      'SELECT reporter_id, title FROM support_tickets WHERE id = ?',
      [req.params.id]
    );
    if (ticketRows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบ ticket นี้' });
    }
    const ticket = ticketRows[0];

    await pool.query(
      `UPDATE support_tickets SET status = ?, admin_note = ? WHERE id = ?`,
      [status, admin_note || null, req.params.id]
    );

    const notifTitle = status === 'resolved'
      ? '✅ ปัญหาของคุณได้รับการแก้ไขแล้ว'
      : '🔔 มีการอัปเดตสถานะการแจ้งปัญหา';
    const notifMessage = admin_note
      ? `เรื่อง "${ticket.title}" — Admin ตอบกลับว่า: ${admin_note}`
      : `เรื่อง "${ticket.title}" ของคุณถูกอัปเดตสถานะเป็น ${status}`;

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${ticket.reporter_id}`).emit('notification', {
        title: notifTitle,
        message: notifMessage,
        type: 'system',
      });
    }

    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'ticket')`,
      [ticket.reporter_id, notifTitle, notifMessage]
    );

    res.json({ message: 'อัปเดตสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ลบ ticket ==========
router.delete('/tickets/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM support_tickets WHERE id = ?', [req.params.id]);
    res.json({ message: 'ลบ ticket สำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 1. ดึงคำขอสมัคร Organizer ทั้งหมด (ดึงจากตาราง applications ใหม่) ==========
router.get('/applications', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        a.*,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        COALESCE(u.market_quota, 0) AS current_quota
      FROM applications a
      JOIN users u ON a.user_id = u.id
      ORDER BY 
        CASE WHEN a.status = 'pending' THEN 1 ELSE 2 END,
        a.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('ADMIN GET APPS ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคำขอ', error: err.message });
  }
});

// ========== 2. อนุมัติ/ปฏิเสธ คำขอ Organizer (+ คำนวณโควตาตลาด + แจ้งเตือน) ==========
router.put('/applications/:id', authMiddleware, adminOnly, async (req, res) => {
  const { action, admin_note } = req.body;
  const { id } = req.params;

  try {
    const [rows] = await pool.query(`SELECT * FROM applications WHERE id = ?`, [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบคำขอนี้' });
    const app = rows[0];

    const io = req.app.get('io');

    if (action === 'approve') {
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

      await pool.query(
        `UPDATE users 
         SET role = 'organizer', market_quota = COALESCE(market_quota, 0) + ? 
         WHERE id = ?`,
        [quotaToAdd, app.user_id]
      );

      await pool.query(
        `UPDATE applications SET status = 'approved', reject_reason = ? WHERE id = ?`,
        [admin_note || null, id]
      );

      const notifMsg = `ใบสมัครของคุณได้รับการอนุมัติแล้ว! คุณได้รับโควตาสร้างตลาด ${quotaToAdd} แห่ง กรุณาเข้าสู่ระบบใหม่อีกครั้ง`;
      if (io) {
        io.to(`user_${app.user_id}`).emit('notification', {
          title: '🎉 ใบสมัครได้รับการอนุมัติ!',
          message: notifMsg,
          link: '/organizer',
          type: 'system',
        });
      }

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'system', ?)`,
        [app.user_id, '🎉 ใบสมัครได้รับการอนุมัติ!', notifMsg, '/organizer']
      );

      return res.json({ 
        message: `อนุมัติสำเร็จ ✅ ปรับสิทธิ์เป็น Organizer และเพิ่มโควตาตลาด +${quotaToAdd} เรียบร้อยแล้ว`,
        addedQuota: quotaToAdd 
      });

    } else if (action === 'reject') {
      const reason = admin_note || 'ข้อมูลไม่ผ่านเกณฑ์การพิจารณา';

      await pool.query(
        `UPDATE applications SET status = 'rejected', reject_reason = ? WHERE id = ?`,
        [reason, id]
      );

      if (io) {
        io.to(`user_${app.user_id}`).emit('notification', {
          title: '❌ คำขอของคุณไม่ผ่านการอนุมัติ',
          message: `เหตุผล: ${reason}`,
          type: 'system',
        });
      }

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'system')`,
        [app.user_id, '❌ คำขอของคุณไม่ผ่านการอนุมัติ', `เหตุผล: ${reason}`]
      );

      return res.json({ message: 'ปฏิเสธคำขอเรียบร้อยแล้ว' });
    }

    res.status(400).json({ message: 'action ไม่ถูกต้อง (ต้องเป็น approve หรือ reject)' });
  } catch (err) {
    console.error('ADMIN HANDLE APP ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการประมวลผล', error: err.message });
  }
});

// ========== ดึงข้อมูลโปรไฟล์ Vendor รายคน ==========
router.get('/vendors/profile/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [vendors] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.created_at,
              COALESCE(vp.shop_name, u.name) AS shop_name,
              COALESCE(vp.category, 'ทั่วไป') AS category,
              COALESCE(vp.description, 'ไม่มีคำอธิบาย') AS description,
              vp.logo_url,
              vp.line_id, vp.instagram, vp.owner_name
       FROM users u
       LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
       WHERE u.id = ?`,
      [req.params.id]
    );

    if (vendors.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลผู้ขายนี้' });
    }

    res.json(vendors[0]);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดึงข้อมูล Vendor สาธารณะ (ทั้งหมด) ==========
router.get('/vendors/public', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [vendors] = await pool.query(`
      SELECT 
        u.id, u.name, u.phone, u.created_at,
        vp.shop_name, vp.category, vp.description, vp.logo_url,
        COALESCE(AVG(r.rating), 0) AS avg_rating,
        COUNT(DISTINCT r.id) AS review_count,
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(DISTINCT p.id) as paid_bookings,
        GROUP_CONCAT(DISTINCT m.name ORDER BY m.name SEPARATOR ', ') as markets_joined,
        (
          SELECT vc.is_open 
          FROM vendor_checkins vc 
          WHERE vc.vendor_id = u.id AND vc.checkin_date = ? 
          ORDER BY vc.id DESC LIMIT 1
        ) as today_is_open
      FROM users u
      LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
      LEFT JOIN reviews r ON r.vendor_profile_id = vp.id 
      LEFT JOIN bookings b ON b.vendor_id = u.id
      LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
      LEFT JOIN stalls s ON b.stall_id = s.id
      LEFT JOIN markets m ON s.market_id = m.id
      WHERE u.role = 'vendor'
      GROUP BY u.id, vp.shop_name, vp.category, vp.description, vp.logo_url, u.name, u.phone, u.created_at
      ORDER BY paid_bookings DESC, u.created_at DESC
    `, [today]);
    
    const formattedVendors = vendors.map(v => ({
      ...v,
      avg_rating: Number(v.avg_rating),
      review_count: Number(v.review_count),
      today_is_open: v.today_is_open !== null ? v.today_is_open : 1
    }));

    res.json(formattedVendors);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดึงข้อมูล Vendor คนเดียว (แก้ไขแล้ว) ==========
router.get('/vendors/public/:id', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const [vendors] = await pool.query(`
      SELECT 
        u.id, u.name, u.phone, u.email, u.created_at,
        vp.shop_name, vp.category, vp.description, vp.logo_url,
        COUNT(DISTINCT b.id) as total_bookings,
        COUNT(DISTINCT p.id) as paid_bookings,
        GROUP_CONCAT(DISTINCT m.name ORDER BY m.name SEPARATOR ', ') as markets_joined
      FROM users u
      LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
      LEFT JOIN bookings b ON b.vendor_id = u.id
      LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
      LEFT JOIN stalls s ON b.stall_id = s.id
      LEFT JOIN markets m ON s.market_id = m.id
      WHERE u.id = ?
      GROUP BY u.id, vp.id
    `, [req.params.id]);

    if (vendors.length === 0) return res.status(404).json({ message: 'ไม่พบร้านค้า' });

    const [checkins] = await pool.query(`
      SELECT is_open FROM vendor_checkins 
      WHERE vendor_id = ? AND checkin_date = ? 
      ORDER BY id DESC LIMIT 1
    `, [req.params.id, today]);

    const todayIsOpen = checkins.length > 0 ? checkins[0].is_open : 1;

    const [history] = await pool.query(`
      SELECT DISTINCT m.id, m.name, m.province, m.start_date, m.end_date,
             s.lock_number, s.zone, b.book_date, p.status as payment_status
      FROM bookings b
      JOIN stalls s ON b.stall_id = s.id
      JOIN markets m ON s.market_id = m.id
      LEFT JOIN payments p ON p.booking_id = b.id
      WHERE b.vendor_id = ? AND p.status = 'paid'
      ORDER BY b.book_date DESC
    `, [req.params.id]);

    const [reviews] = await pool.query(`
      SELECT r.*, u.name as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.vendor_profile_id = (SELECT id FROM vendor_profiles WHERE user_id = ?)
      ORDER BY r.created_at DESC
    `, [req.params.id]);

    const [[avgData]] = await pool.query(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as total
      FROM reviews
      WHERE vendor_profile_id = (SELECT id FROM vendor_profiles WHERE user_id = ?)
    `, [req.params.id]);

    res.json({
      ...vendors[0],
      today_is_open: todayIsOpen,
      market_history: history,
      reviews,
      avg_rating: Number(avgData.avg_rating || 0).toFixed(1),
      review_count: avgData.total,
    });
  } catch (err) { 
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message }); 
  }
});

// ========== ลบผู้ใช้ และข้อมูลที่เกี่ยวข้องแบบ Cascade (สมบูรณ์) ==========
router.delete('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  const userId = req.params.id;

  if (Number(userId) === Number(req.user.id)) {
    return res.status(403).json({ message: 'ไม่สามารถลบบัญชี Admin ที่กำลังใช้งานอยู่ได้' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. ตรวจสอบว่าถ้าเป็น Organizer มีตลาดที่สร้างไว้หรือไม่
    const [markets] = await conn.query('SELECT id FROM markets WHERE organizer_id = ?', [userId]);
    const marketIds = markets.map(m => m.id);

    if (marketIds.length > 0) {
      // 1.1 ลบรีวิวของตลาดเหล่านี้
      await conn.query('DELETE FROM market_reviews WHERE market_id IN (?)', [marketIds]);

      // 1.2 ดึง stall_id ทั้งหมดของตลาดเหล่านี้
      const [stalls] = await conn.query('SELECT id FROM stalls WHERE market_id IN (?)', [marketIds]);
      const stallIds = stalls.map(s => s.id);

      if (stallIds.length > 0) {
        // ลบ payments ที่ผูกกับ bookings หรือ subscriptions ของ stalls
        await conn.query(`
          DELETE FROM payments 
          WHERE booking_id IN (SELECT id FROM bookings WHERE stall_id IN (?))
             OR subscription_id IN (SELECT id FROM subscriptions WHERE stall_id IN (?))
        `, [stallIds, stallIds]);

        // ลบ bookings และ subscriptions ใน stalls
        await conn.query('DELETE FROM bookings WHERE stall_id IN (?)', [stallIds]);
        await conn.query('DELETE FROM subscriptions WHERE stall_id IN (?)', [stallIds]);

        // ลบ stalls ทั้งหมดของตลาด
        await conn.query('DELETE FROM stalls WHERE market_id IN (?)', [marketIds]);
      }

      // 1.3 ลบข้อมูลอื่นๆ ที่ผูกกับตลาด
      await conn.query('DELETE FROM market_schedules WHERE market_id IN (?)', [marketIds]);
      await conn.query('DELETE FROM fee_payments WHERE market_id IN (?)', [marketIds]);
      await conn.query('DELETE FROM markets WHERE id IN (?)', [marketIds]);
    }

    // 2. ลบประวัติค่าธรรมเนียมของผู้จัดตลาด
    await conn.query('DELETE FROM fee_payments WHERE organizer_id = ?', [userId]);

    // 3. ลบข้อมูลฝั่งร้านค้า (Vendor) และรีวิวร้าน
    const [vp] = await conn.query('SELECT id FROM vendor_profiles WHERE user_id = ?', [userId]);
    if (vp.length > 0) {
      const vpIds = vp.map(v => v.id);
      await conn.query('DELETE FROM reviews WHERE vendor_profile_id IN (?)', [vpIds]);
      await conn.query('DELETE FROM posts WHERE vendor_profile_id IN (?)', [vpIds]).catch(() => {});
      await conn.query('DELETE FROM vendor_profiles WHERE user_id = ?', [userId]);
    }

    // ลบโพสต์และเช็คอิน
    await conn.query('DELETE FROM shop_posts WHERE vendor_id = ?', [userId]).catch(() => {});
    await conn.query('DELETE FROM vendor_checkins WHERE vendor_id = ?', [userId]).catch(() => {});

    // 4. ลบการเงินและการจองที่ผู้ใช้นี้เป็นคนทำรายการ
    await conn.query('DELETE FROM payments WHERE vendor_id = ?', [userId]);
    await conn.query('DELETE FROM bookings WHERE vendor_id = ?', [userId]);
    await conn.query('DELETE FROM subscriptions WHERE vendor_id = ?', [userId]).catch(() => {});

    // 5. ลบประวัติทั่วไปของผู้ใช้
    await conn.query('DELETE FROM market_reviews WHERE reviewer_id = ?', [userId]);
    await conn.query('DELETE FROM reviews WHERE reviewer_id = ?', [userId]);
    await conn.query('DELETE FROM applications WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM notifications WHERE user_id = ?', [userId]);
    await conn.query('DELETE FROM support_tickets WHERE reporter_id = ?', [userId]);

    // 6. ลบข้อมูลออกจากตาราง users เป็นลำดับสุดท้าย
    const [result] = await conn.query('DELETE FROM users WHERE id = ?', [userId]);

    await conn.commit();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบผู้ใช้งานนี้' });
    }

    res.json({ message: 'ลบผู้ใช้และข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว ✅' });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE USER ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบผู้ใช้', error: err.message });
  } finally {
    conn.release();
  }
});

// ========== แจ้งเตือนค่าธรรมเนียม ==========
router.post('/fees/notify', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT u.id, u.name, m.name as market_name, COALESCE(SUM(p.amount), 0) as total_paid
      FROM users u
      JOIN markets m ON m.organizer_id = u.id
      JOIN stalls s ON s.market_id = m.id
      JOIN bookings b ON b.stall_id = s.id
      JOIN payments p ON p.booking_id = b.id AND p.status = 'paid'
      WHERE u.role = 'organizer'
      GROUP BY u.id, m.id
      HAVING total_paid > 0
    `);

    const groupedData = rows.reduce((acc, row) => {
      if (!acc[row.id]) {
        acc[row.id] = { id: row.id, name: row.name, totalFee: 0, markets: [] };
      }
      acc[row.id].totalFee += Number(row.total_paid) * 0.1;
      acc[row.id].markets.push(row.market_name);
      return acc;
    }, {});

    const io = req.app.get('io');

    for (const orgId in groupedData) {
      const org = groupedData[orgId];
      const message = `คุณมียอด Platform Fee 10% จากตลาด (${org.markets.join(', ')}) รวมเป็นเงิน ฿${org.totalFee.toLocaleString()}`;

      if (io) io.to(`user_${orgId}`).emit('notification', { 
        title: '💰 สรุปค่าธรรมเนียม Platform Fee', 
        message: message,
        link: '/organizer/fees', 
        type: 'system',
      });

      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'system', ?)`,
        [org.id, '💰 สรุปค่าธรรมเนียม Platform Fee', message, '/organizer/fees']
      );
    }

    res.json({ message: `ส่งแจ้งเตือนสรุปยอดไปยัง ${Object.keys(groupedData).length} รายการแล้ว ✅` });
  } catch (err) { res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message }); }
});

// ========== ตั้งค่า Platform Settings ==========
router.get('/settings', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT `key`, `value` FROM platform_settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.put('/settings', authMiddleware, adminOnly, async (req, res) => {
  const { platform_fee_percent, bank_name, bank_account, bank_account_name, promptpay_qr } = req.body;
  try {
    const updates = [
      ['platform_fee_percent', platform_fee_percent ?? 10],
      ['bank_name', bank_name ?? ''],
      ['bank_account', bank_account ?? ''],
      ['bank_account_name', bank_account_name ?? ''],
      ['promptpay_qr', promptpay_qr ?? ''],
    ];
    for (const [key, value] of updates) {
      await pool.query(
        'INSERT INTO platform_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, value, value]
      );
    }
    res.json({ message: 'บันทึกสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ค่าธรรมเนียม Fee Payments ==========
router.get('/fee-payments', authMiddleware, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      [rows] = await pool.query(`
        SELECT fp.*, u.name as organizer_name, m.name as market_name
        FROM fee_payments fp
        JOIN users u ON fp.organizer_id = u.id
        JOIN markets m ON fp.market_id = m.id
        ORDER BY fp.created_at DESC
      `);
    } else {
      [rows] = await pool.query(`
        SELECT fp.*, u.name as organizer_name, m.name as market_name
        FROM fee_payments fp
        JOIN users u ON fp.organizer_id = u.id
        JOIN markets m ON fp.market_id = m.id
        WHERE fp.organizer_id = ?
        ORDER BY fp.created_at DESC
      `, [req.user.id]);
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.post('/fee-payments', authMiddleware, async (req, res) => {
  const { market_id, amount, slip_url, period } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO fee_payments (market_id, organizer_id, amount, slip_url, period)
       VALUES (?, ?, ?, ?, ?)`,
      [market_id, req.user.id, amount, slip_url, period || null]
    );
    res.status(201).json({ message: 'ส่งหลักฐานสำเร็จ ✅', id: result.insertId });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.put('/fee-payments/:id/verify', authMiddleware, adminOnly, async (req, res) => {
  try {
    await pool.query(
      'UPDATE fee_payments SET status = "paid" WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'ยืนยันสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.get('/settings/public', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT `key`, `value` FROM platform_settings WHERE `key` IN ('bank_name','bank_account','bank_account_name','promptpay_qr')"
    );
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.get('/vendors/public/:id/posts', async (req, res) => {
  try {
    const [posts] = await pool.query(
      `SELECT * FROM shop_posts WHERE vendor_id = ? ORDER BY created_at DESC`,
      [req.params.id]
    );
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== จัดการคำขอ Vendor ==========
router.get('/pending-vendors', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at, 
              vp.shop_name, vp.category, vp.logo_url, 
              vp.line_id, vp.instagram, vp.owner_name 
       FROM users u
       LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
       WHERE u.role = 'pending_vendor'
       ORDER BY u.created_at DESC`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

router.put('/pending-vendors/:id', authMiddleware, adminOnly, async (req, res) => {
  const { action } = req.body;
  try {
    const newRole = action === 'approve' ? 'vendor' : 'shopper';
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [newRole, req.params.id]);
    if (action === 'approve') {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, 'system', ?)`,
        [req.params.id, '🎉 ได้รับการอนุมัติเป็นผู้ค้า!', 'คุณสามารถเริ่มจองล็อคได้แล้ว กรุณา login ใหม่', '/vendor']
      );
    }
    res.json({ message: action === 'approve' ? 'อนุมัติสำเร็จ ✅' : 'ปฏิเสธแล้ว ❌' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดึงข้อมูลเชิงลึกของผู้ใช้แต่ละคน (ตาม Role) ==========
router.get('/users/:id/details', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [userRows] = await pool.query(
      'SELECT id, name, email, phone, role, is_suspended, market_quota, created_at FROM users WHERE id = ?',
      [req.params.id]
    );
    if (userRows.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้นี้' });
    const userData = userRows[0];

    let extraData = {};

    if (userData.role === 'vendor') {
      const [vendorRows] = await pool.query(
        'SELECT * FROM vendor_profiles WHERE user_id = ?',
        [userData.id]
      );
      extraData.vendor = vendorRows[0] || null;
    } else if (userData.role === 'organizer') {
      const [appRows] = await pool.query(
        'SELECT * FROM applications WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [userData.id]
      );
      const [marketRows] = await pool.query(
        'SELECT id, name, status, province FROM markets WHERE organizer_id = ?',
        [userData.id]
      );
      extraData.organizer = {
        application: appRows[0] || null,
        markets: marketRows || []
      };
    }

    res.json({ ...userData, extra: extraData });
  } catch (err) {
    console.error('GET USER DETAILS ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', error: err.message });
  }
});

// ========== Admin รีเซ็ตรหัสผ่านให้ผู้ใช้ ==========
router.put('/users/:id/reset-password', authMiddleware, adminOnly, async (req, res) => {
  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' });
  }

  try {
    let hashedPassword = new_password;
    try {
      const bcrypt = require('bcryptjs');
      hashedPassword = await bcrypt.hash(new_password, 10);
    } catch (e) {
      try {
        const bcrypt = require('bcrypt');
        hashedPassword = await bcrypt.hash(new_password, 10);
      } catch (err) {
        // fallback
      }
    }

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, req.params.id]);

    res.json({ message: 'รีเซ็ตรหัสผ่านให้ผู้ใช้สำเร็จแล้ว ✅' });
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน', error: err.message });
  }
});

module.exports = router;