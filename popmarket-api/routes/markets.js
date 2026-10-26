const express = require('express');
const router = express.Router();
const pool = require('../db');
const authMiddleware = require('../middleware/auth');



// ========== ✅ ตรวจสอบและอัปเดตสถานะตลาดเปิด/ปิดอัตโนมัติตาม market_schedule ==========
const updateMarketStatusBySchedule = async () => {
  try {
    // 1. ปิดตลาดที่เลยช่วงวันสุดท้ายไปแล้ว
    await pool.query(
      `UPDATE markets 
       SET status = 'closed' 
       WHERE end_date < CURDATE() 
       AND status NOT IN ('closed', 'suspended', 'pending')`
    );

    // 2. ปิดตลาดสำหรับวันที่ไม่อยู่ในตารางเปิดทำการของวันนี้
    await pool.query(
      `UPDATE markets m 
       SET m.status = 'closed' 
       WHERE m.status = 'active' 
       AND m.status NOT IN ('suspended', 'pending')
       AND NOT EXISTS (
         SELECT 1 FROM market_schedule ms 
         WHERE ms.market_id = m.id 
         AND ms.market_date = CURDATE() 
         AND ms.is_active = TRUE
       )`
    );

    // 3. เปิดตลาดอัตโนมัติหากวันนี้ตรงกับวันที่เปิดใน market_schedule
    await pool.query(
      `UPDATE markets m 
       JOIN market_schedule ms ON m.id = ms.market_id 
       SET m.status = 'active' 
       WHERE ms.market_date = CURDATE() 
       AND ms.is_active = TRUE 
       AND m.status NOT IN ('suspended', 'pending')`
    );
  } catch (err) {
    console.error('updateMarketStatusBySchedule error:', err);
  }
};

