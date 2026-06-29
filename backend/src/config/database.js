const sql = require('mssql');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const config = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hoc_app',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
  pool: {
    max: parseInt(process.env.DB_POOL_SIZE || '10'),
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise = null;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect();
  }
  return poolPromise;
}

// mysql2-compatible adapter so existing route/controller code requires no API changes.
// Converts positional ? placeholders to mssql named @p1, @p2, ... params.
const pool = {
  getConnection: async () => {
    const sqlPool = await getPool();
    return {
      query: async (queryStr, params = []) => {
        const request = sqlPool.request();
        let i = 0;
        const namedQuery = queryStr.replace(/\?/g, () => {
          i++;
          const val = params[i - 1];
          request.input(`p${i}`, val === undefined ? null : val);
          return `@p${i}`;
        });

        const result = await request.query(namedQuery);

        if (/^\s*SELECT/i.test(queryStr.trim())) {
          return [result.recordset, result];
        }

        // For INSERT with OUTPUT INSERTED, recordset holds the returned row(s).
        const inserted = result.recordset && result.recordset.length > 0
          ? result.recordset[0]
          : null;

        const meta = {
          affectedRows: result.rowsAffected[0] || 0,
          insertId: inserted ? (inserted.id || inserted.job_id || null) : null,
        };
        return [meta, result];
      },
      release: () => {},
    };
  },
};

getPool()
  .then(() => console.log('MSSQL connection pool created successfully'))
  .catch(err => console.error('Error creating connection pool:', err.message));

module.exports = pool;
