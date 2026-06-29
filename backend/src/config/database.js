const sql = require('mssql/msnodesqlv8');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const server = process.env.DB_HOST === 'localhost' ? '(local)' : process.env.DB_HOST || '(local)';
const dbUser = process.env.DB_USER || 'sa';
const dbPassword = process.env.DB_PASSWORD || '';
const dbName = process.env.DB_NAME || 'hoc_app';

const config = {
  connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=${server};Database=${dbName};UID=${dbUser};PWD=${dbPassword};TrustServerCertificate=yes;`,
  pool: {
    max: parseInt(process.env.DB_POOL_SIZE || 10),
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const mssqlPool = new sql.ConnectionPool(config);

class ConnectionWrapper {
  constructor(pool) {
    this.pool = pool;
  }

  async query(sqlQuery, params = []) {
    let translatedQuery = sqlQuery;

    // Translate NOW() to GETDATE()
    translatedQuery = translatedQuery.replace(/\bNOW\b\(\)/gi, 'GETDATE()');

    // Replace ? with @p0, @p1, @p2 etc.
    let paramCount = 0;
    translatedQuery = translatedQuery.replace(/\?/g, () => {
      return `@p${paramCount++}`;
    });

    // Translate LIMIT/OFFSET patterns
    // Translate "LIMIT @pX OFFSET @pY" -> "OFFSET @pY ROWS FETCH NEXT @pX ROWS ONLY"
    translatedQuery = translatedQuery.replace(/LIMIT\s+(@p\d+)\s+OFFSET\s+(@p\d+)/gi, 'OFFSET $2 ROWS FETCH NEXT $1 ROWS ONLY');
    
    // Translate "LIMIT \d+" -> "OFFSET 0 ROWS FETCH NEXT \d+ ROWS ONLY"
    translatedQuery = translatedQuery.replace(/LIMIT\s+(\d+)/gi, 'OFFSET 0 ROWS FETCH NEXT $1 ROWS ONLY');

    // Translate boolean literals
    translatedQuery = translatedQuery.replace(/\bTRUE\b/gi, '1');
    translatedQuery = translatedQuery.replace(/\bFALSE\b/gi, '0');

    // If query starts with INSERT, append identity select to fetch inserted ID
    const isInsert = /^\s*INSERT\s+INTO/i.test(translatedQuery);
    if (isInsert) {
      translatedQuery += '; SELECT SCOPE_IDENTITY() AS insertId;';
    }

    const request = this.pool.request();
    for (let i = 0; i < params.length; i++) {
      if (params[i] === undefined || params[i] === null) {
        request.input(`p${i}`, sql.VarChar, null);
      } else if (Number.isInteger(params[i])) {
        request.input(`p${i}`, sql.Int, params[i]);
      } else if (typeof params[i] === 'number') {
        request.input(`p${i}`, sql.Float, params[i]);
      } else if (typeof params[i] === 'boolean') {
        request.input(`p${i}`, sql.Bit, params[i] ? 1 : 0);
      } else {
        request.input(`p${i}`, sql.VarChar, params[i]);
      }
    }

    const result = await request.query(translatedQuery);

    if (isInsert) {
      const insertId = result.recordset?.[0]?.insertId || null;
      return [{ insertId }];
    } else if (/^\s*(UPDATE|DELETE)\s+/i.test(translatedQuery)) {
      const affectedRows = result.rowsAffected?.[0] || 0;
      return [{ affectedRows }];
    } else {
      // SELECT queries
      return [result.recordset || []];
    }
  }

  release() {
    // Connection release is handled by mssql pool automatically
  }
}

class PoolWrapper {
  constructor(pool) {
    this.pool = pool;
  }

  async getConnection() {
    if (!this.pool.connected) {
      await this.pool.connect();
    }
    return new ConnectionWrapper(this.pool);
  }

  async query(sqlQuery, params = []) {
    const conn = await this.getConnection();
    try {
      return await conn.query(sqlQuery, params);
    } finally {
      conn.release();
    }
  }

  async end() {
    await this.pool.close();
  }
}

const pool = new PoolWrapper(mssqlPool);

// Pre-test the connection pool creation
mssqlPool.connect()
  .then(() => {
    console.log('MSSQL connection pool created successfully');
  })
  .catch(err => {
    console.error('Error creating MSSQL connection pool:', err.message);
  });

module.exports = pool;