// ========== 🟢 ดึงรายชื่อผู้ขายที่จองล็อคในตลาดนี้ พร้อมโปรไฟล์ร้านค้า ==========
router.get('/:marketId/vendors-registry', authMiddleware, async (req, res) => {
  try {
    const [vendors] = await pool.query(
      `SELECT DISTINCT 
              u.id AS user_id, 
              u.name AS vendor_name, 
              u.email, 
              u.phone,
              COALESCE(vp.shop_name, u.name) AS shop_name,
              COALESCE(vp.category, 'ทั่วไป') AS category,
              COALESCE(vp.description, 'ไม่มีคำอธิบาย') AS description,
              vp.logo_url
       FROM bookings b
       JOIN stalls s ON b.stall_id = s.id
       JOIN users u ON b.vendor_id = u.id
       LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
       WHERE s.market_id = ? AND b.status NOT IN ('cancelled', 'expired')`,
      [req.params.marketId]
    );

    res.json(vendors);
  } catch (err) {
    console.error('vendors-registry error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดูตลาดทั้งหมด (ทุกคนดูได้ + แปลงประเภทตัวเลข) ==========
router.get('/', async (req, res) => {
  try {
    await updateMarketStatusBySchedule();
    const [rows] = await pool.query(
      `SELECT 
        m.*, 
        u.name AS organizer_name,
        COALESCE(AVG(mr.rating), 0) AS avg_rating,
        COUNT(mr.id) AS review_count
        FROM markets m 
        JOIN users u ON m.organizer_id = u.id
        LEFT JOIN market_reviews mr ON mr.market_id = m.id
        GROUP BY m.id, u.id
        ORDER BY m.created_at DESC`
    );

    const markets = rows.map(m => ({
      ...m,
      avg_rating: Number(m.avg_rating),
      review_count: Number(m.review_count)
    }));

    res.json(markets);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดูตลาด featured หน้าแรก ==========
router.get('/featured', async (req, res) => {
  try {
    await updateMarketStatusBySchedule();
    const [rows] = await pool.query(
      `SELECT 
        m.*, 
        u.name AS organizer_name,
        COALESCE(AVG(mr.rating), 0) AS avg_rating,
        COUNT(mr.id) AS review_count
        FROM markets m 
        JOIN users u ON m.organizer_id = u.id
        LEFT JOIN market_reviews mr ON mr.market_id = m.id
        WHERE m.is_featured = true AND m.status = 'active'
        GROUP BY m.id, u.id
        ORDER BY m.created_at DESC`
    );

    const markets = rows.map(m => ({
      ...m,
      avg_rating: Number(m.avg_rating),
      review_count: Number(m.review_count)
    }));

    res.json(markets);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== ดูตลาดตาม id (พร้อมพ่วงตารางเวลา market_schedule) ==========
router.get('/:id', async (req, res) => {
  try {
    await updateMarketStatusBySchedule();
    const [markets] = await pool.query(
      `SELECT 
        m.*, 
        u.name AS organizer_name,
        u.bank_name, u.bank_account, u.bank_account_name, u.promptpay_qr,
        COALESCE(AVG(mr.rating), 0) AS avg_rating,
        COUNT(mr.id) AS review_count
        FROM markets m 
        JOIN users u ON m.organizer_id = u.id
        LEFT JOIN market_reviews mr ON mr.market_id = m.id
        WHERE m.id = ?
        GROUP BY m.id, u.id`,
      [req.params.id]
    );
    if (markets.length === 0) {
      return res.status(404).json({ message: 'ไม่พบตลาดนี้' });
    }

    const [stalls] = await pool.query(
      'SELECT * FROM stalls WHERE market_id = ? AND is_active = true',
      [req.params.id]
    );

    const [schedule] = await pool.query(
      'SELECT * FROM market_schedule WHERE market_id = ? AND is_active = true ORDER BY market_date ASC',
      [req.params.id]
    );

    const marketData = {
      ...markets[0],
      avg_rating: Number(markets[0].avg_rating),
      review_count: Number(markets[0].review_count),
      stalls,
      schedule
    };

    res.json(marketData);
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 🟢 สร้างตลาด (เช็คโควตา + บันทึกสิ่งอำนวยความสะดวก + บันทึกวันเปิดทำการ) ==========
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'สิทธิ์ไม่เพียงพอ' });
  }

  // 1. ตรวจสอบโควตาตลาดของ Organizer (Admin ยกเว้นการตรวจ)
  if (req.user.role === 'organizer') {
    const [userRows] = await pool.query('SELECT market_quota FROM users WHERE id = ?', [req.user.id]);
    const userQuota = userRows[0]?.market_quota || 0;

    const [myMarkets] = await pool.query('SELECT COUNT(*) as count FROM markets WHERE organizer_id = ?', [req.user.id]);
    const currentCount = myMarkets[0]?.count || 0;

    if (currentCount >= userQuota) {
      return res.status(403).json({ 
        message: `คุณสร้างตลาดครบตามโควตาแล้ว (${currentCount}/${userQuota} ตลาด) กรุณายื่นเรื่องขอเพิ่มตลาดใหม่เพื่อรอ Admin อนุมัติสิทธิ์` 
      });
    }
  }

  const { 
    name, description, start_date, end_date, 
    open_time, close_time, address, province, lat, lng,
    cover_url, layout_url, parking_info, parking_url, has_parking, has_restroom,
    parking_slots, restrooms, area_size,
    selected_dates 
  } = req.body; 

  if (!name || !start_date || !end_date) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อตลาดและวันที่' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO markets 
          (organizer_id, name, description, start_date, end_date, 
           open_time, close_time, address, province, lat, lng, 
           cover_url, layout_url, has_parking, has_restroom, 
           parking_slots, restrooms, area_size, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`, 
      [
        req.user.id, name, description || null, start_date, end_date,
        open_time || null, close_time || null, address || null, 
        province || null, lat || null, lng || null,
        cover_url || null, layout_url || null,
        has_parking || 0, has_restroom || 0,
        parking_slots || null, restrooms || null, area_size || null
      ]
    );

    const marketId = result.insertId;

    if (selected_dates && selected_dates.length > 0) {
      for (let date of selected_dates) {
        await connection.query(
          `INSERT INTO market_schedule (market_id, market_date, open_time, close_time) VALUES (?, ?, ?, ?)`,
          [marketId, date, open_time || null, close_time || null]
        );
      }
    }

    await connection.commit();
    res.status(201).json({ 
      message: 'สร้างตลาดสำเร็จ ✅',
      marketId: marketId 
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างตลาด', error: err.message });
  } finally {
    connection.release();
  }
});

// ========== 📌 API บันทึก/อัปเดตตารางวันเปิดทำการเฉพาะตลาด ==========
router.post('/:id/schedule', authMiddleware, async (req, res) => {
  const marketId = req.params.id;
  const { dates, open_time, close_time } = req.body; 

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query('DELETE FROM market_schedule WHERE market_id = ?', [marketId]);

    if (dates && dates.length > 0) {
      for (let date of dates) {
        await connection.query(
          `INSERT INTO market_schedule (market_id, market_date, open_time, close_time) VALUES (?, ?, ?, ?)`,
          [marketId, date, open_time || null, close_time || null]
        );
      }
    }

    await connection.commit();
    res.json({ message: 'บันทึกตารางวันเปิดตลาดสำเร็จ ✅' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกตารางเวลา', error: err.message });
  } finally {
    connection.release();
  }
});

// ========== 📌 API ดึงตารางวันเปิดทำการของตลาดนั้นๆ ==========
router.get('/:id/schedule', async (req, res) => {
  const marketId = req.params.id;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM market_schedule WHERE market_id = ? AND is_active = TRUE ORDER BY market_date ASC`,
      [marketId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลตารางเวลาได้', error: err.message });
  }
});

// ========== 🟢 แก้ไขตลาด (รองรับอัปเดตสิ่งอำนวยความสะดวก) ==========
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const [markets] = await pool.query(
      'SELECT * FROM markets WHERE id = ?', [req.params.id]
    );
    if (markets.length === 0) {
      return res.status(404).json({ message: 'ไม่พบตลาดนี้' });
    }
    if (markets[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่ใช่เจ้าของตลาดนี้' });
    }

    const {
      name, description, start_date, end_date,
      open_time, close_time, address, province,
      lat, lng, status, is_featured,
      cover_url, layout_url, has_parking, parking_info, parking_url,
      has_restroom,
      parking_slots, restrooms, area_size
    } = req.body;

    await pool.query(
      `UPDATE markets SET
         name = ?,
         description = ?,
         start_date = ?,
         end_date = ?,
         open_time = ?,
         close_time = ?,
         address = ?,
         province = ?,
         lat = ?,
         lng = ?,
         status = ?,
         is_featured = ?,
         cover_url = ?,
         layout_url = ?,   
         has_parking = ?,
         parking_info = COALESCE(?, parking_info),
         parking_url  = COALESCE(?, parking_url),
         has_restroom = ?,
         parking_slots = ?,
         restrooms = ?,
         area_size = ?
       WHERE id = ?`,
      [
        name || markets[0].name,
        description ?? markets[0].description,
        start_date || markets[0].start_date,
        end_date || markets[0].end_date,
        open_time ?? markets[0].open_time,
        close_time ?? markets[0].close_time,
        address ?? markets[0].address,
        province ?? markets[0].province,
        lat ?? markets[0].lat,
        lng ?? markets[0].lng,
        status || markets[0].status,
        is_featured !== undefined ? is_featured : markets[0].is_featured,
        cover_url ?? markets[0].cover_url,
        layout_url ?? markets[0].layout_url,
        has_parking ?? markets[0].has_parking,
        parking_info || null, 
        parking_url  || null, 
        has_restroom ?? markets[0].has_restroom,
        parking_slots !== undefined ? parking_slots : markets[0].parking_slots,
        restrooms !== undefined ? restrooms : markets[0].restrooms,
        area_size !== undefined ? area_size : markets[0].area_size,
        req.params.id
      ]
    );

    res.json({ message: 'แก้ไขตลาดสำเร็จ ✅' });
  } catch (err) {
    console.error('PUT error:', err.message);
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 🗑️ ลบตลาด และข้อมูลลูกทั้งหมดแบบ Cascade (Transaction) ==========
router.delete('/:id', authMiddleware, async (req, res) => {
  const marketId = req.params.id;

  const conn = await pool.getConnection();
  try {
    const [markets] = await conn.query(
      'SELECT * FROM markets WHERE id = ?', [marketId]
    );
    if (markets.length === 0) {
      return res.status(404).json({ message: 'ไม่พบตลาดนี้' });
    }
    if (markets[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่ใช่เจ้าของตลาดนี้' });
    }

    await conn.beginTransaction();

    // 1. ดึง stall_id ทั้งหมดของตลาดนี้
    const [stalls] = await conn.query('SELECT id FROM stalls WHERE market_id = ?', [marketId]);
    const stallIds = stalls.map(s => s.id);

    if (stallIds.length > 0) {
      // 1.1 ลบ payments ที่ผูกกับ bookings หรือ subscriptions ของ stalls ในตลาดนี้
      await conn.query(`
        DELETE FROM payments 
        WHERE booking_id IN (SELECT id FROM bookings WHERE stall_id IN (?))
           OR subscription_id IN (SELECT id FROM subscriptions WHERE stall_id IN (?))
      `, [stallIds, stallIds]).catch(() => {});

      // 1.2 ลบ bookings และ subscriptions
      await conn.query('DELETE FROM bookings WHERE stall_id IN (?)', [stallIds]);
      await conn.query('DELETE FROM subscriptions WHERE stall_id IN (?)', [stallIds]).catch(() => {});

      // 1.3 ลบ stalls ทั้งหมดของตลาด
      await conn.query('DELETE FROM stalls WHERE market_id = ?', [marketId]);
    }

    // 2. ลบข้อมูลที่ผูกกับตลาดโดยตรง
    await conn.query('DELETE FROM market_reviews WHERE market_id = ?', [marketId]).catch(() => {});
    await conn.query('DELETE FROM market_schedule WHERE market_id = ?', [marketId]).catch(() => {});
    await conn.query('DELETE FROM market_schedules WHERE market_id = ?', [marketId]).catch(() => {});
    await conn.query('DELETE FROM fee_payments WHERE market_id = ?', [marketId]).catch(() => {});

    // 3. ลบตลาดออกจากตาราง markets เป็นลำดับสุดท้าย
    const [result] = await conn.query('DELETE FROM markets WHERE id = ?', [marketId]);

    await conn.commit();

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'ไม่พบตลาดนี้' });
    }

    res.json({ message: 'ลบตลาดและข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว ✅' });
  } catch (err) {
    await conn.rollback();
    console.error('DELETE MARKET ERROR:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบตลาด', error: err.message });
  } finally {
    conn.release();
  }
});

// ========== เพิ่มล็อคในตลาด ==========
router.post('/:id/stalls', authMiddleware, async (req, res) => {
  try {
    const [markets] = await pool.query(
      'SELECT * FROM markets WHERE id = ?', [req.params.id]
    );
    if (markets.length === 0) {
      return res.status(404).json({ message: 'ไม่พบตลาดนี้' });
    }
    if (markets[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่ใช่เจ้าของตลาดนี้' });
    }

    const { lock_number, zone, size_sqm, price_per_day } = req.body;

    if (!lock_number || !price_per_day) {
      return res.status(400).json({ message: 'กรุณากรอกหมายเลขล็อคและราคา' });
    }

    const [result] = await pool.query(
      `INSERT INTO stalls (market_id, lock_number, zone, size_sqm, price_per_day)
       VALUES (?, ?, ?, ?, ?)`,
      [req.params.id, lock_number, zone || null, size_sqm || null, price_per_day]
    );

    res.status(201).json({ 
      message: 'เพิ่มล็อคสำเร็จ ✅',
      stallId: result.insertId 
    });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 🟢 เพิ่มล็อคแบบกลุ่มทีละหลายล็อค (Batch Stalls Creation) ==========
router.post('/:id/stalls/batch', authMiddleware, async (req, res) => {
  try {
    const [markets] = await pool.query('SELECT * FROM markets WHERE id = ?', [req.params.id]);
    if (markets.length === 0) {
      return res.status(404).json({ message: 'ไม่พบตลาดนี้' });
    }
    if (markets[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่ใช่เจ้าของตลาดนี้' });
    }

    const { stalls } = req.body;
    if (!Array.isArray(stalls) || stalls.length === 0) {
      return res.status(400).json({ message: 'ไม่มีข้อมูลล็อคที่จะสร้าง' });
    }

    const values = stalls.map(s => [
      req.params.id,
      s.lock_number,
      s.zone || null,
      s.size_sqm || null,
      s.price_per_day
    ]);

    await pool.query(
      `INSERT INTO stalls (market_id, lock_number, zone, size_sqm, price_per_day) VALUES ?`,
      [values]
    );

    res.status(201).json({ 
      message: `สร้างล็อคสำเร็จทั้งหมด ${stalls.length} ล็อค ✅` 
    });
  } catch (err) {
    console.error('Batch stalls error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างล็อคแบบกลุ่ม', error: err.message });
  }
});

// ========== ดูล็อคว่างของตลาดตามวันที่ ==========
router.get('/:id/stalls/available', async (req, res) => {
  const { date } = req.query; 

  if (!date) {
    return res.status(400).json({ message: 'กรุณาระบุวันที่ ?date=YYYY-MM-DD' });
  }

  try {
    const [stalls] = await pool.query(
      `SELECT s.* FROM stalls s
       WHERE s.market_id = ?
       AND s.is_active = true
       AND s.id NOT IN (
         SELECT stall_id FROM bookings 
         WHERE book_date = ? 
         AND status NOT IN ('cancelled', 'expired', 'rejected')
       )`,
      [req.params.id, date]
    );

    res.json({ date, available_stalls: stalls });
  } catch (err) {
    res.status(500).json({ message: 'เกิดข้อผิดพลาด', error: err.message });
  }
});

// ========== 🟢 ดึงรายการล็อคที่ถูกจองแล้วตามวันที่ (พร้อมชื่อร้านและหมวดหมู่) ==========
router.get('/:id/booked-stalls', async (req, res) => {
  const { date, dates, month } = req.query;
  const marketId = req.params.id;

  try {
    let query = `
      SELECT 
        b.stall_id,
        s.lock_number,
        s.zone,
        DATE_FORMAT(b.book_date, '%Y-%m-%d') as book_date,
        b.status,
        u.name AS vendor_name,
        COALESCE(vp.shop_name, u.name) AS shop_name,
        COALESCE(vp.category, 'ทั่วไป') AS category,
        vp.logo_url
      FROM bookings b
      JOIN stalls s ON b.stall_id = s.id
      JOIN users u ON b.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
      WHERE s.market_id = ?
        AND b.status IN ('paid', 'confirmed', 'pending')
    `;
    const params = [marketId];

    if (dates) {
      const dateList = dates.split(',').map(d => d.trim()).filter(Boolean);
      if (dateList.length > 0) {
        query += ` AND DATE(b.book_date) IN (?)`;
        params.push(dateList);
      }
    } else if (date) {
      query += ` AND DATE(b.book_date) = ?`;
      params.push(date);
    } else if (month) {
      query += ` AND DATE_FORMAT(b.book_date, '%Y-%m') = ? AND DATE(b.book_date) >= CURDATE()`;
      params.push(month);
    }

    const [dailyBookings] = await pool.query(query, params);

    let subQuery = `
      SELECT 
        sub.stall_id,
        s.lock_number,
        s.zone,
        sub.target_month,
        sub.status,
        u.name AS vendor_name,
        COALESCE(vp.shop_name, u.name) AS shop_name,
        COALESCE(vp.category, 'ทั่วไป') AS category,
        vp.logo_url
      FROM subscriptions sub
      JOIN stalls s ON sub.stall_id = s.id
      JOIN users u ON sub.vendor_id = u.id
      LEFT JOIN vendor_profiles vp ON vp.user_id = u.id
      WHERE s.market_id = ?
        AND sub.status IN ('active', 'pending')
    `;
    const subParams = [marketId];
    if (month) {
      subQuery += ` AND sub.target_month = ?`;
      subParams.push(month);
    } else if (date || dates) {
      const firstDate = date || dates.split(',')[0];
      const targetMonth = firstDate.slice(0, 7);
      subQuery += ` AND sub.target_month = ?`;
      subParams.push(targetMonth);
    }

    const [subBookings] = await pool.query(subQuery, subParams).catch(() => [[]]);

    res.json([...dailyBookings, ...subBookings]);
  } catch (err) {
    console.error('get booked stalls error:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลล็อคที่จองแล้ว', error: err.message });
  }
});

module.exports = router;