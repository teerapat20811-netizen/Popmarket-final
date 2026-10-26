const express = require('express');
const cors = require('cors');
const pool = require('./db');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config(); // ✅ โหลด .env

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const ticketRoutes = require('./routes/tickets');
const applicationRoutes = require('./routes/applications');
const marketRoutes = require('./routes/markets');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const uploadRoutes = require('./routes/upload');
const { router: notifRoutes } = require('./routes/notifications');
const reviewRoutes = require('./routes/reviews');
const marketReviewRouter = require('./routes/market_reviews');
const stallRoutes = require('./routes/stalls');
const postRoutes = require('./routes/posts');
const subscriptionRoutes = require('./routes/subscriptions');
const vendorAppRoutes = require('./routes/vendor-applications');
const messageRoutes = require('./routes/messages');

// ✅ สร้าง app ก่อน แล้วค่อย use routes
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});

app.use(cors());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// แชร์ io ให้ routes ใช้ได้
app.set('io', io);

// ✅ DB ใช้ .env แทน hardcode


// ✅ Register routes ทั้งหมดอยู่ที่เดียวกัน เป็นระเบียบ
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin/tickets', ticketRoutes); // 🟢 รองรับเส้นทางของ Admin สำหรับจัดการ Ticket
app.use('/api/applications', applicationRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notifRoutes); 
app.use('/api/reviews', reviewRoutes);
app.use('/api/market_reviews', marketReviewRouter);
app.use('/api/stalls', stallRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/vendor-applications', vendorAppRoutes);
app.use('/api/messages', messageRoutes);

// ✅ Global error handler (ต้องอยู่หลัง routes เสมอ)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Socket.io Events
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ========== CRON: Monthly Fee Notification ==========
const cron = require('node-cron');
const { sendNotification } = require('./routes/notifications');

cron.schedule('0 9 1 * *', async () => {
  console.log('📨 Running monthly fee notification...');
  try {
    const [organizers] = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        SUM(b.amount)       AS total_paid,
        SUM(b.amount) * 0.1 AS fee_amount
      FROM users u
      JOIN markets m  ON m.organizer_id = u.id
      JOIN bookings b ON b.market_id    = m.id
      WHERE b.payment_status = 'paid'
        AND MONTH(b.created_at) = MONTH(NOW() - INTERVAL 1 MONTH)
        AND YEAR(b.created_at)  = YEAR(NOW()  - INTERVAL 1 MONTH)
      GROUP BY u.id, u.name, u.email
      HAVING fee_amount > 0
    `);

    for (const org of organizers) {
      await sendNotification(
        io,
        org.id,
        '💰 ค่าธรรมเนียม Platform ประจำเดือน',
        `ยอด Platform Fee 10% เดือนที่แล้วของคุณคือ ฿${Number(org.fee_amount).toLocaleString()} กรุณาชำระภายในวันที่ 7`,
        'system',
        null
      );
      console.log(`✅ Notified: ${org.name} — ฿${org.fee_amount}`);
    }

    console.log(`📨 Done: ${organizers.length} organizers notified`);
  } catch (err) {
    console.error('Cron fee notify error:', err);
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});