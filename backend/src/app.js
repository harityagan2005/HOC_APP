const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env regardless of cwd
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Initialize express app
const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '50mb' })); // Parse JSON
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Parse URL-encoded

// Test database connection
const pool = require('./config/database');
let DB_CONNECTED = false;
pool.getConnection()
  .then(conn => {
    DB_CONNECTED = true;
    console.log('✅ MSSQL Database connected successfully');
    conn.release();
  })
  .catch(err => {
    DB_CONNECTED = false;
    console.error('❌ Database connection failed:', err.message);
    console.error(err);
    console.log('Continuing to run server; database is required for full functionality.');
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/hoc-input', require('./routes/hoc-input'));
app.use('/api/variant-master', require('./routes/variant-master'));
app.use('/api/employee-master', require('./routes/employee-master'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running', db: DB_CONNECTED ? 'connected' : 'disconnected' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop the process using this port or set a different PORT in your backend .env file.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

module.exports = app;
