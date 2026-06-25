const LOCAL_API_BASE_URL = 'http://10.116.96.124:5000/api';
const PROD_API_BASE_URL = 'https://your-production-server.com/api';

export const API_BASE_URL = process.env.NODE_ENV === 'production' ? PROD_API_BASE_URL : LOCAL_API_BASE_URL;
