// Frontend configuration values.
// Change API_BASE_URL for your environment when switching between local and production.

const LOCAL_API_BASE_URL = 'http://192.168.137.1:5001/api';
const PROD_API_BASE_URL = 'https://your-production-server.com/api';

// Use local URL in development and production URL in production bundle.
export const API_BASE_URL = process.env.NODE_ENV === 'production' ? PROD_API_BASE_URL : LOCAL_API_BASE_URL;
