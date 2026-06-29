/**
 * Seed script: Ensures admin and sample users have properly bcrypt-hashed passwords.
 * Run once after creating the database schema:
 *   node backend/src/utils/seedUsers.js
 */
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const USERS = [
  { employee_id: 'EMP001', name: 'Admin User', email: 'admin@hocapp.com', phone: '9999999999', password: 'admin123', role: 'Admin' },
  { employee_id: 'EMP002', name: 'Regular User', email: 'user@hocapp.com', phone: '9999999998', password: 'user123', role: 'User' },
];

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hoc_app',
  });

  const connection = await pool.getConnection();
  try {
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      // Upsert: update password if user exists, insert otherwise
      await connection.query(
        `INSERT INTO users (employee_id, name, email, phone, password, role)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE password = VALUES(password)`,
        [u.employee_id, u.name, u.email, u.phone, hash, u.role]
      );
      console.log(`✅ Seeded ${u.employee_id} (${u.role}) with password: ${u.password}`);
    }
    console.log('\n🎉 All users seeded successfully!');
  } finally {
    await pool.close();
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
