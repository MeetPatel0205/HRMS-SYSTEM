// Environment configuration
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';
export const ENV = process.env.REACT_APP_ENV || 'development';

export const isProduction = ENV === 'production';
export const isDevelopment = ENV === 'development';

// Token keys
export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';

// API timeout
export const API_TIMEOUT = 30000; // 30 seconds

// Pagination
export const ITEMS_PER_PAGE = 10;
export const MAX_ITEMS_PER_PAGE = 100;
