/**
 * Seed script: Ensures admin and sample users have properly bcrypt-hashed passwords.
 * Run once after creating the database schema:
 *   node backend/src/utils/seedUsers.js
 */
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const USERS = [
  { employee_id: 'EMP001', name: 'Admin User', email: 'admin@hocapp.com', phone: '9999999999', password: 'admin123', role: 'Admin' },
  { employee_id: 'EMP002', name: 'Regular User', email: 'user@hocapp.com', phone: '9999999998', password: 'user123', role: 'User' },
];

async function seed() {
  const pool = await new sql.ConnectionPool({
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hoc_app',
    options: { encrypt: true, trustServerCertificate: true },
  }).connect();

  try {
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.request()
        .input('employee_id', sql.VarChar, u.employee_id)
        .input('name',        sql.VarChar, u.name)
        .input('email',       sql.VarChar, u.email)
        .input('phone',       sql.VarChar, u.phone)
        .input('password',    sql.VarChar, hash)
        .input('role',        sql.VarChar, u.role)
        .query(`
          MERGE INTO users AS target
          USING (VALUES (@employee_id, @name, @email, @phone, @password, @role))
                AS source (employee_id, name, email, phone, password, role)
          ON target.employee_id = source.employee_id
          WHEN MATCHED THEN
            UPDATE SET password = source.password
          WHEN NOT MATCHED THEN
            INSERT (employee_id, name, email, phone, password, role)
            VALUES (source.employee_id, source.name, source.email, source.phone, source.password, source.role);
        `);
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
