/**
 * 네트워크 토폴로지 API 클라이언트
 */

import { buildApiUrl, API_CONFIG } from "@/config/api";
import type {
  NetworkTopologyData,
  CacheStatusInfo,
  SyncProgress,
  RefreshResponse,
  LastUpdatedResponse,
  HealthResponse,
  ApiResponse,
} from "@/types/network-topology";

const createRequestId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const logAuthContext = (requestId: string, token: string | null) => {
  const env = import.meta.env.MODE ?? "unknown";
  console.debug("[NetworkTopologyAuth]", {
    timestamp: new Date().toISOString(),
    requestId,
    env,
    tokenPresent: Boolean(token),
    tokenLength: token?.length ?? 0,
  });
};

const logApiFailure = (requestId: string, endpoint: string, status: number) => {
  const env = import.meta.env.MODE ?? "unknown";
  console.warn("[NetworkTopologyAPI]", {
    timestamp: new Date().toISOString(),
    requestId,
    env,
    endpoint,
    status,
  });
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("access_token");
  const requestId = createRequestId();
  logAuthContext(requestId, token);
  const headers = {
    "Content-Type": "application/json",
    "X-Request-ID": requestId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return { headers, requestId };
};

const parseApiResponse = async <T>(
  response: Response,
  requestId: string,
  endpoint: string,
  fallbackMessage: string,
): Promise<ApiResponse<T>> => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    logApiFailure(requestId, endpoint, response.status);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const message =
      payload?.message ||
      payload?.error ||
      fallbackMessage ||
      `HTTP error! status: ${response.status}`;
    throw new Error(message);
  }

  const data = (payload?.result ??
    payload?.data ??
    payload?.results ??
    payload) as T;

  return {
    success: true,
    data,
    message: payload?.message,
    timestamp: payload?.timestamp ?? new Date().toISOString(),
  };
};

/**
 * 네트워크 토폴로지 데이터를 조회합니다
 */
export async function getNetworkTopology(): Promise<
  ApiResponse<NetworkTopologyData>
> {
  const { headers, requestId } = getAuthHeaders();
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.TOPOLOGY),
    {
      method: "GET",
      headers,
    },
  );

  return parseApiResponse(
    response,
    requestId,
    API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.TOPOLOGY,
    "네트워크 토폴로지 데이터를 불러올 수 없습니다.",
  );
}

/**
 * 캐시 상태를 조회합니다
 */
export async function getCacheStatus(): Promise<ApiResponse<CacheStatusInfo>> {
  const { headers, requestId } = getAuthHeaders();
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.CACHE_STATUS),
    {
      method: "GET",
      headers,
    },
  );

  return parseApiResponse(
    response,
    requestId,
    API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.CACHE_STATUS,
    "캐시 상태를 불러올 수 없습니다.",
  );
}

/**
 * 동기화 진행 상태를 조회합니다
 */
export async function getSyncProgress(): Promise<
  ApiResponse<SyncProgress | null>
> {
  const { headers, requestId } = getAuthHeaders();
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.SYNC_PROGRESS),
    {
      method: "GET",
      headers,
    },
  );

  return parseApiResponse(
    response,
    requestId,
    API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.SYNC_PROGRESS,
    "동기화 진행 상태를 불러올 수 없습니다.",
  );
}

/**
 * 수동으로 데이터를 새로 고침합니다
 */
export async function refreshNetworkTopology(): Promise<
  ApiResponse<RefreshResponse>
> {
  const { headers, requestId } = getAuthHeaders();
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.REFRESH),
    {
      method: "POST",
      headers,
    },
  );

  return parseApiResponse(
    response,
    requestId,
    API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.REFRESH,
    "새로 고침을 시작할 수 없습니다.",
  );
}

/**
 * 마지막 업데이트 시간을 조회합니다
 */
export async function getLastUpdated(): Promise<
  ApiResponse<LastUpdatedResponse>
> {
  const { headers, requestId } = getAuthHeaders();
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.LAST_UPDATED),
    {
      method: "GET",
      headers,
    },
  );

  return parseApiResponse(
    response,
    requestId,
    API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.LAST_UPDATED,
    "마지막 업데이트 시간을 불러올 수 없습니다.",
  );
}

/**
 * 서비스 상태를 조회합니다
 */
export async function getServiceHealth(): Promise<ApiResponse<HealthResponse>> {
  const { headers, requestId } = getAuthHeaders();
  const response = await fetch(
    buildApiUrl(API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.HEALTH),
    {
      method: "GET",
      headers,
    },
  );

  return parseApiResponse(
    response,
    requestId,
    API_CONFIG.ENDPOINTS.NETWORK_TOPOLOGY.HEALTH,
    "서비스 상태를 불러올 수 없습니다.",
  );
}

/**
 * API 오류를 처리하고 사용자 친화적인 메시지를 반환합니다
 */
export function handleApiError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch")) {
      return "서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.";
    }

    if (error.message.includes("401")) {
      return "로그인이 필요합니다.";
    }

    if (error.message.includes("403")) {
      return "이 기능을 사용할 권한이 없습니다.";
    }

    if (error.message.includes("404")) {
      return "요청한 리소스를 찾을 수 없습니다.";
    }

    if (error.message.includes("500")) {
      return "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }

    return error.message;
  }

  return "알 수 없는 오류가 발생했습니다.";
}

/**
 * 재시도 로직이 포함된 API 호출 래퍼
 * 401/403 인증 오류는 재시도하지 않음
 */
export async function withRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      // 401/403 인증 오류는 재시도해도 의미 없음
      if (error instanceof Error) {
        const msg = error.message;
        if (msg.includes("401") || msg.includes("403")) {
          throw error;
        }
      }

      if (attempt === maxRetries) {
        break;
      }

      // 지수 백오프로 재시도 간격 증가
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}
