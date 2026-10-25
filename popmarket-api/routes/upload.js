const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { uploadMarket, uploadSlip, uploadShop, uploadAvatar, uploadLayout } = require('../config/cloudinary');

// ==========================================
// 💬 ✅ เพิ่มใหม่: เส้นทางอัปโหลดทั่วไป (ใช้สำหรับแชท /api/upload)
// ==========================================
router.post('/', authMiddleware, uploadShop.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
  res.json({ url: req.file.path });
});

// ==========================================
// 🔒 เส้นทางสำหรับคนที่ล็อกอินแล้ว (ใช้อัปโหลดในระบบ)
// ==========================================

// อัปโหลดรูปตลาด
router.post('/market', authMiddleware, uploadMarket.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
  res.json({ url: req.file.path });
});

// อัปโหลดสลิป
router.post('/slip', authMiddleware, uploadSlip.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
  res.json({ url: req.file.path });
});

// อัปโหลดโลโก้ร้านค้า
router.post('/shop', authMiddleware, uploadShop.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
  res.json({ url: req.file.path });
});

// อัปโหลดรูปโปรไฟล์ส่วนตัว (avatar)
router.post('/avatar', authMiddleware, uploadAvatar.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
  res.json({ url: req.file.path });
});

router.post('/layout', authMiddleware, uploadLayout.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
  res.json({ url: req.file.path });
});

router.post('/qr', authMiddleware, uploadShop.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
  res.json({ url: req.file.path });
});


// ==========================================
// 🌐 ✅ เพิ่มใหม่: สำหรับหน้า Register (ไม่ต้องใช้ Token)
// ==========================================

router.post('/register/shop', uploadShop.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
  res.json({ url: req.file.path });
});

router.post('/register/market', uploadMarket.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'ไม่พบไฟล์' });
  res.json({ url: req.file.path });
});

module.exports = router;