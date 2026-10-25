const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');

// ========== 1. จองล็อค (รองรับทั้งตะกร้าแยกตามวัน, หลายวันล็อคเดียว และวันเดียว) ==========
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ message: 'เฉพาะ vendor เท่านั้น' });
  }

  const { items, stall_id, book_date, book_dates, note } = req.body;

  // จัดโครงสร้างรายการที่จะจองให้เป็น Array: [{ stall_id, book_date }]
  let bookingItems = [];
  if (Array.isArray(items) && items.length > 0) {
    bookingItems = items;
  } else if (stall_id && Array.isArray(book_dates) && book_dates.length > 0) {
    bookingItems = book_dates.map(d => ({ stall_id, book_date: d }));
  } else if (stall_id && book_date) {
    bookingItems = [{ stall_id, book_date }];
  }

  if (bookingItems.length === 0) {
    return res.status(400).json({ message: 'กรุณาเลือกล็อคและวันที่ต้องการจองอย่างน้อย 1 รายการ' });
  }

  try {
    // 1. ตรวจสอบการจองซ้ำซ้อนในแต่ละวัน (เพิ่ม 'rejected' เพื่อให้จองซ้ำได้หากถูกปฏิเสธ)
    for (const item of bookingItems) {
      const [existing] = await pool.query(
        `SELECT b.id, s.lock_number, DATE_FORMAT(b.book_date, '%Y-%m-%d') as b_date
         FROM bookings b
         JOIN stalls s ON b.stall_id = s.id
         WHERE b.stall_id = ? 
           AND DATE(b.book_date) = ?
           AND b.status NOT IN ('cancelled', 'expired', 'rejected')`,
        [item.stall_id, item.book_date]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          message: `ล็อค ${existing[0].lock_number} ถูกจองแล้วในวันที่ ${existing[0].b_date}`
        });
      }
    }

    // 2. ดึงข้อมูลราคาของทุกล็อคที่เลือกเพื่อคำนวณยอดรวม
    let grandTotalPrice = 0;
    let grandPlatformFee = 0;
    const resolvedItems = [];

    for (const item of bookingItems) {
      const [stalls] = await pool.query('SELECT * FROM stalls WHERE id = ?', [item.stall_id]);
      if (stalls.length === 0) {
        return res.status(404).json({ message: `ไม่พบล็อคไอดี ${item.stall_id}` });
      }
      const stall = stalls[0];
      const price = Number(stall.price_per_day);
      const fee = price * 0.10;
      const total = price + fee;

      grandTotalPrice += total;
      grandPlatformFee += fee;
      resolvedItems.push({ ...item, stall, total, fee });
    }

    // 3. สร้าง Batch ID สำหรับผูกกลุ่มการจองในบิลเดียวกัน
    const batchId = resolvedItems.length > 1 ? `BATCH_${Date.now()}_${req.user.id}` : null;
    let firstBookingId = null;

    for (const item of resolvedItems) {
      const formattedNote = batchId 
        ? `[จอง ${item.stall.lock_number} วันที่ ${item.book_date}] ${note || ''} #${batchId}#`.trim()
        : (note || null);

      const [result] = await pool.query(
        `INSERT INTO bookings 
          (stall_id, vendor_id, book_date, total_price, platform_fee, status, note)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [item.stall_id, req.user.id, item.book_date, item.total, item.fee, formattedNote]
      );

      if (!firstBookingId) firstBookingId = result.insertId;
    }

    res.status(201).json({
      message: `จองสำเร็จทั้งหมด ${resolvedItems.length} รายการ ✅`,
      bookingId: firstBookingId,
      totalPrice: grandTotalPrice,
      platformFee: grandPlatformFee,
      itemsCount: resolvedItems.length
    });

  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการจอง', error: err.message });
  }
});

// ========== 2. ดึงรายการตลาด/ล็อคที่จองแบบรายวัน (สถานะ confirmed) ==========
router.get('/vendor/active-bookings', authMiddleware, async (req, res) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ message: 'เฉพาะ vendor เท่านั้น' });
  }
  try {
    const [bookings] = await pool.query(
      `SELECT b.id, 
              DATE_FORMAT(b.book_date, '%Y-%m-%d') AS book_date, 
              DATE_FORMAT(b.book_date, '%Y-%m-%d') AS end_date, 
              b.status, 
              s.id AS stall_id, s.lock_number, s.zone, 
              m.name AS market_name, m.id AS market_id
       FROM bookings b
       JOIN stalls s ON b.stall_id = s.id
       JOIN markets m ON s.market_id = m.id
       WHERE b.vendor_id = ? AND b.status = 'confirmed'
       ORDER BY b.book_date DESC`,
      [req.user.id]
    );
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 3. ดูประวัติการจองของตัวเอง ==========
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [bookings] = await pool.query(
      `SELECT b.*, 
              DATE_FORMAT(b.book_date, '%Y-%m-%d') AS book_date, 
              b.total_price,
              s.lock_number, s.zone,
              m.name AS market_name, m.id AS market_id
       FROM bookings b
       JOIN stalls s ON b.stall_id = s.id
       JOIN markets m ON s.market_id = m.id
       WHERE b.vendor_id = ? 
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(bookings);
  } catch (err) {
    console.error('Bookings/my error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 4. ดูรายละเอียดการจองตาม ID ==========
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const [bookings] = await pool.query(
      `SELECT b.*, 
              DATE_FORMAT(b.book_date, '%Y-%m-%d') AS book_date, 
              s.lock_number, s.zone, m.name AS market_name 
       FROM bookings b
       JOIN stalls s ON b.stall_id = s.id
       JOIN markets m ON s.market_id = m.id
       WHERE b.id = ?`,
      [req.params.id]
    );
    if (bookings.length === 0) {
      return res.status(404).json({ message: 'ไม่พบการจองนี้' });
    }
    res.json(bookings[0]);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 5. ลบ/ยกเลิกการจองพื้นที่ ==========
router.delete('/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'vendor') {
    return res.status(403).json({ message: 'เฉพาะ vendor เท่านั้น' });
  }
  
  try {
    const bookingId = req.params.id;
    const [bookings] = await pool.query(
      `SELECT * FROM bookings WHERE id = ? AND vendor_id = ?`, 
      [bookingId, req.user.id]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลการจองนี้' });
    }

    if (bookings[0].status !== 'pending') {
      return res.status(400).json({ message: 'สามารถลบได้เฉพาะสถานะ pending เท่านั้น' });
    }

    await pool.query('DELETE FROM payments WHERE booking_id = ?', [bookingId]);

    const note = bookings[0].note || '';
    const match = note.match(/#(BATCH_[^#]+)#/);
    if (match) {
      await pool.query(
        'DELETE FROM bookings WHERE vendor_id = ? AND note LIKE ?',
        [req.user.id, `%${match[1]}%`]
      );
    } else {
      await pool.query('DELETE FROM bookings WHERE id = ?', [bookingId]);
    }

    res.json({ message: 'ยกเลิกการจองสำเร็จ ✅' });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

module.exports = router;