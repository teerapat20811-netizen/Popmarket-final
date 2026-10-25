const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',  // ← ตรงนี้
  database: 'popmarket',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;