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
    // SSM Terminal endpoints
    SSM: {
      INSTANCES: "/api/v1/ssm/instances",
      CREATE_SESSION: "/api/v1/ssm/session",
      TERMINATE_SESSION: "/api/v1/ssm/session/:sessionId",
      GET_SESSION: "/api/v1/ssm/session/:sessionId",
      MY_SESSIONS: "/api/v1/ssm/sessions",
    },
    // Maintenance endpoints
    MAINTENANCE: {
      SHUTDOWN: "/api/v1/maintenance/shutdown",
    },
    // Tag module endpoints
    TAG_MODULES: {
      LIST: "/api/v1/tag-modules",
      GET: "/api/v1/tag-modules/:id",
      CREATE: "/api/v1/tag-modules",
      UPDATE: "/api/v1/tag-modules/:id",
      DELETE: "/api/v1/tag-modules/:id",
    },
    // Mandatory tag key endpoints
    MANDATORY_TAG_KEYS: {
      LIST: "/api/v1/mandatory-tag-keys",
      ACTIVE: "/api/v1/mandatory-tag-keys/active",
      CREATE: "/api/v1/mandatory-tag-keys",
      UPDATE: "/api/v1/mandatory-tag-keys/:id",
      DELETE: "/api/v1/mandatory-tag-keys/:id",
    },
    // Instance template endpoints
    INSTANCE_TEMPLATES: {
      LIST: "/api/v1/instance-templates",
      GET: "/api/v1/instance-templates/:id",
      CREATE: "/api/v1/instance-templates",
      UPDATE: "/api/v1/instance-templates/:id",
      DELETE: "/api/v1/instance-templates/:id",
    },
    // Provisioning defaults endpoints
    PROVISIONING_DEFAULTS: {
      MODULES: "/api/v1/provisioning-defaults/modules",
      MODULE: "/api/v1/provisioning-defaults/modules/:id",
      TEMPLATE: "/api/v1/provisioning-defaults/templates/:id",
    },
  },
};

// Helper function to build WebSocket URL
export function buildWsUrl(path: string): string {
  const baseUrl = (API_CONFIG.BASE_URL || "").trim();

  // When BASE_URL is empty (same-origin) or relative, fall back to current location
  if (!baseUrl || baseUrl.startsWith("/")) {
    const { protocol, host } = window.location;
    const wsProtocol = protocol === "https:" ? "wss" : "ws";
    return `${wsProtocol}://${host}${path}`;
  }

  const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
  const host = baseUrl.replace(/^https?:\/\//, "");
  return `${wsProtocol}://${host}${path}`;
}

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
