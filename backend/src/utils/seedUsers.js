/**
 * Seed script: Ensures admin and sample users have properly bcrypt-hashed passwords.
 * Run once after creating the database schema:
 *   node backend/src/utils/seedUsers.js
 */
const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const USERS = [
  { employee_id: 'EMP001', name: 'Admin User', email: 'admin@hocapp.com', phone: '9999999999', password: 'admin123', role: 'Admin' },
  { employee_id: 'EMP002', name: 'Regular User', email: 'user@hocapp.com', phone: '9999999998', password: 'user123', role: 'User' },
];

async function seed() {
  const connection = await pool.getConnection();
  try {
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      
      // SQL Server compatible check-then-upsert
      const checkQuery = `SELECT id FROM users WHERE employee_id = ?`;
      const [existing] = await connection.query(checkQuery, [u.employee_id]);
      
      if (existing.length > 0) {
        await connection.query(
          `UPDATE users SET password = ? WHERE employee_id = ?`,
          [hash, u.employee_id]
        );
      } else {
        await connection.query(
          `INSERT INTO users (employee_id, name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)`,
          [u.employee_id, u.name, u.email, u.phone, hash, u.role]
        );
      }
      console.log(`✅ Seeded ${u.employee_id} (${u.role}) with password: ${u.password}`);
    }
    console.log('\n🎉 All users seeded successfully!');
  } finally {
    connection.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
