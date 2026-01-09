// API Configuration for external Java backend
// Update this URL to point to your Java backend server

export const API_CONFIG = {
  // Base URL for the Java backend API
  // In development, this might be http://localhost:8080
  // In production, update to your deployed backend URL
  BASE_URL:
    import.meta.env.VITE_API_BASE_URL !== undefined
      ? import.meta.env.VITE_API_BASE_URL
      : "http://localhost:8080",

  // API endpoints (matching backend /api/v1/*)
  ENDPOINTS: {
    // Auth endpoints
    AUTH: {
      LOGIN: "/api/v1/auth/login",
      REGISTER: "/api/v1/auth/register",
      LOGOUT: "/api/v1/auth/logout",
      OKTA_LOGIN: "/oauth2/authorization/okta",
      OKTA_CALLBACK: "/api/v1/auth/oauth2/success",
      ME: "/api/v1/auth/me",
    },
    // AWS Account management endpoints (Admin only)
    AWS_ACCOUNTS: {
      LIST: "/api/v1/aws-accounts",
      GET: "/api/v1/aws-accounts/:id",
      CREATE: "/api/v1/aws-accounts",
      UPDATE: "/api/v1/aws-accounts/:id",
      DELETE: "/api/v1/aws-accounts/:id",
      VERIFY: "/api/v1/aws-accounts/:id/verify",
      VERIFIED: "/api/v1/aws-accounts/verified",
    },
    // AWS Resource endpoints
    AWS_RESOURCES: {
      EC2: "/api/v1/resources/ec2",
      S3: "/api/v1/resources/s3",
      RDS: "/api/v1/resources/rds",
      VPC: "/api/v1/resources/vpc",
    },
    // User management endpoints
    USERS: {
      LIST: "/api/v1/users",
      GET: "/api/v1/users/:id",
      UPDATE_ROLE: "/api/v1/users/:id/role",
      DISABLE: "/api/v1/users/:id/disable",
    },
    // Health check
    HEALTH: "/api/v1/health",
    // SSO Configuration (Admin only, except status)
    SSO: {
      STATUS: "/api/v1/sso/status",
      CONFIGS: "/api/v1/sso/configs",
      CONFIG: "/api/v1/sso/configs/:id",
      ENABLE: "/api/v1/sso/configs/:id/enable",
      DISABLE: "/api/v1/sso/configs/:id/disable",
      TEST: "/api/v1/sso/configs/:id/test",
    },
  },
};

// Helper function to build full API URL
export function buildApiUrl(
  endpoint: string,
  params?: Record<string, string>
): string {
  let url = `${API_CONFIG.BASE_URL}${endpoint}`;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, value);
    });
  }

  return url;
}
