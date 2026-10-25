const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const authMiddleware = require('../middleware/auth');
const { sendNotification } = require('./notifications');
const promptpayQR = require('promptpay-qr');
const qrcode = require('qrcode');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'popmarket',
  waitForConnections: true,
  connectionLimit: 10,
});

// ========== อัปโหลดสลิป (vendor) ==========
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ message: 'เฉพาะ vendor เท่านั้น' });
  }

  const { booking_id, amount, method, slip_url } = req.body;

  if (!booking_id || !amount || !method || !slip_url) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ' });
  }

  try {
    const [bookings] = await pool.query(
      'SELECT * FROM bookings WHERE id = ? AND vendor_id = ?',
      [booking_id, req.user.id]
    );
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'ไม่พบการจองนี้' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM payments WHERE booking_id = ?', [booking_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'มีการชำระเงินแล้ว' });
    }

    const [result] = await pool.query(
      `INSERT INTO payments (booking_id, amount, method, slip_url, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [booking_id, amount, method, slip_url]
    );

    res.status(201).json({
      message: 'อัปโหลดสลิปสำเร็จ ✅ รอ organizer ยืนยัน',
      paymentId: result.insertId
    });

  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดูร้านค้าที่ paid ของตลาด (public) ==========
router.get('/market/:marketId/vendors', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [vendors] = await pool.query(
      `SELECT p.*, b.book_date,
              s.lock_number, s.zone, s.market_id,
              u.id AS user_id,
              u.name AS vendor_name,
              u.phone AS vendor_phone,
              vp.id AS vendor_profile_id,
              vp.user_id AS vendor_user_id,
              vp.logo_url,
              vp.shop_name,
              vp.description,
              vp.category,
              vc.is_open AS checkin_is_open
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN stalls s ON b.stall_id = s.id
       JOIN users u ON b.vendor_id = u.id
       LEFT JOIN vendor_profiles vp ON vp.user_id = b.vendor_id
       LEFT JOIN vendor_checkins vc ON vc.vendor_id = b.vendor_id 
            AND vc.market_id = ? 
            AND vc.checkin_date = ?
       WHERE s.market_id = ? 
       AND p.status = 'paid'
       AND b.book_date >= CURDATE()
       ORDER BY p.paid_at DESC`,
      [req.params.marketId, today, req.params.marketId]
    );
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดูรายการชำระเงินทั้งหมดของตลาด (organizer) พ่วงดึงทุกวันในบิลเดียว ==========
router.get('/market/:marketId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'สิทธิ์ไม่เพียงพอ' });
  }
  try {
    const [payments] = await pool.query(
      `SELECT p.*, b.book_date, b.total_price, b.note,
              s.lock_number, s.zone, s.market_id,
              m.name AS market_name,
              u.id AS user_id,
              u.name AS vendor_name,
              u.phone AS vendor_phone,
              COALESCE(vp.shop_name, u.name) AS shop_name,
              COALESCE(vp.category, 'ทั่วไป') AS category,
              COALESCE(vp.description, 'ไม่มีคำอธิบาย') AS description,
              vp.logo_url
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       JOIN stalls s ON b.stall_id = s.id
       JOIN markets m ON s.market_id = m.id
       JOIN users u ON b.vendor_id = u.id
       LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
       WHERE m.id = ? AND m.organizer_id = ?
       ORDER BY p.created_at DESC`,
      [req.params.marketId, req.user.id]
    );

    // 🟢 ดึงรายละเอียดรายการจองทั้งหมดที่อยู่ในชุดเดียวกัน (Multi-day items)
    for (let p of payments) {
      let items = [];
      if (p.note) {
        const match = p.note.match(/#(BATCH_[^#]+|B_[^#]+)#/);
        if (match) {
          const [batchRows] = await pool.query(
            `SELECT b.id, b.stall_id, DATE_FORMAT(b.book_date, '%Y-%m-%d') as book_date, b.status,
                    s.lock_number, s.zone, s.price_per_day
             FROM bookings b
             JOIN stalls s ON b.stall_id = s.id
             WHERE b.vendor_id = ? AND b.note LIKE ?
             ORDER BY b.book_date ASC`,
            [p.user_id, `%${match[0]}%`]
          );
          items = batchRows;
        }
      }

      if (items.length === 0) {
        items = [{
          id: p.booking_id,
          stall_id: p.stall_id,
          lock_number: p.lock_number,
          zone: p.zone,
          book_date: p.book_date ? p.book_date.toString().slice(0, 10) : '-',
          status: p.status
        }];
      }
      p.booking_items = items;
    }

    res.json(payments);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ยืนยัน / ปฏิเสธ การชำระเงิน (รองรับการใส่เหตุผลปฏิเสธ) ==========
router.put('/:id/verify', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { action, reason } = req.body; // 'approve' หรือ 'reject' พร้อมเหตุผล

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'action ไม่ถูกต้อง' });
  }

  try {
    const [payments] = await pool.query('SELECT * FROM payments WHERE id = ?', [id]);
    if (payments.length === 0) {
      return res.status(404).json({ message: 'ไม่พบรายการชำระเงินนี้' });
    }

    const payment = payments[0];
    const paymentStatus = action === 'approve' ? 'paid' : 'rejected';
    const bookingStatus = action === 'approve' ? 'confirmed' : 'cancelled';

    // 1. อัปเดตตาราง payments
    await pool.query('UPDATE payments SET status = ? WHERE id = ?', [paymentStatus, id]);

    // 2. อัปเดตตาราง bookings พร้อมบันทึกเหตุผลหากถูกปฏิเสธ
    if (payment.booking_id) {
      const [bRows] = await pool.query('SELECT vendor_id, note FROM bookings WHERE id = ?', [payment.booking_id]);
      const currentNote = bRows[0]?.note || '';
      const match = currentNote.match(/#(BATCH_[^#]+|B_[^#]+)#/);

      let updatedNote = currentNote;
      if (action === 'reject' && reason) {
        updatedNote = `${currentNote} [เหตุผลที่ปฏิเสธ: ${reason}]`.trim();
      }

      if (match) {
        await pool.query(
          'UPDATE bookings SET status = ?, note = ? WHERE note LIKE ?',
          [bookingStatus, updatedNote, `%${match[0]}%`]
        );
      } else {
        await pool.query(
          'UPDATE bookings SET status = ?, note = ? WHERE id = ?',
          [bookingStatus, updatedNote, payment.booking_id]
        );
      }

      // ส่ง Notification แจ้งเตือนพ่อค้าแม่ค้า
      if (bRows[0] && typeof sendNotification === 'function') {
        try {
          await sendNotification(
            bRows[0].vendor_id,
            action === 'approve' ? 'การจองได้รับการอนุมัติแล้ว ✅' : 'การจองพื้นที่ถูกปฏิเสธ ❌',
            action === 'approve'
              ? 'คำขอจองพื้นที่ของคุณได้รับการอนุมัติเรียบร้อยแล้ว'
              : `คำขอจองถูกปฏิเสธเนื่องจาก: ${reason || 'ข้อมูลหรือหลักฐานไม่ผ่านเกณฑ์'}`
          );
        } catch (e) {}
      }
    }

    res.json({ 
      message: action === 'approve' ? 'ยืนยันการชำระเงินสำเร็จ ✅' : 'ปฏิเสธการชำระเงินเรียบร้อย ❌' 
    });

  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการยืนยันชำระเงิน', error: err.message });
  }
});

// ========== สร้าง Dynamic PromptPay QR Code ==========
router.post('/generate-qr', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  try {
    const [rows] = await pool.query(
      "SELECT promptpay_number FROM users WHERE id = ?",
      [req.user.id]
    );

    const promptpayNumber = (rows.length > 0 && rows[0].promptpay_number) 
      ? rows[0].promptpay_number 
      : '0956061884';

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'ยอดเงินไม่ถูกต้อง' });
    }

    const payload = promptpayQR(promptpayNumber, { amount: Number(amount) });
    const qrCodeUrl = await qrcode.toDataURL(payload);

    res.json({ qrCodeUrl });
  } catch (err) {
    console.error('Generate QR Error:', err);
    res.status(500).json({ message: 'ไม่สามารถสร้าง QR Code ได้', error: err.message });
  }
});

module.exports = router;