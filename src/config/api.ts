// API Configuration for external Java backend
// Update this URL to point to your Java backend server

export const API_CONFIG = {
  // Base URL for the Java backend API
  // In development, this might be http://localhost:8080
  // In production, update to your deployed backend URL
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  
  // API endpoints
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: '/api/auth/login',
      LOGOUT: '/api/auth/logout',
      OKTA_CALLBACK: '/api/auth/okta/callback',
      OKTA_LOGIN: '/api/auth/okta/login',
      ME: '/api/auth/me',
      REFRESH: '/api/auth/refresh',
    },
    // AWS Account management endpoints
    AWS_ACCOUNTS: {
      LIST: '/api/aws/accounts',
      CREATE: '/api/aws/accounts',
      DELETE: '/api/aws/accounts/:id',
      VERIFY: '/api/aws/accounts/:id/verify',
      ASSUME_ROLE: '/api/aws/accounts/:id/assume-role',
    },
    // User management endpoints
    USERS: {
      LIST: '/api/users',
      GET: '/api/users/:id',
      UPDATE_ROLE: '/api/users/:id/role',
    },
  },
};

// Helper function to build full API URL
export function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }
  
  return url;
}
