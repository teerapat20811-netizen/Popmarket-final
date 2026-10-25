const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'ไม่มี token กรุณา login ก่อน' });
  }

  try {
    const decoded = jwt.verify(token, 'popmarket_secret_key_2026');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: 'token ไม่ถูกต้องหรือหมดอายุ' });
  }
};

module.exports = authMiddleware;